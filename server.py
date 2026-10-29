"""Agenda web independiente para Lúmina Estudio.
Solo guarda datos de reservas de peluquería; no usa la base clínica de MEDIDOC.
"""
from __future__ import annotations

import os
import re
import sqlite3
from contextlib import closing
from datetime import date, datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

from dotenv import load_dotenv
from flask import Flask, abort, jsonify, render_template, request, send_file, session
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_wtf.csrf import CSRFProtect, generate_csrf
from werkzeug.security import check_password_hash

ROOT = Path(__file__).resolve().parent
load_dotenv(ROOT / ".env")
DB_PATH = Path(os.environ.get("LUMINA_DATABASE", ROOT / "salon_turnos.sqlite3")).expanduser()
TIMEZONE = ZoneInfo(os.environ.get("LUMINA_TIMEZONE", "America/Argentina/Buenos_Aires"))
SECRET_KEY = os.environ.get("LUMINA_SECRET_KEY") or os.urandom(32).hex()
ADMIN_USER = os.environ.get("LUMINA_ADMIN_USER", "").strip()
ADMIN_PASSWORD_HASH = os.environ.get("LUMINA_ADMIN_PASSWORD_HASH", "").strip()
ALLOWED_ORIGINS = {value.strip().rstrip("/") for value in os.environ.get("LUMINA_ALLOWED_ORIGINS", "").split(",") if value.strip()}

SERVICES = {
    "Corte & brushing": 60,
    "Coloración": 135,
    "Mechas y balayage": 195,
    "Tratamiento capilar": 68,
    "Peinado para evento": 68,
    "Necesito asesoramiento": 30,
}
SLOT_TIMES = [f"{hour:02d}:{minute:02d}" for hour in range(9, 19) for minute in (0, 30)]
ACTIVE_STATUSES = ("Pendiente", "Confirmado")
ALL_STATUSES = ("Pendiente", "Confirmado", "Cancelado", "Realizado")

app = Flask(__name__, template_folder=str(ROOT / "templates"))
app.config.update(
    SECRET_KEY=SECRET_KEY,
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_SECURE=os.environ.get("LUMINA_COOKIE_SECURE", "0") == "1",
    PERMANENT_SESSION_LIFETIME=timedelta(hours=8),
    MAX_CONTENT_LENGTH=32 * 1024,
)
csrf = CSRFProtect(app)
limiter = Limiter(get_remote_address, app=app, default_limits=[], storage_uri=os.environ.get("LUMINA_LIMITER_STORAGE", "memory://"))


def connect_db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DB_PATH, timeout=10, isolation_level=None)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def init_db():
    with closing(connect_db()) as db:
        db.execute("PRAGMA journal_mode = WAL")
        db.execute("""
            CREATE TABLE IF NOT EXISTS appointments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_name TEXT NOT NULL,
                phone TEXT NOT NULL,
                service TEXT NOT NULL,
                duration_minutes INTEGER NOT NULL,
                appointment_date TEXT NOT NULL,
                start_time TEXT NOT NULL,
                notes TEXT NOT NULL DEFAULT '',
                status TEXT NOT NULL DEFAULT 'Pendiente'
                    CHECK (status IN ('Pendiente','Confirmado','Cancelado','Realizado')),
                created_at TEXT NOT NULL
            )
        """)
        db.execute("CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date, start_time)")



init_db()

def now_local():
    return datetime.now(TIMEZONE)


def is_admin():
    return session.get("lumina_admin") is True


def appointment_dict(row):
    return {
        "id": row["id"], "name": row["customer_name"], "phone": row["phone"],
        "service": row["service"], "duration": row["duration_minutes"],
        "date": row["appointment_date"], "time": row["start_time"],
        "notes": row["notes"], "status": row["status"], "createdAt": row["created_at"],
    }


def parse_request_date(value):
    try:
        parsed = date.fromisoformat(value or "")
    except (TypeError, ValueError):
        return None
    today = now_local().date()
    if parsed < today or parsed > today + timedelta(days=180):
        return None
    return parsed


def start_minutes(value):
    hour, minute = map(int, value.split(":"))
    return hour * 60 + minute


