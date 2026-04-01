# Authentication Flows Documentation

## Password Reset Flow

### Overview
The password reset flow allows users to reset their password through a secure email link. The flow consists of:

1. User requests a password reset on the forgot-password page
2. System validates the email exists in the database
3. System generates a secure reset token via Supabase
4. System sends an email with the reset link to the user
5. User clicks the link and is directed to the reset-password page
6. System validates the token and allows the user to set a new password
7. User is redirected to login with their new password

### Key Components

#### API Routes
- `/api/reset-password`: Generates reset tokens and sends emails
- `/api/test-reset-email`: For testing password reset links locally

#### Pages
- `/forgot-password`: Form to request a password reset
- `/reset-password`: Form to set a new password using a valid token

### Environment-Aware URLs
The system uses a centralized configuration to determine the appropriate URLs based on the current environment:

- **Development**: `http://localhost:3000`
- **Staging**: `https://staging.goaveyo.com`
- **Production**: `https://www.goaveyo.com`

### Token Handling
Reset tokens can be delivered in two formats:

1. Query parameters: `?token=abc123`
2. Hash fragments: `#token=abc123`

The system automatically normalizes hash fragment tokens to query parameter format for consistent handling.

## Email Verification Flow

### Overview
New users must verify their email address before accessing the system. The flow consists of:

1. User registers with email and password
2. System creates the user account with email_confirm=false
3. System generates a verification link via Supabase
4. System sends a welcome email with the verification link
5. User clicks the link to verify their email
6. System marks the email as verified and redirects to login

### Key Components

#### API Routes
- `/api/register-user`: Creates new users and sends verification emails
- `/api/welcome-email`: Sends welcome emails with verification links

## Email Configuration

All emails are sent using the Resend service with the following configuration:

- **From Address**: `Aveyo Support <noreply@send.goaveyo.com>`
- **Verified Domain**: `send.goaveyo.com`

## Centralized Configuration

The system uses a centralized configuration module at `/src/lib/config.ts` to manage environment-specific settings:

```typescript
// Environment detection
export const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
export const isProduction = process.env.NODE_ENV === 'production';
export const isStaging = typeof window !== 'undefined' 
  ? window.location.hostname.includes('staging') 
  : process.env.VERCEL_ENV === 'preview';

// Base URL determination
export function getBaseUrl(): string {
  // Logic to determine the appropriate base URL
}

// Auth redirect URL generation
export function getAuthRedirectUrl(path: string): string {
  // Logic to generate proper redirect URLs for auth flows
}
```

## Deployment Configuration

The application uses a branch-based deployment strategy:

- **main branch**: Deploys to Production (www.goaveyo.com)
- **staging branch**: Deploys to Staging (staging.goaveyo.com)

## Troubleshooting

### Diagnostic Endpoints

- `/api/email-diagnostic`: Tests email sending and provides detailed configuration info
- `/api/test-email`: Simple endpoint to test basic email functionality
- `/api/test-reset-email`: Generates test password reset links for local testing

### Common Issues

1. **Missing Reset Tokens**: If users report not receiving reset tokens, check:
   - Spam folders
   - Email deliverability logs in Resend dashboard
   - Server logs for token generation errors

2. **Invalid Reset Links**: If reset links don't work:
   - Check that the token is being properly extracted from both query params and hash fragments
   - Verify that the token hasn't expired (24-hour validity)
   - Ensure the redirect URL in Supabase matches the actual application URL
