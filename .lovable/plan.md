## Wazeer AI — Staged Implementation Plan

> Plan only. No code will be written until you say "start Stage X".

### Already in place (preserve, do not rebuild)

- Lovable Cloud schema with RLS: `workspaces`, `workspace_members`, `profiles`, `businesses`, `business_inputs`, `brand_profiles`, `offers`, `storefronts`, `media_assets`, `ugc_scripts`, `ugc_videos`, `email_campaigns`, `email_automations`, `contacts`, `meta_connections`, `meta_posts`, `meta_campaigns`, `meta_ads`, `performance_snapshots`, `ai_recommendations`, `subscriptions`, `credit_transactions`, `orders`
- Auto-provisioning trigger (`handle_new_user`) → profile + workspace + owner membership
- Helpers `is_workspace_member`, `has_workspace_role`, `can_access_business`, `set_updated_at`
- Auth: Email/password + Google OAuth; `useAuth` provider; `/login`, `/signup`; `_authenticated` route guard
- Dashboard shell with sidebar; Create Business wizard inserting business + brand_profile + offer + draft storefront
- Landing page v1 (Hero with input card, How it works, Features, Pricing, FAQ, CTA, Footer)
- Design system tokens in `src/styles.css` (brand gradient, glow shadow); Inter typography

### Cross-stage global rules

- "Wazeer AI recommends" action on every complex screen (one-click smart default)
- Wizards over forms; plain language; preview-before-publish; approve-before-launch default ON for post / ad / email send / budget change
- Empty states, skeleton loaders, success/error toasts everywhere
- Every AI artifact: edit / copy / save / regenerate / approve / schedule / publish actions
- Mobile-first responsive (current preview is 458px)
- Voice: smart, premium, helpful, simple, confident — never guarantees sales (use "estimated impact" / "recommendation")
- Compliance: no fake testimonials, no misleading before/after, no medical/financial/legal claims, unsubscribe + consent on contacts, audit logs for publish/send/launch
- Secrets: tokens & API keys live ONLY in server functions / edge functions, encrypted at rest; never expose to the client bundle
- Credits: deducted on success, refunded automatically on failure; cost table defined once in `src/lib/billing/credits.ts`

---

## Stage 1 — Finish rebrand to Wazeer AI

**Files to edit**
- `index.html` (`<title>`, meta description, `og:title`, `og:description`, `og:site_name`, `twitter:title`, favicon alt)
- `README.md`
- `src/components/wazeer/Logo.tsx`, `Navbar.tsx`, `Footer.tsx`, `Hero.tsx`, `HowItWorks.tsx`, `Features.tsx`, `Pricing.tsx`, `FAQ.tsx`, `CTA.tsx` — replace any "Growth Spark" strings
- `src/routes/__root.tsx` head metadata
- `src/routes/_authenticated.tsx` sidebar branding
- `src/styles.css` — verify tokens: `--background` (white), `--foreground` (near-black), `--primary` (emerald), `--accent` (royal blue), `--brand-gradient`, `--shadow-glow`; add `--surface-1/2`, `--ring-emerald`, `--ring-royal` if missing
- Repo-wide ripgrep for `Growth Spark`, `growth-spark`, `growthspark`, `GS`, `growth_spark` and rename variables, component IDs, file names if any
- Project rename in Lovable settings (manual — I will ask you to do it)

**DB tables/columns**: none

**Edge functions**: none

**UI components**: none new — touch-up only

**Acceptance**
- Zero matches for "Growth Spark" in `src/`, `public/`, `index.html`, `README.md`
- Browser tab title and OG preview show "Wazeer AI — Your AI growth partner for selling online"
- Landing page primary CTA reads "Start selling with AI"; secondary "Generate my business"
- Tailwind theme renders emerald primary + royal blue accent on hero, buttons, focus rings; light/dark both legible

**Credits/safety rules**: n/a

**Mock vs real**: pure presentation — all real

---

## Stage 2 — AI Business Generation Engine

