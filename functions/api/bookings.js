import { SERVICES, json, parseDate, todayBuenosAires, minutes, validName, cleanPhone, requireSameOrigin } from "../_shared.js";

export async function onRequestPost({ request, env }) {
  const rejected = requireSameOrigin(request);
  if (rejected) return rejected;
  if (!request.headers.get("content-type")?.includes("application/json")) return json({ error: "Formato de solicitud inválido." }, 415);
  let body;
  try { body = await request.json(); } catch { return json({ error: "Solicitud inválida." }, 400); }
  const name = typeof body.name === "string" ? body.name.trim().replace(/\s+/g, " ") : "";
  const phone = cleanPhone(body.phone);
  const service = typeof body.service === "string" ? body.service.trim() : "";
  const date = parseDate(body.date);
  const time = typeof body.time === "string" ? body.time.trim() : "";
  const notes = typeof body.notes === "string" ? body.notes.trim().replace(/\s+/g, " ") : "";
  if (!validName(name)) return json({ error: "Revisá el nombre ingresado." }, 400);
  if (!phone) return json({ error: "Ingresá un número de WhatsApp válido con código de área." }, 400);
  if (!Object.hasOwn(SERVICES, service) || !date || !/^\d{2}:\d{2}$/.test(time) || minutes(time) < 540 || minutes(time) > 1110 || notes.length > 500) return json({ error: "Revisá los datos del turno e intentá de nuevo." }, 400);
  const duration = SERVICES[service];
  const start = minutes(time);
  if (start + duration > 1140) return json({ error: "Ese servicio no entra en el horario seleccionado." }, 400);
  const now = new Date();
  const currentTime = new Intl.DateTimeFormat("en-GB", { timeZone: "America/Argentina/Buenos_Aires", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(now);
  if (date === todayBuenosAires() && start <= minutes(currentTime)) return json({ error: "Ese horario ya pasó. Elegí otro." }, 409);
  const createdAt = new Date().toISOString();
  const result = await env.DB.prepare(`
    INSERT INTO appointments (customer_name, phone, service, duration_minutes, appointment_date, start_time, notes, status, created_at)
    SELECT ?, ?, ?, ?, ?, ?, ?, 'Pendiente', ?
    WHERE NOT EXISTS (
      SELECT 1 FROM appointments
      WHERE appointment_date = ? AND status IN ('Pendiente','Confirmado')
      AND ? < (CAST(substr(start_time,1,2) AS INTEGER) * 60 + CAST(substr(start_time,4,2) AS INTEGER) + duration_minutes)
      AND (CAST(substr(start_time,1,2) AS INTEGER) * 60 + CAST(substr(start_time,4,2) AS INTEGER)) < ?
    )
  `).bind(name, phone, service, duration, date, time, notes, createdAt, date, start, start + duration).run();
  if (!result.meta?.changes) return json({ error: "Ese horario acaba de ocuparse. Elegí otro horario disponible." }, 409);
  return json({ id: result.meta.last_row_id, status: "Pendiente", message: "Recibimos tu solicitud. El turno todavía debe ser confirmado por el salón." }, 201);
}
