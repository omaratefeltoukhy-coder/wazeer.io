-- =============================================================================
-- Comprehensive audit hardening migration
-- Fixes from security + schema + performance audit (2026-05-09)
-- All changes are idempotent (IF EXISTS / IF NOT EXISTS)
-- =============================================================================

-- =============================================================================
-- 1) Missing Foreign Key constraints (migrations 14-28 omitted these)
-- =============================================================================

ALTER TABLE public.credit_grants
  ADD CONSTRAINT IF NOT EXISTS fk_credit_grants_workspace
  FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;

ALTER TABLE public.usage_counters
  ADD CONSTRAINT IF NOT EXISTS fk_usage_counters_workspace
  FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;

ALTER TABLE public.audit_logs
  ADD CONSTRAINT IF NOT EXISTS fk_audit_logs_workspace
  FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;

ALTER TABLE public.email_messages
  ADD CONSTRAINT IF NOT EXISTS fk_email_messages_business
  FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;

ALTER TABLE public.email_messages
  ADD CONSTRAINT IF NOT EXISTS fk_email_messages_campaign
  FOREIGN KEY (campaign_id) REFERENCES public.email_campaigns(id) ON DELETE SET NULL;

ALTER TABLE public.suppression_list
  ADD CONSTRAINT IF NOT EXISTS fk_suppression_list_business
  FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;

ALTER TABLE public.email_unsubscribe_tokens
  ADD CONSTRAINT IF NOT EXISTS fk_unsub_tokens_business
  FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;

ALTER TABLE public.email_unsubscribe_tokens
  ADD CONSTRAINT IF NOT EXISTS fk_unsub_tokens_contact
  FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE SET NULL;

ALTER TABLE public.billing_events
  ADD CONSTRAINT IF NOT EXISTS fk_billing_events_workspace
  FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;

ALTER TABLE public.invoices
  ADD CONSTRAINT IF NOT EXISTS fk_invoices_workspace
  FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;

ALTER TABLE public.transactions
  ADD CONSTRAINT IF NOT EXISTS fk_transactions_workspace
  FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;

ALTER TABLE public.transactions
  ADD CONSTRAINT IF NOT EXISTS fk_transactions_product
  FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;

ALTER TABLE public.payouts
  ADD CONSTRAINT IF NOT EXISTS fk_payouts_workspace
  FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;

ALTER TABLE public.payout_methods
  ADD CONSTRAINT IF NOT EXISTS fk_payout_methods_workspace
  FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;

ALTER TABLE public.ai_content
  ADD CONSTRAINT IF NOT EXISTS fk_ai_content_workspace
  FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;

ALTER TABLE public.ai_content
  ADD CONSTRAINT IF NOT EXISTS fk_ai_content_business
  FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE SET NULL;

ALTER TABLE public.ai_content
  ADD CONSTRAINT IF NOT EXISTS fk_ai_content_product
  FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;

ALTER TABLE public.ad_campaigns
  ADD CONSTRAINT IF NOT EXISTS fk_ad_campaigns_workspace
  FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;

ALTER TABLE public.ad_campaigns
  ADD CONSTRAINT IF NOT EXISTS fk_ad_campaigns_business
  FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE SET NULL;

ALTER TABLE public.ad_campaigns
  ADD CONSTRAINT IF NOT EXISTS fk_ad_campaigns_product
  FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;

ALTER TABLE public.ad_analytics
  ADD CONSTRAINT IF NOT EXISTS fk_ad_analytics_workspace
  FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;

ALTER TABLE public.pixel_integrations
  ADD CONSTRAINT IF NOT EXISTS fk_pixel_integrations_workspace
  FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;

ALTER TABLE public.payment_links
  ADD CONSTRAINT IF NOT EXISTS fk_payment_links_workspace
  FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;

ALTER TABLE public.payment_links
  ADD CONSTRAINT IF NOT EXISTS fk_payment_links_product
  FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;

ALTER TABLE public.ugc_videos
  ADD CONSTRAINT IF NOT EXISTS fk_ugc_videos_script
  FOREIGN KEY (script_id) REFERENCES public.ugc_scripts(id) ON DELETE SET NULL;

