-- transactions
CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  product_id uuid,
  buyer_name text,
  buyer_email text,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'completed',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members view transactions" ON public.transactions FOR SELECT USING (is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "members insert transactions" ON public.transactions FOR INSERT WITH CHECK (is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "members update transactions" ON public.transactions FOR UPDATE USING (is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "owners delete transactions" ON public.transactions FOR DELETE USING (has_workspace_role(workspace_id, auth.uid(), ARRAY['owner'::app_role,'admin'::app_role]));
CREATE INDEX idx_tx_workspace_created ON public.transactions(workspace_id, created_at DESC);

-- payouts
CREATE TABLE public.payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'pending',
  scheduled_date date,
  paid_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members view payouts" ON public.payouts FOR SELECT USING (is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "owners manage payouts" ON public.payouts FOR ALL USING (has_workspace_role(workspace_id, auth.uid(), ARRAY['owner'::app_role,'admin'::app_role])) WITH CHECK (has_workspace_role(workspace_id, auth.uid(), ARRAY['owner'::app_role,'admin'::app_role]));

-- payout_methods
CREATE TABLE public.payout_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  method_type text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.payout_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members view payout methods" ON public.payout_methods FOR SELECT USING (is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "owners manage payout methods" ON public.payout_methods FOR ALL USING (has_workspace_role(workspace_id, auth.uid(), ARRAY['owner'::app_role,'admin'::app_role])) WITH CHECK (has_workspace_role(workspace_id, auth.uid(), ARRAY['owner'::app_role,'admin'::app_role]));
CREATE TRIGGER trg_payout_methods_updated BEFORE UPDATE ON public.payout_methods FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();