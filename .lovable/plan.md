

# Fix Google OAuth "Continue to" Domain

## The Problem

When users click "Sign in with Google," the Google consent screen shows **"to continue to fezpzihnvblzjrdzgioq.supabase.co"** — the raw Supabase project URL. This looks untrustworthy and unprofessional.

## The Solution

This is a **Supabase + Google Cloud Console configuration change** — no code changes needed. There are two approaches:

### Option A: Custom Domain on Supabase (Recommended)

1. **Set up a custom domain in Supabase** (e.g., `auth.listenflow.app` or `api.listenflow.app`)
   - Go to **Supabase Dashboard → Settings → Custom Domains**
   - Add your custom domain and configure DNS (CNAME record)
   - Once verified, Supabase auth will use this domain instead of `fezpzihnvblzjrdzgioq.supabase.co`

2. **Update Google Cloud Console OAuth credentials**:
   - Go to **Google Cloud Console → APIs & Services → Credentials**
   - Edit your OAuth 2.0 Client ID
   - Update **Authorized redirect URIs** from `https://fezpzihnvblzjrdzgioq.supabase.co/auth/v1/callback` to `https://auth.listenflow.app/auth/v1/callback`
   - Under **Authorized JavaScript origins**, add your custom domain

3. **Update Supabase Auth settings**:
   - Go to **Supabase Dashboard → Authentication → URL Configuration**
   - Ensure the **Site URL** is set to your production URL (`https://listenflow.lovable.app` or your custom domain)

After this, Google's consent screen will show **"to continue to listenflow.app"** (or whatever custom domain you choose).

### Option B: Without Custom Domain (Partial Fix)

Without a Supabase custom domain, you cannot change what Google shows on the consent screen — it will always display the Supabase project URL. However, you can improve trust by:
- Adding your app logo and name in the **Google Cloud Console → OAuth Consent Screen**
- Adding privacy policy and terms of service URLs

## Important Notes

- Custom domains on Supabase require a **Pro plan or higher** on Supabase (not the app's internal subscription tier)
- The Supabase custom domain feature handles SSL automatically
- No code changes are needed in the app — the `redirectTo` in `Auth.tsx` already uses `window.location.origin` correctly

## Recommendation

Set up a Supabase custom domain. This is the only way to replace the raw Supabase URL on Google's consent screen with your own branded domain.

