-- 1) Webhook idempotency
CREATE UNIQUE INDEX IF NOT EXISTS billing_events_external_event_id_key
  ON public.billing_events (external_event_id)
  WHERE external_event_id IS NOT NULL;

-- 2) Lock down encryption helpers
REVOKE EXECUTE ON FUNCTION public.encrypt_meta_token(text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.decrypt_meta_token(bytea, text) FROM PUBLIC, anon, authenticated;

-- 3) Tighten audit_logs: drop the user INSERT policy. Server uses supabaseAdmin (bypasses RLS) so this only affects user-direct inserts.
DROP POLICY IF EXISTS "members insert audit logs" ON public.audit_logs;

-- 4) Remove public LIST on product-covers bucket. Direct file access via the CDN still works because the bucket is public; this only prevents enumerating the bucket via the objects API.
DROP POLICY IF EXISTS "Public can view product covers" ON storage.objects;