# Supabase Migration Notes

## Architectural Change

The GoAveyo application has been migrated to its own dedicated Supabase project, separate from MyAveyo. This architectural change has several important implications:

1. **Independent Authentication**: Each app now has its own authentication system, user database, and storage.
2. **No More App ID Filtering**: Previously, we had to filter users and data by `app_id` to determine which app they belonged to. This is no longer necessary.
3. **Environment Variables**: The environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) must point to the new GoAveyo Supabase project.
4. **Simplified Data Access**: Queries no longer need to filter by `app_id`.
5. **Independent Scaling**: Each app can now scale independently based on its own resource needs.

## App Separation and Migration

### Previous Architecture
- **Two separate applications** (MyAveyo and GoAveyo) were sharing a single Supabase project
- **User differentiation** was handled using `app_id` in the `raw_user_meta_data` field
- **Same database, same auth system** - just filtered by `app_id` to separate users and data

### New Architecture
- **GoAveyo now has its own dedicated Supabase project** - completely separate infrastructure
- **MyAveyo remains on the original Supabase project**
- **No more shared resources** between the two applications

## Required Configuration Changes

1. **Environment Variables Updated**: GoAveyo app now connects to the new dedicated Supabase project
2. **RLS Policies**: Added new Row Level Security policy to allow authenticated users to access their own data

## Row Level Security (RLS) Policies

### Service Role Policy
- Policy Name: "Allow service role full access"
- Applied to: `public.podio_data`
- Access: Full access (ALL operations)
- Role: `service_role`

### User Data Access Policy
- Policy Name: "Allow users to access their own data"
- Applied to: `public.podio_data`
- Access: Full access (ALL operations)
- Role: `authenticated`
- Condition: `email = (auth.jwt() ->> 'email')`

## Email Flow Simplification

With the migration to a dedicated Supabase project, we've simplified the email flows by removing all `app_id` checks and filtering:

1. **Welcome Email**: Updated to use the GoAveyo URL directly without checking app_id.
2. **Password Reset**: Simplified to use the GoAveyo URL for reset links without app_id parameters.
3. **Auth Callback**: Streamlined to redirect to the appropriate page without app_id detection logic.

Key changes include:

- Removed all `app_id` parameters from URLs and hash fragments
- Simplified URL construction to use a single base URL (goaveyo.com in production)
- Removed user metadata checks for app_id
- Standardized email sender format to `Aveyo Support <noreply@send.goaveyo.com>`
- Removed custom idempotency key headers that might have caused delivery issues

## Important Notes

- No more `app_id` filtering needed - GoAveyo users are now the only users in the GoAveyo Supabase project
- The `podio_data` table structure remains identical to the original
- Real-time sync keeps `podio_data` in sync between both projects
