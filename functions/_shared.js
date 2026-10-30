export const SERVICES = {
  "Corte & brushing": 60,
  "Coloración": 135,
  "Mechas y balayage": 195,
  "Tratamiento capilar": 68,
  "Peinado para evento": 68,
  "Necesito asesoramiento": 30,
};

export const json = (data, status = 200, headers = {}) => Response.json(data, { status, headers });
export const todayBuenosAires = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
export const parseDate = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== value) return null;
  const today = todayBuenosAires();
  const max = new Date(`${today}T12:00:00Z`);
  max.setUTCDate(max.getUTCDate() + 180);
  return value >= today && value <= max.toISOString().slice(0, 10) ? value : null;
};
export const minutes = (time) => {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
};
export const isSameOrigin = (request) => request.headers.get("Origin") === new URL(request.url).origin;
export const requireSameOrigin = (request) => {
  if (!isSameOrigin(request)) return json({ error: "Origen no autorizado." }, 403);
  return null;
};

const encoder = new TextEncoder();
const base64url = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
async function hmac(value, secret) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return base64url(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
}
export async function adminCookie(secret) {
  const expiry = Math.floor(Date.now() / 1000) + 8 * 60 * 60;
  const payload = String(expiry);
  return `${payload}.${await hmac(payload, secret)}`;
}
export async function isAdmin(request, secret) {
  if (!secret) return false;
  const raw = request.headers.get("Cookie") || "";
  const value = raw.split(";").map((part) => part.trim()).find((part) => part.startsWith("lumina_admin="))?.slice("lumina_admin=".length);
  if (!value) return false;
  const [expiry, signature, extra] = value.split(".");
  if (!expiry || !signature || extra || !/^\d+$/.test(expiry) || Number(expiry) < Math.floor(Date.now() / 1000)) return false;
  return signature === await hmac(expiry, secret);
}
export const sessionCookie = (value) => `lumina_admin=${value}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=28800`;
export const clearSessionCookie = () => "lumina_admin=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0";
export async function requireAdmin(context) {
  if (!(await isAdmin(context.request, context.env.LUMINA_SECRET_KEY))) return json({ error: "Iniciá sesión para continuar." }, 401);
  return null;
}
export function validName(value) {
  return typeof value === "string" && value.trim().length >= 2 && value.trim().length <= 70 && /^[\p{L}\p{M} .,'-]+$/u.test(value.trim());
}
export function cleanPhone(value) {
  if (typeof value !== "string") return "";
  const cleaned = (value.trim().startsWith("+") ? "+" : "") + value.replace(/\D/g, "");
  return /^\+?\d{8,18}$/.test(cleaned) ? cleaned : "";
}
