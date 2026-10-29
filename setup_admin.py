"""Crea la configuración local del administrador sin guardar la contraseña en texto plano."""
from getpass import getpass
from pathlib import Path
import secrets
import sys

from werkzeug.security import generate_password_hash

root = Path(__file__).resolve().parent
env_path = root / ".env"
if env_path.exists():
    print("Ya existe .env; no lo voy a sobrescribir.")
    sys.exit(1)

username = input("Usuario administrador: ").strip()
if not username or len(username) > 80 or "=" in username:
    print("Ingresá un usuario válido.")
    sys.exit(1)
password = getpass("Contraseña (mínimo 12 caracteres): ")
confirmation = getpass("Repetí la contraseña: ")
if len(password) < 12 or password != confirmation:
    print("Las contraseñas deben coincidir y tener al menos 12 caracteres.")
    sys.exit(1)

password_hash = generate_password_hash(password)
contents = "\n".join([
    f"LUMINA_SECRET_KEY={secrets.token_urlsafe(48)}",
    f"LUMINA_ADMIN_USER={username}",
    f"LUMINA_ADMIN_PASSWORD_HASH={password_hash}",
    "LUMINA_DATABASE=salon_turnos.sqlite3",
    "LUMINA_TIMEZONE=America/Argentina/Buenos_Aires",
    "LUMINA_COOKIE_SECURE=0",
    "LUMINA_ALLOWED_ORIGINS=",
    "LUMINA_LIMITER_STORAGE=memory://",
    "",
])
env_path.write_text(contents, encoding="utf-8")
print(f"Configuración creada en {env_path.name}. No compartas ni subas este archivo.")