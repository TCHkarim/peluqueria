import { SERVICES, json, parseDate, todayBuenosAires, minutes } from "../_shared.js";

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const date = parseDate(url.searchParams.get("date"));
  const service = url.searchParams.get("service") || "";
  if (!date || !Object.hasOwn(SERVICES, service)) return json({ error: "Elegí una fecha futura y un servicio válido.", times: [] }, 400);
  const rows = await env.DB.prepare("SELECT start_time, duration_minutes FROM appointments WHERE appointment_date = ? AND status IN ('Pendiente','Confirmado')").bind(date).all();
  const booked = rows.results || [];
  const duration = SERVICES[service];
  const now = new Date();
  const localNow = new Intl.DateTimeFormat("en-GB", { timeZone: "America/Argentina/Buenos_Aires", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(now);
  const currentMinutes = minutes(localNow);
  const times = [];
  for (let hour = 9; hour < 19; hour++) for (const minute of [0, 30]) {
    const time = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    const start = minutes(time), end = start + duration;
    if (end > 19 * 60 || (date === todayBuenosAires() && start <= currentMinutes)) continue;
    const overlaps = booked.some((item) => {
      const existingStart = minutes(item.start_time);
      return start < existingStart + item.duration_minutes && existingStart < end;
    });
    if (!overlaps) times.push(time);
  }
  return json({ date, service, duration, times });
}
