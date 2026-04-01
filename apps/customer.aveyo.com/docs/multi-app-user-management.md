# Multi-App User Management in Supabase

This document outlines how we've implemented multi-app user management in our Supabase project to handle two different user bases: the Customer Portal users and users from another application.

## Overview

We're sharing a single Supabase project between two applications while ensuring:
1. Users from each app can only access their own data
2. Email communications (password resets, confirmations) are sent from the correct domain
3. Authentication flows direct users to the appropriate application

## Implementation Details

### 1. User Metadata

We've added `app_id` and `user_type` fields to user metadata during registration:

```typescript
// During user registration
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: {
      app_id: 'customer_portal',
      user_type: 'customer'
    },
    emailRedirectTo: `${window.location.origin}/auth/callback`
  }
});
```

### 2. Row Level Security (RLS) Policies

We've implemented RLS policies that filter data based on the user's `app_id`:

```sql
-- Example policy for podio_data table
CREATE POLICY "Customer portal users can access their own data"
ON public.podio_data
FOR ALL
USING (
  (auth.user_has_app_id('customer_portal') AND customer_email = auth.email())
);
```

### 3. Authentication Flow

We've updated the login flow to check if users belong to the correct app:

```typescript
// Check if user belongs to this app
const user = data?.user;
if (user) {
  const appId = user.user_metadata?.app_id;
  
  if (!appId) {
    // For existing users without app_id, update their metadata
    await ensureUserHasAppId(user.id);
  } else if (appId !== APP_ID) {
    throw new Error('This account is not registered for the Customer Portal');
  }
}
```

### 4. Middleware Protection

We've added middleware to redirect users who don't belong to the customer portal:

```typescript
// Redirect authenticated users who don't belong to this app
if (isAuthenticated && !isCorrectApp && isDashboardRoute) {
  const redirectUrl = new URL('/access-denied', request.url);
  return NextResponse.redirect(redirectUrl);
}
```

### 5. Access Denied Page

We've created a dedicated page for users who try to access the wrong application:

```typescript
// access-denied/page.tsx
export default function AccessDeniedPage() {
  // Shows appropriate message and sign out button
}
```

## Email Templates

For email templates, you'll need to configure them in the Supabase dashboard:

1. Go to Authentication > Email Templates
2. Create separate templates for each app
3. Use the `{{ .UserMetadata.app_id }}` variable to customize content

## Migration Script

We've provided a SQL migration script (`supabase/migrations/20250617_app_specific_rls_policies.sql`) that:

1. Creates a function to check user app_id
2. Sets up RLS policies for tables
3. Creates triggers to handle new user registration

## Testing

To test this implementation:

1. Register users in both applications
2. Verify users can only access their own app's data
3. Test password reset flows to ensure emails come from the correct domain
4. Verify users are redirected appropriately when trying to access the wrong app

## Considerations for the Future

1. **Analytics**: Consider tracking user activity by app_id
2. **Admin Access**: Create special policies for admin users who need access to both apps
3. **Shared Resources**: Identify which tables should be shared vs. app-specific
4. **Email Domains**: Configure different sender domains for each app