**Files to create**
- `src/lib/ai/businessGen.functions.ts` (server fns)
- `src/lib/ai/businessGen.server.ts` (gateway helpers, retries, schema validators using Zod)
- `src/lib/ai/prompts/*.ts` (one file per prompt: analyzeInput, brandProfile, offer, storefrontContent, contentStrategy, emailStrategy, adsStrategy)
- `src/components/wizard/Step6Generating.tsx` (progress + per-step status)
- `src/hooks/useBusinessGeneration.ts`

**Files to edit**
- `src/routes/_authenticated/dashboard.new.tsx` — wizard step 6 calls the orchestrator instead of inserting blanks
- `src/routes/_authenticated/dashboard.tsx` — show "Generating…" banner if `businesses.status='generating'`

**DB tables/columns touched**
- `businesses`: add `status text default 'ready'` (`generating | ready | failed`), `generation_log_json jsonb default '{}'`
- `brand_profiles`: written from AI (uses existing `tone, visual_style, positioning, colors_json, audience_json, benefits_json, pain_points_json, objections_json`)
- `offers`: written from AI
- `storefronts.content_json`: structured sections (hero, benefits, how_it_works, included, testimonials, faq, pricing, checkout)
- `business_inputs`: store original input + `extracted_data_json`
- `ai_recommendations`: seed first 3 recommendations on completion

**Server functions (TanStack `createServerFn`, NOT Supabase Edge Functions — see project rule)**
- `analyzeBusinessInput`, `generateBusinessProfile`, `generateOffer`, `generateStorefrontContent`, `generateContentStrategy`, `generateEmailStrategy`, `generateAdsStrategy`
- All call Lovable AI Gateway (`google/gemini-3-flash-preview` default; `gemini-2.5-pro` for storefront content) using **tool calling** for structured JSON
- Retry: 2 attempts on parse error, 3 on 429 with exponential backoff, surface 402 as "Add AI credits"

**UI components**: progress timeline (7 steps with check / spinner / error), inline preview cards as each step completes, "View business" CTA when done

**Acceptance**
- Wizard input → after ≤90s, dashboard shows new business with non-empty brand profile, offer, and storefront sections
- Every AI field is editable in place (debounced save)
- Failed step shows reason + "Retry this step"; partial success keeps successful sections

**Credits/safety**
- 15 credits per full business generation; deducted only when wizard completes; refunded on hard failure
- Reject inputs <10 chars or flagged categories (medical/financial/legal claims); return guidance message

**Mock vs real**: AI calls REAL via Lovable AI; image uploads stored in Supabase Storage (new bucket `business-inputs`)

---

## Stage 3 — Storefront Builder + Public Page + Checkout

**Files to create**
- `src/routes/_authenticated/storefront.$businessId.tsx` (editor)
- `src/routes/s.$slug.tsx` (public storefront)
- `src/routes/s.$slug.checkout.tsx`
- `src/routes/s.$slug.success.tsx`
- `src/components/storefront/sections/{Hero,Benefits,HowItWorks,Included,Testimonials,FAQ,Pricing,Checkout,LeadCapture,Waitlist,BookCall}.tsx`
- `src/components/storefront/SectionEditor.tsx`, `LayoutPicker.tsx`, `LivePreview.tsx`
- `src/lib/storefront/{regenerateSection,changeLayout,publish}.functions.ts`
- `src/routes/api/public/webhooks/payments.ts` (signed webhook)

**Files to edit**: sidebar adds Storefront link

**DB**
- `storefronts`: add `theme text`, `layout text`, `seo_json jsonb`, `lead_capture_json jsonb`
- New table `storefront_versions` (snapshot history): `id, storefront_id, content_json, created_at, created_by`
- `orders`: already exists; add `checkout_session_id text`, `metadata_json` already there

