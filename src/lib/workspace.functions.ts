import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const ensureUserWorkspace = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = context.userId;
    if (!userId) throw new Error("Unauthorized");

    // 1. Check if user already has a workspace
    const { data: existingMember } = await supabaseAdmin
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();

    if (existingMember?.workspace_id) {
      return { workspace_id: existingMember.workspace_id, created: false };
    }

    // 2. Get user details from auth
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (userError || !userData.user) {
      throw new Error("Failed to fetch user: " + (userError?.message ?? "Unknown error"));
    }

    const email = userData.user.email ?? "";
    const fullName = (userData.user.user_metadata?.full_name as string) || email.split("@")[0] || "My";

    // 3. Ensure profile exists
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (!existingProfile) {
      await supabaseAdmin.from("profiles").insert({
        id: userId,
        email,
        full_name: fullName,
      });
    }

    // 4. Create workspace
    const { data: newWorkspace, error: wsError } = await supabaseAdmin
      .from("workspaces")
      .insert({
        owner_user_id: userId,
        name: fullName + "'s Workspace",
      })
      .select("id")
      .single();

    if (wsError || !newWorkspace) {
      throw new Error("Failed to create workspace: " + (wsError?.message ?? "Unknown error"));
    }

    // 5. Add user as owner
    await supabaseAdmin.from("workspace_members").insert({
      workspace_id: newWorkspace.id,
      user_id: userId,
      role: "owner",
    });

    // 6. Seed billing (credits + subscription)
    await supabaseAdmin.from("credit_grants").insert({
      workspace_id: newWorkspace.id,
      source: "trial",
      amount: 100,
      balance: 100,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      metadata_json: { plan: "trial" },
    });

    await supabaseAdmin.from("subscriptions").insert({
      workspace_id: newWorkspace.id,
      user_id: userId,
      plan: "trial",
      status: "trialing",
      current_period_end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });

    return { workspace_id: newWorkspace.id, created: true };
  });
