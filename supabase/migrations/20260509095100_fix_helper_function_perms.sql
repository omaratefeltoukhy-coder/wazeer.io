-- =============================================================================
-- Fix: Re-grant EXECUTE on SECURITY DEFINER helpers to authenticated role
-- =============================================================================
-- The revoke in 20260508111248 removed execute from authenticated, but RLS
-- policies run in the caller's context and PostgreSQL requires EXECUTE
-- permission on any function called inside a policy expression.
-- SECURITY DEFINER already protects us: the function body runs with the
-- owner's privileges for table access, but the caller still needs EXECUTE.
-- =============================================================================

grant execute on function public.is_workspace_member(uuid, uuid) to authenticated;
grant execute on function public.has_workspace_role(uuid, uuid, public.app_role[]) to authenticated;
grant execute on function public.can_access_business(uuid, uuid) to authenticated;