**Server functions / routes**
- `regenerateSection({ storefrontId, sectionKey, brief? })`
- `changeLayout({ storefrontId, layout })`
- `publishStorefront({ storefrontId })` — validates required sections, sets `status='published'`, generates SEO JSON-LD
- `createCheckoutSession({ offerId, mode: 'one_time'|'subscription', interval?, trialDays?, couponCode? })`
- `createBillingPortalSession({ workspaceId })`
- Public webhook handler `POST /api/public/webhooks/payments` (signature verified) → upsert `orders`, update `subscriptions`

**UI**
- Left rail: section list with drag-reorder, show/hide
- Right rail: section properties + "Regenerate this section" + "Wazeer AI recommends"
- Top bar: device toggle (mobile / tablet / desktop), Preview, Publish (with checklist modal)
- Public page: SSR-friendly, semantic HTML, single H1, canonical, OG image, mobile-first checkout

**Acceptance**
- User can edit / reorder / regenerate / hide every section, then publish to `/s/{slug}` with no auth
- Test card completes checkout, webhook lands order, success page shows
- Mobile checkout is one-screen, ≤3 fields above the fold

**Credits/safety**
- Section regeneration: 2 credits; layout change: 0; publish: 0
- Lead capture stored only with explicit consent checkbox; retain unsubscribe footer

**Mock vs real**
- Stage uses **Paddle** (recommended provider) — checkout + portal + webhooks REAL once enabled
- Until Paddle enable: a `MOCK_PAYMENTS=1` flag short-circuits checkout to a fake success for demos

---

## Stage 4 — AI Image Generator

**Files to create**
- `src/routes/_authenticated/images.tsx` (gallery + new)
- `src/components/images/{FormatPicker,StylePicker,PromptEditor,ResultGrid,ImageCard}.tsx`
- `src/lib/images/{generateImage,editPrompt,regenerate}.functions.ts`

**DB**
- `media_assets`: existing — uses `type`, `source`, `prompt`, `file_url`, `metadata_json`, `status`
- New storage bucket `media` (public read for `file_url`)

**Server functions**
- `generateImage({ businessId, prompt, format, style, refImageUrls? })` — provider-agnostic adapter (`provider: 'mock' | 'gemini-image' | future-fal/replicate`); brand-aware prompt prefix from `brand_profiles`
- Statuses: `queued → generating → ready | failed`

**UI**
- Format selector: 1:1, 9:16, 16:9, ad (1.91:1), email banner (3:1)
- Style selector with preview thumbnails: premium studio, lifestyle, minimal, luxury, local market, creator-led, bold ad, clean ecommerce
- Card actions: edit prompt, regenerate, save, "Use in ad / post / email", download, delete

**Acceptance**
- 1 credit per successful image; refunded on `failed`
- Brand colors + tone injected into prompts automatically when `brand_profiles` present
- Uploads of product photos preserved as references; prompts forbid invented labels/claims

**Mock vs real**: provider = mock until image-gen secret is added; structure ready for swap

---

## Stage 5 — UGC Scripts + AI UGC Videos

**Files to create**
- `src/routes/_authenticated/ugc.tsx`, `src/routes/_authenticated/ugc-videos.tsx`
- `src/components/ugc/{ScriptForm,ScriptCard,ScriptDetail,StoryboardView,VideoCard,VideoPlayer}.tsx`
- `src/lib/ugc/{generateUgcScript,generateStoryboard,generateScenePrompts,generateVideo,pollVideoJob,saveVideo}.functions.ts`

**DB**
- `ugc_scripts`: extend `script_json` shape — `{title, target_customer, length_sec, hook_3s, scenes[], spoken_script, on_screen_text[], b_roll[], creator_direction, cta, predicted_perf}`; add `status` enum values: `draft|approved|archived|used_in_ad`
- `ugc_videos`: existing — uses `script_id, storyboard_json, video_url, status, provider_job_id, error_message`; add `aspect_ratio text`, `voice_id text`, `avatar_id text`, `poster_url text`, `duration_sec int`

**Server functions**: as named in spec; `pollVideoJob` advances mock pipeline (queued → rendering → ready) until provider is real

