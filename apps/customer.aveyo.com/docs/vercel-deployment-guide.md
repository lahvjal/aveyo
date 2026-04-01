# Vercel Deployment Guide: Staging and Production

This guide outlines how to set up and maintain staging and production environments for the GoAveyo Customer Portal using Vercel.

## Branch Strategy

We use a branch-based deployment strategy:

- **`main` branch**: Production environment (goaveyo.com)
- **`staging` branch**: Staging environment (staging.goaveyo.com)
- **Feature branches**: Preview deployments (optional)

## Environment Setup

### 1. Vercel Projects

Create two separate Vercel projects:

1. **Production Project**
   - Name: `customer-aveyo-com`
   - Connected to the `main` branch
   - Domain: `goaveyo.com`

2. **Staging Project**
   - Name: `customer-aveyo-com-staging`
   - Connected to the `staging` branch
   - Domain: `staging.goaveyo.com`

### 2. Environment Variables

Each environment should have its own set of environment variables:

#### Production Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=https://your-production-supabase-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-production-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-production-service-role-key
RESEND_API_KEY=your-resend-api-key
NEXT_PUBLIC_SITE_URL=https://goaveyo.com
```

#### Staging Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=https://your-staging-supabase-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-staging-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-staging-service-role-key
RESEND_API_KEY=your-resend-api-key
NEXT_PUBLIC_SITE_URL=https://staging.goaveyo.com
```

### 3. Supabase Projects

For a complete separation of concerns, we recommend setting up separate Supabase projects:

1. **Production Supabase Project**
   - Used by the production site
   - Contains real customer data

2. **Staging Supabase Project**
   - Used by the staging site
   - Can be seeded with test data
   - Safe for testing without affecting production data

## Deployment Workflow

### Manual Workflow

1. **For Staging Deployments**:
   - Make changes in feature branches
   - Create a PR to merge into the `staging` branch
   - Test on the staging environment
   - Once approved, merge to `staging`

2. **For Production Deployments**:
   - Create a PR from `staging` to `main`
   - Review changes
   - Once approved, merge to `main`

### Automated Workflow with GitHub Actions

We've set up a GitHub Actions workflow (`.github/workflows/deploy.yml`) that:

1. Runs tests on all PRs to `main` and `staging`
2. Automatically deploys to staging when changes are pushed to the `staging` branch
3. Automatically deploys to production when changes are pushed to the `main` branch

To use this workflow, you'll need to add the following secrets to your GitHub repository:

- `VERCEL_TOKEN`: Your Vercel API token
- `VERCEL_ORG_ID`: Your Vercel organization ID
- `VERCEL_PROJECT_ID_STAGING`: The project ID for your staging project
- `VERCEL_PROJECT_ID_PRODUCTION`: The project ID for your production project

## Testing Email Flows

When testing email flows:

1. **In Production**: Emails will be sent to real users with links to `https://goaveyo.com`
2. **In Staging**: 
   - Emails will be sent to test accounts
   - Links will point to `https://staging.goaveyo.com`
   - Make sure the Supabase Site URL is set to `https://staging.goaveyo.com` in your staging Supabase project

## Rollback Procedure

If issues are found in production:

1. Identify the last stable commit on `main`
2. Force deploy that commit using Vercel's "Redeploy" feature
3. Fix the issues in a new branch
4. Follow the normal PR process through `staging` to `main`

## Monitoring

Monitor both environments using:

1. Vercel Analytics
2. Supabase Dashboard
3. Resend Email Dashboard

## Best Practices

1. Always test changes on staging before deploying to production
2. Use feature flags for major changes to enable quick rollbacks
3. Keep environment variables in sync between Vercel and your local development
4. Regularly backup your Supabase database
5. Document all major changes in the deployment process
