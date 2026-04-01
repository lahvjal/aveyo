# Multi-App User Management Implementation Guide

This guide outlines the steps we've taken to implement multi-app user management in the Aveyo Customer Portal, allowing you to share a single Supabase instance between multiple applications while maintaining proper data separation.

## What We've Implemented

1. **App-Specific User Metadata**
   - Added `app_id` and `user_type` to user metadata during registration
   - Created utility functions to verify user app membership
   - Added support for updating legacy users with missing metadata

2. **Authentication Flow**
   - Enhanced login page to verify app membership
   - Added middleware protection for app-specific routes
   - Created an access-denied page for users from other apps

3. **Data Access Controls**
   - Updated data service functions to filter by app_id
   - Created SQL migration scripts for Row Level Security policies
   - Modified ProjectsContext to use app-specific user validation

4. **Migration Tools**
   - Created a script to migrate existing users by adding app_id metadata
   - Added documentation for the multi-app architecture

## Next Steps for Complete Implementation

### 1. Apply the SQL Migration Script

Run the SQL migration script in your Supabase project:

```bash
# From the Supabase dashboard:
# 1. Go to SQL Editor
# 2. Copy the contents of supabase/migrations/20250617_app_specific_rls_policies.sql
# 3. Run the script
```

### 2. Configure Email Templates

Set up app-specific email templates in the Supabase dashboard:

1. Go to Authentication > Email Templates
2. Create templates for:
   - Email confirmation
   - Password reset
   - Magic link login
3. Use the `{{ .UserMetadata.app_id }}` variable to customize content
4. Set up custom email domains for each app (optional)

### 3. Run the User Migration Script

Migrate existing users to include app_id metadata:

```bash
# First, run in dry-run mode to see what would be updated
node scripts/migrate-existing-users.js --dry-run

# Then run the actual migration
node scripts/migrate-existing-users.js
```

### 4. Update Additional Data Services

Apply app-specific filtering to any other data services:

1. Review all data service functions
2. Ensure they filter by customer_email
3. Update any custom API routes to respect app_id
4. Test thoroughly with users from different apps

### 5. Testing Checklist

- ✅ Register new users in the customer portal
- ✅ Verify legacy users are updated with app_id on login
- ✅ Test login with users from different apps
- ✅ Verify access-denied page works correctly
- ✅ Test password reset flow
- ✅ Ensure data queries respect app_id
- ✅ Verify RLS policies are working as expected

## Architecture Overview

### User Flow

1. User registers → app_id added to metadata
2. User logs in → app_id verified
3. If correct app → proceed to dashboard
4. If wrong app → redirect to access-denied page

### Data Access

1. Client requests data → getCurrentAppUser() verifies app membership
2. Supabase query includes customer_email filter
3. RLS policies verify both email and app_id match
4. Only appropriate data is returned

## Troubleshooting

### Common Issues

1. **Users can't log in**: Check if their app_id is set correctly
2. **Missing data**: Verify RLS policies are applied correctly
3. **Cross-app data leakage**: Check all queries include proper filters

### Debugging

1. Check user metadata in Supabase Auth dashboard
2. Review RLS policies in SQL Editor
3. Inspect network requests for proper filtering

## Future Considerations

1. **Analytics**: Track user activity by app_id
2. **Admin Portal**: Create interfaces for managing users across apps
3. **Shared Resources**: Identify which tables should be shared vs. app-specific
4. **Email Domains**: Configure different sender domains for each app
