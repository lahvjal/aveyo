# Email Verification & Password Reset Implementation Guide

## Current Implementation Overview

The customer portal uses a custom email flow with Resend for both verification and password reset emails:

1. **Email Service**: Uses [Resend](https://resend.com) with the verified domain `send.goaveyo.com`
2. **Sender Format**: All emails are sent from `"Aveyo Support <noreply@send.goaveyo.com>"`
3. **App Context Detection**: Includes `app_id` in both query parameters and URL hash for robust app detection
4. **Development Mode**: In development, all test emails are sent to `lahvjalf@aveyo.com` regardless of recipient

## How to Set Up in MyAveyo App

### 1. Environment Variables

Ensure these environment variables are set in your MyAveyo app:

```
RESEND_API_KEY=your_resend_api_key
NEXT_PUBLIC_SITE_URL=https://myaveyo.com
```

### 2. Update App ID Constants

In your MyAveyo app, create or update the constants file:

```typescript
// lib/constants.ts
export const APP_ID = 'myaveyo';
```

### 3. Implement Reset Password API Route

Copy the `/api/reset-password/route.ts` from the customer portal to your MyAveyo app, and update:

```typescript
// Change the app_id validation logic
if (!isMyAveyoUser) {
  console.log('==== VALIDATION RESULT ====');
  console.log('User found but not a myaveyo user:', email);
  console.log('User app_id:', user.user_metadata?.app_id || 'null');
  console.log('No email will be sent');
  console.log('==========================');
  return NextResponse.json({ 
    success: false, 
    message: 'This email is not associated with a MyAveyo account.',
    userExists: true,
    isMyAveyoUser: false,
    reason: 'not_myaveyo_user'
  });
}
```

### 4. Update Auth Callback Route

Implement the `/auth/callback/route.ts` similar to the customer portal version:

```typescript
// app/auth/callback/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { APP_ID } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const token = requestUrl.searchParams.get('token');
  
  // Get app_id from query parameters or use default
  const appId = requestUrl.searchParams.get('app_id') || APP_ID;
  
  // Also check for app_id in the URL hash
  const hashAppId = requestUrl.hash ? requestUrl.hash.match(/#app_id=([^&]*)/)?.[1] : null;
  
  // Use the app_id from the hash if available, otherwise use the query parameter
  const finalAppId = hashAppId || appId;
  
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

  // Handle code parameter (standard OAuth flow)
  if (code) {
    try {
      await supabase.auth.exchangeCodeForSession(code);
    } catch (error) {
      console.error('Error exchanging code for session:', error);
    }
  }
  
  // Handle token parameter (email verification flow)
  if (token) {
    try {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: 'email'
      });
      
      if (error) {
        console.error('Error verifying email with token:', error);
      }
    } catch (error) {
      console.error('Exception during email verification:', error);
    }
  }
  
  // Determine where to redirect after authentication
  const redirectPath = '/dashboard'; // Default path
  const targetDomain = process.env.NODE_ENV === 'development' 
    ? 'http://localhost:3000' 
    : 'https://myaveyo.com';
  
  // Construct the full redirect URL
  const finalRedirectUrl = `${targetDomain}${redirectPath}`;
  
  // URL to redirect to after sign in process completes
  return NextResponse.redirect(finalRedirectUrl);
}
```

### 5. Implement Reset Password Page

Create a reset password page at `/app/(auth)/reset-password/page.tsx` similar to the customer portal version, but update the app detection logic:

```typescript
// In the handleResetPassword function
// Super robust app_id detection - try multiple sources and fallback gracefully
let appId = 'myaveyo'; // Default to MyAveyo
let appIdSource = 'default';

// 1. Check query parameters
const appIdFromQuery = searchParams?.get('app_id');
if (appIdFromQuery) {
  appId = appIdFromQuery;
  appIdSource = 'query';
}

// Rest of the app detection logic...
```

### 6. Email Templates

Ensure your email templates are properly formatted with the MyAveyo branding:

```html
<!-- Password Reset Email Template -->
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <img src="https://myaveyo.com/logo.png" alt="MyAveyo Logo" style="max-width: 150px; margin-bottom: 20px;">
  <h2>Reset Your MyAveyo Password</h2>
  <p>Hello,</p>
  <p>We received a request to reset your password for your MyAveyo account. Click the button below to set a new password:</p>
  <div style="margin: 30px 0;">
    <a href="${resetUrl}" style="background-color: #0056b3; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">Reset Password</a>
  </div>
  <p>If you didn't request this password reset, you can safely ignore this email.</p>
  <p>This link will expire in 24 hours.</p>
  <p>Best regards,<br>The MyAveyo Team</p>
</div>
```

### 7. Testing the Implementation

1. **Test Password Reset Flow**:
   - Request a password reset with a valid MyAveyo user email
   - Check logs to ensure the email is sent with the correct app_id
   - Verify the reset link works and redirects properly after password change

2. **Test Email Verification Flow**:
   - Create a new user account
   - Verify the verification email is sent with the correct app_id
   - Click the verification link and ensure proper redirection

## Important Implementation Details

1. **App Context Detection**:
   - The system uses multiple fallback mechanisms to detect which app the user is using:
     - Query parameters (`app_id`)
     - URL hash (`#app_id=`)
     - Redirect URL domain
     - Referer header

2. **Security Considerations**:
   - The system validates if emails belong to the correct app before sending reset links
   - For security, it doesn't reveal whether an email exists or not
   - Uses idempotency keys to prevent duplicate emails

3. **Email Delivery**:
   - Uses Resend for reliable transactional email delivery
   - Sends from the verified domain `send.goaveyo.com`
   - Formats the sender as `"Aveyo Support <noreply@send.goaveyo.com>"`

4. **Development vs Production**:
   - In development, all emails are sent to `lahvjalf@aveyo.com` for testing
   - In production, emails are sent to the actual recipient
