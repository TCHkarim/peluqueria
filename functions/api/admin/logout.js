import { json, clearSessionCookie, requireAdmin, requireSameOrigin } from "../../_shared.js";
export async function onRequestPost(context) {
  const rejected = requireSameOrigin(context.request);
  if (rejected) return rejected;
  const denied = await requireAdmin(context);
  if (denied) return denied;
  return json({ ok: true }, 200, { "Set-Cookie": clearSessionCookie(), "Cache-Control": "no-store" });
}
