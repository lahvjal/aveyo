/**
 * The Supabase admin client (service role) has been moved server-side.
 * All admin auth operations now go through the `admin-user-ops` edge function.
 *
 * This file is kept as a placeholder to avoid breaking imports while the
 * migration is in progress. It exports `null` so that any remaining
 * references fail gracefully rather than silently.
 *
 * SECURITY: SUPABASE_SERVICE_ROLE_KEY must NOT be set in browser-exposed env vars
 * or any client-side environment. The service role key lives exclusively
 * in Supabase edge function secrets.
 */

export const supabaseAdmin = null
