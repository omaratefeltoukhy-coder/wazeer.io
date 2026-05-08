import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createHmac, timingSafeEqual } from "crypto";

// Provider-agnostic billing webhook stub. In live mode set BILLING_WEBHOOK_SECRET
// and adapt parsing for the chosen provider (Stripe/Paddle).
export const Route = createFileRoute("/api/public/billing-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.text();
        const secret = process.env.BILLING_WEBHOOK_SECRET;

        // Fail closed: refuse all traffic if the signing secret isn't configured.
        // The previous behavior accepted unsigned requests when BILLING_WEBHOOK_SECRET
        // was unset, which lets anyone forge billing events in production.
        if (!secret) {
          console.error("[billing-webhook] BILLING_WEBHOOK_SECRET not set — rejecting request");
          return new Response("Webhook signing secret not configured", { status: 503 });
        }

        const sig = request.headers.get("x-billing-signature") ?? "";
        if (!sig) {
          return new Response("Missing signature", { status: 401 });
        }
        const expected = createHmac("sha256", secret).update(body).digest("hex");
        let signatureValid = false;
        try {
          const sigBuf = Buffer.from(sig, "utf8");
          const expBuf = Buffer.from(expected, "utf8");
          // timingSafeEqual requires equal-length buffers. Bail early on length mismatch.
          if (sigBuf.length === expBuf.length) {
            signatureValid = timingSafeEqual(sigBuf, expBuf);
          }
        } catch {
          signatureValid = false;
        }
        if (!signatureValid) {
          return new Response("Invalid signature", { status: 401 });
        }
        let payload: Record<string, unknown> = {};
        try { payload = JSON.parse(body); } catch { /* tolerate empty body */ }

        await supabaseAdmin.from("billing_events").insert({
          workspace_id: (payload.workspace_id as string | undefined) ?? null,
          provider: (payload.provider as string | undefined) ?? "mock",
          event_type: (payload.type as string | undefined) ?? "unknown",
          external_event_id: (payload.id as string | undefined) ?? null,
          payload_json: payload as never,
          processed_at: new Date().toISOString(),
        });
        return Response.json({ received: true });
      },
    },
  },
});