def slot_is_free(db, requested_time, requested_duration, appointment_date, exclude_id=None):
    rows = db.execute(
        "SELECT id, start_time, duration_minutes FROM appointments "
        "WHERE appointment_date = ? AND status IN ('Pendiente','Confirmado')",
        (appointment_date,),
    ).fetchall()
    requested_start = start_minutes(requested_time)
    requested_end = requested_start + requested_duration
    for row in rows:
        if exclude_id is not None and row["id"] == exclude_id:
            continue
        existing_start = start_minutes(row["start_time"])
        existing_end = existing_start + row["duration_minutes"]
        if requested_start < existing_end and existing_start < requested_end:
            return False
    return True


@app.before_request
def check_origin():
    if not request.path.startswith("/api/"):
        return None
    origin = request.headers.get("Origin")
    if not origin:
        return None
    origin = origin.rstrip("/")
    same_origin = request.host_url.rstrip("/")
    if origin != same_origin and origin not in ALLOWED_ORIGINS:
        return jsonify(error="Origen no autorizado."), 403
    return None


@app.after_request
def add_public_cors(response):
    origin = request.headers.get("Origin", "").rstrip("/")
    if request.path in ("/api/availability", "/api/bookings") and origin and origin in ALLOWED_ORIGINS:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type"
        response.headers["Vary"] = "Origin"
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault("X-Frame-Options", "DENY")
    return response


@app.get("/")
def home():
    return send_file(ROOT / "index.html")


@app.get("/admin")
def admin_page():
    return render_template("admin.html", csrf_token=generate_csrf())


@app.route("/api/availability", methods=["GET", "OPTIONS"])
@limiter.limit("60 per minute")
def availability():
    if request.method == "OPTIONS":
        return "", 204
    parsed_date = parse_request_date(request.args.get("date"))
    service = request.args.get("service", "")
    if not parsed_date or service not in SERVICES:
        return jsonify(error="Elegí una fecha futura y un servicio válido.", times=[]), 400
    date_key = parsed_date.isoformat()
    duration = SERVICES[service]
    today = now_local()
    options = []
    with closing(connect_db()) as db:
        for time_value in SLOT_TIMES:
            if parsed_date == today.date() and start_minutes(time_value) <= today.hour * 60 + today.minute:
                continue
            if slot_is_free(db, time_value, duration, date_key):
                options.append(time_value)
    return jsonify(date=date_key, service=service, duration=duration, times=options)


@app.route("/api/bookings", methods=["POST", "OPTIONS"])
@csrf.exempt
@limiter.limit("10 per hour")
def create_booking():
    if request.method == "OPTIONS":
        return "", 204
    if not request.is_json:
        return jsonify(error="Formato de solicitud inválido."), 415
    payload = request.get_json(silent=True) or {}
    name = re.sub(r"\s+", " ", str(payload.get("name", ""))).strip()
    phone_input = str(payload.get("phone", "")).strip()
    phone = ("+" if phone_input.startswith("+") else "") + re.sub(r"\D", "", phone_input)
    service = str(payload.get("service", "")).strip()
    time_value = str(payload.get("time", "")).strip()
    notes = re.sub(r"\s+", " ", str(payload.get("notes", ""))).strip()
    parsed_date = parse_request_date(payload.get("date"))
    if not name or len(name) > 70 or not re.fullmatch(r"[\w .,'áéíóúüñÁÉÍÓÚÜÑ-]{2,70}", name):
        return jsonify(error="Revisá el nombre ingresado."), 400
    if not re.fullmatch(r"\+?[0-9]{8,18}", phone):
        return jsonify(error="Ingresá un número de WhatsApp válido con código de área."), 400
    if service not in SERVICES or not parsed_date or time_value not in SLOT_TIMES or len(notes) > 500:
        return jsonify(error="Revisá los datos del turno e intentá de nuevo."), 400
    date_key = parsed_date.isoformat()
    if parsed_date == now_local().date() and start_minutes(time_value) <= now_local().hour * 60 + now_local().minute:
        return jsonify(error="Ese horario ya pasó. Elegí otro."), 409
    duration = SERVICES[service]
    db = connect_db()
    try:
        db.execute("BEGIN IMMEDIATE")
        if not slot_is_free(db, time_value, duration, date_key):
            db.rollback()
            return jsonify(error="Ese horario acaba de ocuparse. Elegí otro horario disponible."), 409
        created_at = now_local().isoformat(timespec="seconds")
        cursor = db.execute(
            "INSERT INTO appointments "
            "(customer_name, phone, service, duration_minutes, appointment_date, start_time, notes, status, created_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, 'Pendiente', ?)",
            (name, phone, service, duration, date_key, time_value, notes, created_at),
        )
        appointment_id = cursor.lastrowid
        db.commit()
    except sqlite3.Error:
        db.rollback()
        app.logger.exception("No se pudo guardar la solicitud de turno")
        return jsonify(error="No pudimos guardar el turno ahora. Probá de nuevo o escribinos por WhatsApp."), 503
    finally:
        db.close()
    return jsonify(id=appointment_id, status="Pendiente", message="Recibimos tu solicitud. El turno todavía debe ser confirmado por el salón."), 201