-- =============================================================================
-- 2) Missing indexes for hot query paths
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_contacts_business ON public.contacts (business_id);
CREATE INDEX IF NOT EXISTS idx_contacts_business_created ON public.contacts (business_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_events_business_created ON public.email_events (business_id, created_at);
CREATE INDEX IF NOT EXISTS idx_email_events_contact_type ON public.email_events (contact_id, event_type);
CREATE INDEX IF NOT EXISTS idx_email_events_contact_type_created ON public.email_events (contact_id, event_type, created_at);

CREATE INDEX IF NOT EXISTS idx_meta_campaigns_business ON public.meta_campaigns (business_id);
CREATE INDEX IF NOT EXISTS idx_meta_ads_business ON public.meta_ads (business_id);
CREATE INDEX IF NOT EXISTS idx_meta_posts_business_created ON public.meta_posts (business_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_brand_profiles_business ON public.brand_profiles (business_id);
CREATE INDEX IF NOT EXISTS idx_business_inputs_business ON public.business_inputs (business_id);
CREATE INDEX IF NOT EXISTS idx_performance_snapshots_business_period ON public.performance_snapshots (business_id, period_start DESC);

CREATE INDEX IF NOT EXISTS idx_orders_business_customer_created ON public.orders (business_id, customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_workspace_created ON public.credit_transactions (workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_subscriptions_workspace ON public.subscriptions (workspace_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON public.subscriptions (user_id);

CREATE INDEX IF NOT EXISTS idx_payout_methods_workspace ON public.payout_methods (workspace_id);
CREATE INDEX IF NOT EXISTS idx_payouts_workspace ON public.payouts (workspace_id);
CREATE INDEX IF NOT EXISTS idx_pixel_integrations_workspace ON public.pixel_integrations (workspace_id);
CREATE INDEX IF NOT EXISTS idx_payment_links_workspace ON public.payment_links (workspace_id);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_workspace ON public.ad_campaigns (workspace_id);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_business ON public.ad_campaigns (business_id);
CREATE INDEX IF NOT EXISTS idx_media_assets_business_type ON public.media_assets (business_id, type);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_business_status ON public.ai_recommendations (business_id, status);
CREATE INDEX IF NOT EXISTS idx_email_automations_business ON public.email_automations (business_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_campaign_status_pos ON public.email_messages (campaign_id, status, position);

-- =============================================================================
-- 3) Drop redundant indexes (unique columns already have implicit indexes)
-- =============================================================================

DROP INDEX IF EXISTS idx_unsub_token;
DROP INDEX IF EXISTS idx_unsubscribe_tokens_token;
DROP INDEX IF EXISTS idx_suppressed_emails_email;

-- =============================================================================
-- 4) Schema consistency fixes
-- =============================================================================

-- credit_grants: add updated_at + trigger
ALTER TABLE public.credit_grants
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DO $$ BEGIN
  CREATE TRIGGER trg_credit_grants_updated
    BEFORE UPDATE ON public.credit_grants
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- usage_counters: add created_at
ALTER TABLE public.usage_counters
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

-- email_automation_enrollments: add updated_at trigger
DO $$ BEGIN
  CREATE TRIGGER trg_email_automation_enrollments_updated
    BEFORE UPDATE ON public.email_automation_enrollments
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =============================================================================
-- 5) Security: revoke direct EXECUTE on security helpers
-- =============================================================================

REVOKE EXECUTE ON FUNCTION public.is_workspace_member(uuid, uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.can_access_business(uuid, uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_workspace_role(uuid, uuid, public.app_role[]) FROM anon, authenticated;

-- =============================================================================
-- 6) Fix incorrect function volatility on crypto functions
-- =============================================================================

ALTER FUNCTION public.encrypt_meta_token(text, text) STABLE;
ALTER FUNCTION public.decrypt_meta_token(bytea, text) STABLE;

-- =============================================================================
-- 7) Drop overly permissive public policy on offers (if not needed)
-- =============================================================================

DROP POLICY IF EXISTS "public view active offers" ON public.offers;

-- =============================================================================
-- 8) Add webhook tracking columns to billing_events
-- =============================================================================

ALTER TABLE public.billing_events
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS error_message text;

-- =============================================================================
-- 9) Standardize currency columns to numeric(12,2)
-- =============================================================================

ALTER TABLE public.transactions ALTER COLUMN amount TYPE numeric(12,2);
ALTER TABLE public.payouts ALTER COLUMN amount TYPE numeric(12,2);
ALTER TABLE public.payment_links ALTER COLUMN amount TYPE numeric(12,2);
ALTER TABLE public.products ALTER COLUMN price TYPE numeric(12,2);
ALTER TABLE public.ad_campaigns ALTER COLUMN budget_daily TYPE numeric(12,2);
