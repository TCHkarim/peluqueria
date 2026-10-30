import { json, adminCookie, requireSameOrigin, sessionCookie } from "../../_shared.js";

export async function onRequestPost({ request, env }) {
  const rejected = requireSameOrigin(request);
  if (rejected) return rejected;
  if (!env.LUMINA_ADMIN_USER || !env.LUMINA_ADMIN_PASSWORD || !env.LUMINA_SECRET_KEY) return json({ error: "Falta configurar el acceso del administrador." }, 503);
  let body;
  try { body = await request.json(); } catch { return json({ error: "Solicitud inválida." }, 400); }
  const user = typeof body.username === "string" ? body.username : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (user !== env.LUMINA_ADMIN_USER || password !== env.LUMINA_ADMIN_PASSWORD) return json({ error: "Usuario o contraseña incorrectos." }, 401);
  const token = await adminCookie(env.LUMINA_SECRET_KEY);
  return json({ authenticated: true }, 200, { "Set-Cookie": sessionCookie(token), "Cache-Control": "no-store" });
}
