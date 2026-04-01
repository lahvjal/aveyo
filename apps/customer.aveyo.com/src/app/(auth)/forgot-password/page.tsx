'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  
  // Use useEffect to mark component as mounted on client
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      console.log('Sending password reset request for:', email);
      
      try {
        // Call our custom API endpoint that uses Resend
        const response = await fetch('/api/reset-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email
          })
        });
        
        // Check if the response is JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          console.error('Non-JSON response received:', await response.text());
          throw new Error('Server returned an invalid response. Please try again later.');
        }
        
        const data = await response.json();
        
        if (!response.ok) {
          console.error('Password reset API error:', data);
          throw new Error(data.error || 'Failed to send password reset email');
        }
        
        // Check if the email is not associated with a customer account
        if (data.success === false) {
          setMessage({
            type: 'error',
            text: data.message || 'This email is not associated with a customer account.'
          });
          return;
        }
        
        // Client-side processing complete - server handles validation and email sending
      } catch (apiError) {
        console.error('API call error:', apiError);
        throw new Error('Failed to connect to the password reset service. Please try again later.');
      }

      setMessage({
        type: 'success',
        text: 'Password reset link sent! Please check your email. If you don\'t see the email in your inbox, please check your spam folder.',
      });
    } catch (error: any) {
      console.error('Forgot password error:', error);
      setMessage({
        type: 'error',
        text: error.message || 'An error occurred while sending the reset link',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 sm:space-y-8">
        <div className="flex flex-col items-center">
          <img src="/aveyo-logo.svg" alt="Aveyo Logo" className="h-16 w-auto" />
          <h2 className="mt-4 sm:mt-6 text-center text-2xl sm:text-3xl font-extrabold text-gray-900">
            Reset Your Password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter your email and we'll send you a link to reset your password
          </p>
        </div>
        
        {/* Only render the form when component is mounted on client side */}
        {mounted && (
          <form className="mt-6 sm:mt-8 space-y-5 sm:space-y-6" onSubmit={handleForgotPassword}>
          <div className="rounded-md shadow-sm">
            <div>
              <label htmlFor="email-address" className="sr-only">
                Email address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
              {loading ? 'Sending...' : 'Send Reset Link'}
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
        )}
        
        {/* Show a loading state before client-side hydration */}
        {!mounted && (
          <div className="mt-6 text-center text-gray-500">
            <p>Loading form...</p>
          </div>
        )}
      </div>
    </div>
  );
}