@app.get("/api/admin/me")
def admin_me():
    return (jsonify(authenticated=True), 200) if is_admin() else (jsonify(error="Iniciá sesión para continuar."), 401)


@app.post("/api/admin/login")
@limiter.limit("5 per minute")
def admin_login():
    if not request.is_json:
        return jsonify(error="Solicitud inválida."), 415
    payload = request.get_json(silent=True) or {}
    username = str(payload.get("username", ""))
    password = str(payload.get("password", ""))
    if not ADMIN_USER or not ADMIN_PASSWORD_HASH:
        return jsonify(error="Falta configurar el acceso del administrador en el servidor."), 503
    if username != ADMIN_USER or not check_password_hash(ADMIN_PASSWORD_HASH, password):
        return jsonify(error="Usuario o contraseña incorrectos."), 401
    session.clear()
    session["lumina_admin"] = True
    session.permanent = True
    return jsonify(authenticated=True)


@app.post("/api/admin/logout")
def admin_logout():
    if not is_admin():
        return jsonify(error="Sesión vencida."), 401
    session.clear()
    return jsonify(ok=True)


@app.get("/api/admin/bookings")
def admin_bookings():
    if not is_admin():
        return jsonify(error="Iniciá sesión para continuar."), 401
    date_filter = request.args.get("date", "")
    status_filter = request.args.get("status", "Todos")
    if date_filter and not re.fullmatch(r"\d{4}-\d{2}-\d{2}", date_filter):
        return jsonify(error="Fecha inválida."), 400
    if status_filter != "Todos" and status_filter not in ALL_STATUSES:
        return jsonify(error="Estado inválido."), 400
    where, params = [], []
    if date_filter:
        where.append("appointment_date = ?")
        params.append(date_filter)
    if status_filter != "Todos":
        where.append("status = ?")
        params.append(status_filter)
    sql = "SELECT * FROM appointments" + (" WHERE " + " AND ".join(where) if where else "") + " ORDER BY appointment_date, start_time, id"
    with closing(connect_db()) as db:
        rows = db.execute(sql, params).fetchall()
    return jsonify(bookings=[appointment_dict(row) for row in rows])


@app.patch("/api/admin/bookings/<int:booking_id>")
def update_booking(booking_id):
    if not is_admin():
        return jsonify(error="Iniciá sesión para continuar."), 401
    payload = request.get_json(silent=True) or {}
    status = str(payload.get("status", ""))
    if status not in ALL_STATUSES:
        return jsonify(error="Estado inválido."), 400
    with closing(connect_db()) as db:
        cursor = db.execute("UPDATE appointments SET status = ? WHERE id = ?", (status, booking_id))
    if cursor.rowcount == 0:
        return jsonify(error="No encontramos ese turno."), 404
    return jsonify(ok=True, status=status)


@app.delete("/api/admin/bookings/<int:booking_id>")
def delete_booking(booking_id):
    if not is_admin():
        return jsonify(error="Iniciá sesión para continuar."), 401
    with closing(connect_db()) as db:
        cursor = db.execute("DELETE FROM appointments WHERE id = ?", (booking_id,))
    if cursor.rowcount == 0:
        return jsonify(error="No encontramos ese turno."), 404
    return jsonify(ok=True)


@app.get("/<path:asset>")
def static_asset(asset):
    if asset in {"styles.css", "app.js", "config.js", "admin.css", "admin.js"}:
        return send_file(ROOT / asset)
    abort(404)


if __name__ == "__main__":
    init_db()
    app.run(host=os.environ.get("LUMINA_HOST", "127.0.0.1"), port=int(os.environ.get("LUMINA_PORT", "5000")), debug=False)

