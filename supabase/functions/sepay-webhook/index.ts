import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
const webhookSecret = Deno.env.get("SEPAY_WEBHOOK_SECRET") ?? "";
const promoStart = new Date("2026-07-31T17:00:00.000Z");
const promoEnd = new Date("2026-08-30T16:59:59.999Z");

function addMonths(date: Date, months: number) {
  const result = new Date(date);
  result.setUTCMonth(result.getUTCMonth() + months);
  return result;
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (webhookSecret && request.headers.get("x-sepay-secret") !== webhookSecret) return json({ error: "Unauthorized" }, 401);
  const payload = await request.json().catch(() => null);
  const referenceCode = payload?.referenceCode ?? payload?.content ?? payload?.description;
  const amount = Number(payload?.amount ?? payload?.transferAmount ?? 0);
  if (!referenceCode || amount <= 0) return json({ error: "Invalid webhook payload" }, 400);

  const { data: order } = await supabase
    .from("payment_orders")
    .select("*")
    .eq("reference_code", referenceCode)
    .eq("provider", "sepay")
    .eq("status", "pending")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!order) return json({ error: "Payment order not found" }, 404);
  if (Number(order.amount_vnd) > amount) return json({ error: "Insufficient amount" }, 400);

  const now = new Date();
  const { data: existingEntitlement } = await supabase.from("entitlements").select("valid_until").eq("user_id", order.user_id).maybeSingle();
  const existingEnd = existingEntitlement?.valid_until ? new Date(existingEntitlement.valid_until) : null;
  const extensionBase = existingEnd && existingEnd > now ? existingEnd : now;
  const promoEligible = order.plan === "monthly" && now >= promoStart && now <= promoEnd;
  const durationMonths = order.plan === "yearly" ? 12 : promoEligible ? 2 : 1;
  const validUntil = addMonths(extensionBase, durationMonths).toISOString();
  const nowIso = now.toISOString();

  await supabase.from("payment_orders").update({ status: "paid", updated_at: nowIso }).eq("id", order.id);
  await supabase.from("entitlements").upsert({ user_id: order.user_id, plan: order.plan, is_premium: order.plan !== "basic", source: promoEligible ? "sepay_august_bonus" : "sepay", valid_until: validUntil, updated_at: nowIso });
  await supabase.from("subscription_status").upsert({ user_id: order.user_id, plan: order.plan, is_active: true, updated_at: nowIso });
  await supabase.from("profiles").update({ is_premium: order.plan !== "basic", updated_at: nowIso }).eq("id", order.user_id);
  await supabase.from("audit_logs").insert({ user_id: order.user_id, actor_user_id: order.user_id, action: promoEligible ? "sepay_webhook_paid_august_bonus" : "sepay_webhook_paid", metadata: `${referenceCode}|months=${durationMonths}` });
  return json({ ok: true, referenceCode, promoEligible, durationMonths, validUntil });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