**UI**
- Script form (angle, tone, platform, length, language) → 3 variants
- Script detail drawer with full structure, edit each field, "Approve", "Generate video"
- Video card with status pill, poster, player, "Use in Meta post / Use in Meta ad"

**Acceptance**
- Script gen: 3 credits; video gen: 25 credits (refunded on `failed`)
- Scripts and videos linked to a business; status transitions logged

**Mock vs real**: scripts REAL via gateway; videos MOCK (placeholder MP4 + poster) with provider seam

---

## Stage 6 — Email Campaigns + Automation

**Files to create**
- `src/routes/_authenticated/emails.tsx`, `emails.$id.tsx`, `automations.tsx`, `automations.$id.tsx`
- `src/components/email/{TemplatePicker,EmailEditor,SendTestModal,RecipientPicker,AnalyticsPanel}.tsx`
- `src/components/automation/{TriggerNode,DelayNode,ActionNode,ConditionNode,FlowCanvas}.tsx`
- `src/lib/email/{generateCampaign,sendTestEmail,scheduleEmail,sendCampaign,processAutomation,syncEvents}.functions.ts`
- `src/routes/api/public/webhooks/resend.ts`

**DB**
- `email_campaigns`: extend `content_json` (subject_variants, preheader, blocks[], from_name, from_email, reply_to); add `scheduled_at timestamptz`, `sent_at timestamptz`, `audience_filter_json jsonb`
- `email_automations`: extend `steps_json` to flow graph; add `last_run_at`, `next_run_at`
- `email_events`: existing — used for analytics
- `contacts`: add `consent_at timestamptz`, `unsubscribed_at timestamptz`, `suppression_reason text`
- New `email_senders` table: `id, business_id, from_name, from_email, reply_to, dkim_status, verified_at`

**Server functions**: as listed; cron via Supabase scheduled job hitting `/api/public/cron/process-automations`

**UI**
- 11 template generators (welcome, abandoned cart, launch, lead nurture, offer announcement, trial conversion, renewal, win-back, re-engagement, event reminder, customer onboarding)
- Visual automation builder with conditions
- Analytics panel: sent, delivered, open, click, unsub, bounce, revenue, conversion, best subject, best CTA

**Acceptance**
- 4 credits per campaign generation, 0 per send (sends count against plan email cap)
- Unsubscribe link auto-injected; consent gate enforced before send
- 402/429 surfaced; suppression list honored

**Mock vs real**: Resend REAL once `RESEND_API_KEY` added; Gmail/Outlook/SMTP placeholders only

---

## Stage 7 — Meta integration (DEMO mode, real architecture)

**Files to create**
- `src/routes/_authenticated/meta.tsx`, `meta.posts.tsx`, `meta.ads.tsx`, `meta.connect.tsx`
- `src/components/meta/{ConnectionCard,AccountPicker,PostComposer,PostPreview,AdsWizardSteps,LaunchConfirmModal}.tsx`
- `src/lib/meta/{startOAuth,handleCallback,sync*,publishPost,schedulePost,createCampaign,createAdSet,createCreative,createAd,fetchInsights,pauseCampaign,updateBudget}.functions.ts`
- `src/routes/api/public/oauth/meta/callback.ts`

**DB**
- `meta_connections`: add `access_token_encrypted bytea`, `refresh_token_encrypted bytea`, `token_expires_at timestamptz`, `pixel_id text`, `capi_token_encrypted bytea`, `state text`
- `meta_posts`, `meta_campaigns`, `meta_ads`: existing
- New `audit_logs` table: `id, workspace_id, business_id, actor_user_id, action, resource_type, resource_id, payload_json, created_at`

**Server functions**: as listed; encryption helper using pgsodium / `crypto` in server fn

