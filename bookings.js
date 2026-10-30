import { json, requireAdmin } from "../../_shared.js";
const STATUSES = ["Pendiente", "Confirmado", "Cancelado", "Realizado"];
export async function onRequestGet(context) {
  const denied = await requireAdmin(context);
  if (denied) return denied;
  const url = new URL(context.request.url);
  const date = url.searchParams.get("date") || "";
  const status = url.searchParams.get("status") || "Todos";
  if ((date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) || (status !== "Todos" && !STATUSES.includes(status))) return json({ error: "Filtro inválido." }, 400);
  let query = "SELECT * FROM appointments", params = [];
  const clauses = [];
  if (date) { clauses.push("appointment_date = ?"); params.push(date); }
  if (status !== "Todos") { clauses.push("status = ?"); params.push(status); }
  if (clauses.length) query += " WHERE " + clauses.join(" AND ");
  query += " ORDER BY appointment_date, start_time, id";
  const result = await context.env.DB.prepare(query).bind(...params).all();
  const bookings = (result.results || []).map((row) => ({ id: row.id, name: row.customer_name, phone: row.phone, service: row.service, duration: row.duration_minutes, date: row.appointment_date, time: row.start_time, notes: row.notes, status: row.status, createdAt: row.created_at }));
  return json({ bookings }, 200, { "Cache-Control": "no-store" });
}

