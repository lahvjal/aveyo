'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { analytics } from '@/lib/analytics';
import { bypassRateLimit } from '@/utils/authUtils';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [lastAttemptTime, setLastAttemptTime] = useState(0);
  const [rateLimitCountdown, setRateLimitCountdown] = useState(0);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check for rate limiting
    const now = Date.now();
    const timeSinceLastAttempt = now - lastAttemptTime;
    
    // If there have been multiple attempts in a short time, enforce a cooldown period
    if (loginAttempts > 2 && timeSinceLastAttempt < 10000) { // 10 seconds cooldown
      setMessage({
        type: 'error',
        text: `Too many login attempts. Please wait ${Math.ceil((10000 - timeSinceLastAttempt) / 1000)} seconds before trying again.`
      });
      return;
    }
    
    setLoading(true);
    setMessage(null);
    setLoginAttempts(prev => prev + 1);
    setLastAttemptTime(now);

    try {
      // Password authentication
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Log the full error for debugging
        console.error('Supabase login error:', {
          message: error.message,
          status: error.status,
          name: error.name,
          fullError: error
        });
        
        if (error.message.includes('rate limit') || error.message.includes('Email rate limit exceeded')) {
          throw new Error('Too many authentication requests from this network. Please wait 2-3 minutes before trying again. This helps protect account security.');
        }
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Invalid email or password. Please check your credentials and try again.');
        }
        throw error;
      }

      // User is authenticated
      const user = data?.user;

      // Track successful login
      if (user?.email) {
        analytics.userLogin(user.email);
      }

      // Reset attempts on successful login
      setLoginAttempts(0);
      
      // Redirect to dashboard on successful login
      router.push('/dashboard');
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Track login error
      analytics.error('login_failed', error.message || 'Unknown login error', 'login');
      
      // If it's a rate limit error, start countdown
      if (error.message.includes('rate limit') || error.message.includes('Too many login attempts')) {
        setRateLimitCountdown(180); // 3 minutes countdown
        
        // Start countdown timer
        const countdown = setInterval(() => {
          setRateLimitCountdown(prev => {
            if (prev <= 1) {
              clearInterval(countdown);
              setMessage(null);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
      
      setMessage({
        type: 'error',
        text: error.message || 'An error occurred during login',
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
            Customer Portal
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign in to track your solar installation progress
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="rounded-md shadow-sm -space-y-px">
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
            
            <div className="mt-2">
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
              {rateLimitCountdown > 0 && (
                <div className="mt-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                    <span>Please wait {Math.floor(rateLimitCountdown / 60)}:{(rateLimitCountdown % 60).toString().padStart(2, '0')} before trying again</span>
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading || rateLimitCountdown > 0 || (loginAttempts > 2 && Date.now() - lastAttemptTime < 10000)}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 
               (loginAttempts > 2 && Date.now() - lastAttemptTime < 10000) ? 
               `Wait ${Math.ceil((10000 - (Date.now() - lastAttemptTime)) / 1000)}s` : 'Sign in'}
            </button>
          </div>
          
          {/* Development rate limit bypass */}
          {process.env.NODE_ENV === 'development' && rateLimitCountdown > 0 && (
            <div className="mt-4">
              <button
                type="button"
                onClick={() => {
                  bypassRateLimit();
                  setRateLimitCountdown(0);
                  setMessage(null);
                  setLoginAttempts(0);
                }}
                className="w-full text-sm text-gray-600 hover:text-gray-800 underline"
              >
                🔧 Development: Clear Rate Limit
              </button>
            </div>
          )}

          <div className="flex items-center justify-between mt-4">
            <div className="text-sm">
              <Link href="/forgot-password" className="font-medium text-blue-600 hover:text-blue-500">
                Forgot your password?
              </Link>
            </div>
            <div className="text-sm">
              <Link href="/register" className="font-medium text-blue-600 hover:text-blue-500">
                Register here
              </Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