**UI**
- Connection card states: not connected / connected / needs reconnect / permission missing / token expired / app review required / syncing / sync failed — each with explicit fix CTA
- Post composer: caption, creative slot, hashtags, CTA, platform (FB/IG/Reels/Stories/Carousel), recommended publish time
- Ads wizard: goal → product → creative → audience → budget → duration → review → launch (explicit confirm: estimated daily spend, "Meta approval may be required", "Results not guaranteed")
- Default approval-required toggle ON; never auto-publish

**Acceptance**
- Demo mode shows realistic mock data flowing through every screen
- Real wiring requires only swapping `META_PROVIDER=real` and adding secrets

**Credits/safety**
- Post draft: 2 credits; ad draft: 4 credits; publish/launch: 0 (counts against plan caps)
- All publish/launch/budget-change actions write to `audit_logs`

---

## Stage 8 — Performance Dashboard + AI Recommendations

**Files to create**
- `src/routes/_authenticated/dashboard.index.tsx` (revamp), `dashboard.sales.tsx`, `dashboard.subscriptions.tsx`, `dashboard.storefront.tsx`, `dashboard.email.tsx`, `dashboard.posts.tsx`, `dashboard.ads.tsx`, `dashboard.customers.tsx`, `dashboard.recommendations.tsx`
- `src/components/dashboard/{KpiCard,TrendChart,Leaderboard,FunnelChart,CreativeCompare,RecommendationCard}.tsx`
- `src/lib/analytics/{syncPerformanceData,calculateMetrics,generateRecommendations}.functions.ts`

**DB**
- `performance_snapshots`: existing — primary metric store
- New `dashboard_metrics_cache` table: `(business_id, metric_key, period, value_json, computed_at)`
- `ai_recommendations`: existing — extend `action_json` shape with `{cta_label, target_route, params}`

**Server functions / cron**
- `syncPerformanceData` — pulls from Meta/Resend/orders; writes snapshots
- Cron cadence: 15 min on paid plans, 24 h on Starter, manual on Trial
- `generateGrowthRecommendations` — AI over latest snapshots → up to 5 cards

**UI**
- All metrics from spec rendered with empty states + skeleton loaders
- Recommendation cards: priority pill, category, problem, suggested action, expected impact (range), confidence %, "Apply" (one-click) with `requires_approval` toggle

**Acceptance**
- All charts render with mock data when no real syncs yet; switch to real once integrations live
- Recommendations write `audit_logs` on apply

**Credits/safety**: 1 credit per recommendations refresh

---

## Stage 9 — Customers / Orders / Subscriptions pages

**Files to create**
- `src/routes/_authenticated/customers.tsx`, `customers.$id.tsx`, `orders.tsx`, `orders.$id.tsx`, `subscriptions.tsx`, `subscriptions.$id.tsx`
- `src/components/lists/{CustomerTable,OrderTable,SubscriptionTable,Filters,ExportCSV}.tsx`

**DB**
- `contacts`: add `lifetime_value numeric default 0`, `orders_count int default 0`, `last_order_at timestamptz`
- `orders`: existing
- `subscriptions`: add `cancel_at timestamptz`, `trial_ends_at timestamptz`, `paddle_customer_id text`, `paddle_subscription_id text`

**Server fns**: `listCustomers`, `getCustomerDetail`, `listOrders`, `listSubscriptions`, `exportCsv`

**UI**: filterable tables, customer detail with timeline (orders, emails, posts viewed), refund / cancel actions with confirm

**Acceptance**: server-side pagination, search, CSV export, mobile cards fallback

---

## Stage 10 — Integrations page

**Files to create**
- `src/routes/_authenticated/integrations.tsx`
- `src/components/integrations/{IntegrationCard,ConnectModal,Troubleshoot}.tsx`

**DB**
- New `integrations` table: `id, workspace_id, kind (email|meta|payments|image|video|analytics|domain|webhook|api_key), provider, status, config_json, secret_ref, last_synced_at`

**Server fns**: `connectIntegration`, `disconnectIntegration`, `testIntegration`, `rotateApiKey`

**UI**: sectioned cards per kind with Connect / Status / Last synced / Troubleshoot

