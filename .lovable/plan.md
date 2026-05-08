# Fix: /login infinite redirect loop

## Root cause

`src/routes/_authenticated.tsx` calls `navigate(...)` **inside the component render** when the user isn't authenticated:

```tsx
if (!user) {
  navigate({ to: "/login", search: { redirect: pathname } });
  return null;
}
```

`pathname` comes from `useRouterState`, which updates the moment the URL changes. Between the `navigate()` call and the route actually unmounting `_authenticated`, the component re-renders with `pathname === "/login"` — and fires another `navigate({ to: "/login", search: { redirect: "/login" } })`. The URL becomes `/login?redirect=/login`, and after a successful sign-in the login page sends the user back to `/login`, which loops.

Calling `navigate` during render is also a React anti-pattern (side effect during render) and is the proximate cause of the bad `pathname` snapshot.

## Fix

Move the auth check into TanStack Router's proper guard so the redirect happens **before** the layout ever renders, and never with `/login` as the captured location.

### 1. `src/routes/_authenticated.tsx`

- Add a `beforeLoad` on the route that, if there's no Supabase session, throws `redirect({ to: "/login", search: { redirect: location.href } })`.
- Read the session via `supabase.auth.getSession()` inside `beforeLoad` (server-safe; runs in the browser for this client-only flow).
- Remove the in-render `navigate({ to: "/login", ... })` block. The component can assume `user` exists; keep a lightweight loading guard for the brief auth-state hydration.
- As a defense-in-depth check, ignore the redirect entirely when `pathname` is already `/login` or `/signup`.

### 2. `src/routes/login.tsx`

- In `validateSearch`, sanitize `redirect`: if it starts with `/login` or `/signup` (or isn't a same-origin path starting with `/`), fall back to `/dashboard`. This prevents any stale `?redirect=/login` URL from re-triggering the loop.
- Optional: add a `beforeLoad` that redirects to `search.redirect` when a session already exists, so authenticated users never land on `/login`.

### 3. `src/routes/signup.tsx`

- Same `redirect` sanitation isn't needed (no search param), but apply the same authenticated-user `beforeLoad` redirect to `/dashboard` for consistency.

## Files touched

- `src/routes/_authenticated.tsx` — add `beforeLoad` guard, drop in-render `navigate`.
- `src/routes/login.tsx` — sanitize `redirect` search param, optional auth-aware `beforeLoad`.
- `src/routes/signup.tsx` — optional auth-aware `beforeLoad`.

No DB, no API, no UI changes beyond the auth gating.

## Verification

1. Visit `/dashboard/anything` while signed out → land on `/login?redirect=/dashboard/anything` (no loop).
2. Manually visit `/login?redirect=/login` → URL normalizes; sign-in goes to `/dashboard`.
3. Sign in → redirected to the original target.
4. Visit `/login` while already signed in → bounced to `/dashboard`.
