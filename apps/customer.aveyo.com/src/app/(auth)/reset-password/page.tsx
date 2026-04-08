'use client';

import { useState, useEffect, Suspense } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getBaseUrl } from '@/lib/config';
import { extractTokenFromUrl, normalizeTokenUrl } from '@/lib/auth-utils';

// Wrapper component that uses searchParams
function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  // These state variables are now declared in the component above

  // Check for token on page load - only run once
  useEffect(() => {
    let hasRun = false; // Prevent double execution in React StrictMode
    
    const checkTokenAndSession = async () => {
      if (hasRun) return;
      hasRun = true;
      
      // Log URL parameters for debugging
      console.log('Reset password page loaded');
      console.log('- Full URL:', window.location.href);
      console.log('- Query params:', searchParams?.toString());
      console.log('- Hash fragment:', window.location.hash);
      
      // Extract token from URL using our utility function
      const currentUrl = window.location.href;
      let token = extractTokenFromUrl(currentUrl);
      
      // If token is in hash fragment, redirect to normalized URL
      if (token && window.location.hash && window.location.hash.includes('token=')) {
        console.log('Found token in hash fragment, redirecting to normalized URL');
        window.location.href = normalizeTokenUrl('/reset-password', token);
        return;
      }
      
      // If we have a token, verify it's valid
      // Note: We're NOT calling getSession() here to reduce auth API calls
      if (token) {
        console.log('Found reset token in URL');
        try {
          // Verify the token is valid - this DOES count as an auth API call
          // but is necessary for security
          const { error } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: 'recovery'
          });
          
          if (error) {
            console.error('Token verification error:', error);
            setMessage({
              type: 'error',
              text: 'This password reset link is invalid or has expired. Please request a new one.'
            });
          } else {
            console.log('Token verified successfully');
          }
        } catch (error) {
          console.error('Error verifying token:', error);
        }
      } else {
        console.log('No token found in URL');
        // If no token in URL, show error message
        setMessage({
          type: 'error',
          text: 'Missing authentication token. Please make sure you clicked the complete reset link from your email or request a new password reset.',
        });
      }
    };
    
    checkTokenAndSession();
  }, []); // Empty dependency array - only run once on mount

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      // Validate passwords
      if (password !== confirmPassword) {
        throw new Error('Passwords do not match');
      }

      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }

      // Update the user's password
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        throw error;
      }

      // Log URL information for debugging
      console.log('Reset password URL detection:');
      console.log('- Full URL:', window.location.href);
      console.log('- Query params:', searchParams?.toString());
      
      // Re-assert customer account markers for shared-auth compatibility.
      await supabase.auth.updateUser({
        data: {
          user_type: 'customer',
          account_type: 'customer',
          role: 'customer'
        }
      });

      setMessage({
        type: 'success',
        text: 'Password has been reset successfully! Redirecting to login...',
      });

      // Redirect to login after a short delay
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (error: any) {
      console.error('Reset password error:', error);
      setMessage({
        type: 'error',
        text: error.message || 'An error occurred while resetting your password',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 sm:space-y-8">
        <div>
          <h2 className="mt-4 sm:mt-6 text-center text-2xl sm:text-3xl font-extrabold text-gray-900">
            Set New Password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Create a new secure password for your account
          </p>
        </div>
        
        <form className="mt-6 sm:mt-8 space-y-5 sm:space-y-6" onSubmit={handleResetPassword}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="password" className="sr-only">
                New Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="New Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
              />
            </div>
            
            <div className="mt-2">
              <label htmlFor="confirm-password" className="sr-only">
                Confirm Password
              </label>
              <input
                id="confirm-password"
                name="confirm-password"
                type="password"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={8}
              />
            </div>
          </div>

          {message && (
            <div
              className={`p-4 rounded-md ${
                message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
              }`}
            >
              {message.text}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed"
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </div>
          
          <div className="text-center mt-4">
            <p className="text-sm text-gray-600">
              Remember your password?{' '}
              <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
                Sign in
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

// Main page component with Suspense boundary
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen">Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