**Acceptance**: every secret stored via `secrets--add_secret` and referenced by name only; never displayed back

---

## Stage 11 — Billing, plans, credits & feature locks

**Plans (master spec)**

| Plan | Price/mo | AI credits | Businesses | Storefronts | UGC videos | AI images | Email sends | Meta ads | Seats |
|---|---|---|---|---|---|---|---|---|---|
| Free Trial (7 days) | $0 | 100 | 1 | 1 | 2 | 20 | 100 | locked | 1 |
| Starter | $19 | 800 | 1 | 2 | 8 | 150 | 1,500 | locked | 1 |
| Growth | $49 | 3,000 | 3 | 8 | 30 | 800 | 10,000 | unlocked | 3 |
| Pro | $99 | 8,000 | 6 | 25 | 80 | 3,000 | 40,000 | unlocked | 5 |
| Agency | $249 | 25,000 | 25 | unlimited | 250 | 10,000 | 150,000 | unlocked + multi-account | 15 |

Top-ups: 1k credits = $12, 5k = $50, 20k = $180

**Files to create**
- `src/routes/_authenticated/billing.tsx`, `billing.success.tsx`, `billing.failed.tsx`
- `src/routes/pricing.tsx` (public)
- `src/components/billing/{PlanCard,ComparisonGrid,UpgradeModal,TrialBanner,UsageMeter,CreditBalancePill,LockedFeature}.tsx`
- `src/lib/billing/{plans.ts,credits.ts,guard.ts,checkout.functions.ts,portal.functions.ts}`
- `src/routes/api/public/webhooks/paddle.ts`

**DB**
- `subscriptions`: add `provider text default 'paddle'`, `paddle_customer_id`, `paddle_subscription_id`, `trial_ends_at`, `cancel_at`
- New `credit_grants` table: `(workspace_id, source 'plan'|'topup'|'bonus', amount, granted_at, expires_at)`
- New `usage_counters` table: `(workspace_id, period_start, period_end, metric, count)`
- View `v_workspace_balance(workspace_id, credits_remaining, plan, status, period_end)`
- DB functions: `consume_credits(_workspace_id, _amount, _reason, _meta) returns boolean`, `increment_usage(_workspace_id, _metric, _by)`
- Trigger on workspace insert: seed Trial subscription + 100-credit grant + 7-day `trial_ends_at`

**Server functions**
- `createCheckoutSession({ priceId, kind })` → Paddle URL
- `createBillingPortalSession()` → Paddle portal URL
- `updateSubscription({ targetPlan })` (proration via Paddle)
- `deductCredits({ amount, reason })` — used by every paid AI action
- Public route `/api/public/webhooks/paddle` (signature-verified) → updates subscriptions + credit_grants

**UI**
- Public `/pricing` page with comparison grid
- `/dashboard/billing`: current plan card, trial countdown, usage meters, credit balance, top-up packs, manage billing button
- Sidebar pill shows credits remaining → click opens billing
- `<LockedFeature plan="growth">` blurs gated UI with Upgrade CTA
- Payment success / failed pages with next-step CTAs

**Acceptance**
- Server-side `requireEntitlement` + `consumeCredits` called from every paid action; 402/insufficient errors surfaced as toast with one-click upgrade
- Cancel / change plan flows respected; webhook updates state ≤10s after Paddle event
- Trial banner appears when `trial_ends_at - now() < 3 days`

**Credits/safety**: refunds on failure, audit log entry per checkout / cancel / plan change

**Mock vs real**: REAL once `enable_paddle_payments` runs and products are created

---

### Suggested execution order

Stage 1 → 2 → 11 (so caps & credits exist before heavy AI features) → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10. I will pause after each stage for your sign-off.

### Action requested before Stage 1

1. Rename the project to **Wazeer AI** in Lovable settings (top-left → Project settings → Rename). I cannot do this from code.
2. Confirm the plan + execution order, or tell me the first stage to start (e.g. "start Stage 1").
