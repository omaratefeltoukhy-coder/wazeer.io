
CREATE TABLE public.ai_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  user_id uuid NOT NULL,
  business_id uuid,
  product_id uuid,
  content_type text NOT NULL CHECK (content_type IN ('image','video','ugc')),
  goal text,
  format text,
  prompt text,
  result_url text,
  script_text text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'ready',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members view ai_content" ON public.ai_content
  FOR SELECT USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "members insert ai_content" ON public.ai_content
  FOR INSERT WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()) AND auth.uid() = user_id);

CREATE POLICY "members update ai_content" ON public.ai_content
  FOR UPDATE USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "members delete ai_content" ON public.ai_content
  FOR DELETE USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE TRIGGER ai_content_set_updated_at
  BEFORE UPDATE ON public.ai_content
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_ai_content_workspace_created ON public.ai_content(workspace_id, created_at DESC);
