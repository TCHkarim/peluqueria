import { json, isAdmin } from "../../_shared.js";
export async function onRequestGet({ request, env }) {
  return isAdmin(request, env.LUMINA_SECRET_KEY) ? json({ authenticated: true }, 200, { "Cache-Control": "no-store" }) : json({ error: "Iniciá sesión para continuar." }, 401, { "Cache-Control": "no-store" });
}

