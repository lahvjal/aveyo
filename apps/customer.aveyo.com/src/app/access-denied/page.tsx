'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import '@/styles/brand-colors.css';

export default function AccessDeniedPage() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && user.email) {
        setEmail(user.email);
        
        // Add debugging logs
        console.log('==== ACCESS DENIED DEBUG ====');
        console.log('User Email:', user.email);
        console.log('User Metadata:', JSON.stringify(user.user_metadata));
        
        // Check if the user has records in podio_data
        const { data: podioData, error: podioError } = await supabase
          .from('podio_data')
          .select('*')
          .eq('email', user.email);
          
        console.log('Podio Data Records:', podioData ? podioData.length : 0);
        if (podioError) {
          console.error('Podio Data Error:', podioError);
        }
        console.log('========================', podioData);
      }
    };
    
    checkUser();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 page-background">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-md">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Access Denied
          </h2>
          <div className="mt-4 text-center">
            <div className="rounded-full bg-red-100 p-3 inline-flex">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
        </div>
        
        <div className="mt-2">
          <p className="text-center text-sm text-gray-600">
            This account ({email || 'Unknown'}) is not registered for the Customer Portal.
          </p>
          <p className="text-center text-sm text-gray-600 mt-2">
            Please use the correct application or contact support for assistance.
          </p>
        </div>
        
        <div className="mt-6 flex flex-col space-y-4">
          <button
            onClick={handleSignOut}
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white brand-button focus:outline-none"
          >
            Sign Out
          </button>
          
          <Link 
            href="mailto:customercare@aveyo.com"
            className="group relative w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
          >
            Contact Support
          </Link>
        </div>
      </div>
    </div>
  );
}
