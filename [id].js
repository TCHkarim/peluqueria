import { json, requireAdmin, requireSameOrigin } from "../../../../_shared.js";
const STATUSES = ["Pendiente", "Confirmado", "Cancelado", "Realizado"];
export async function onRequestPatch(context) {
  const rejected = requireSameOrigin(context.request);
  if (rejected) return rejected;
  const denied = await requireAdmin(context);
  if (denied) return denied;
  const id = Number(context.params.id);
  let body;
  try { body = await context.request.json(); } catch { return json({ error: "Solicitud inválida." }, 400); }
  if (!Number.isSafeInteger(id) || id < 1 || !STATUSES.includes(body.status)) return json({ error: "Estado o turno inválido." }, 400);
  const result = await context.env.DB.prepare("UPDATE appointments SET status = ? WHERE id = ?").bind(body.status, id).run();
  if (!result.meta?.changes) return json({ error: "No encontramos ese turno." }, 404);
  return json({ ok: true, status: body.status });
}
export async function onRequestDelete(context) {
  const rejected = requireSameOrigin(context.request);
  if (rejected) return rejected;
  const denied = await requireAdmin(context);
  if (denied) return denied;
  const id = Number(context.params.id);
  if (!Number.isSafeInteger(id) || id < 1) return json({ error: "Turno inválido." }, 400);
  const result = await context.env.DB.prepare("DELETE FROM appointments WHERE id = ?").bind(id).run();
  if (!result.meta?.changes) return json({ error: "No encontramos ese turno." }, 404);
  return json({ ok: true });
}
