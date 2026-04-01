'use client';

import AppShell from '@/components/layout/AppShell';
import '@/styles/brand-colors.css';

export default function SupportPage() {

  return (
    <AppShell>
      <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-4 sm:mb-6">
        <div className="px-3 sm:px-4 py-4 sm:py-5">
          <h3 className="text-base sm:text-lg leading-6 font-medium text-gray-900">Customer Support</h3>
          <p className="mt-1 max-w-2xl text-xs sm:text-sm text-gray-500">
            Contact our support team for assistance with your solar installation
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-2 sm:px-0">

        <div className="bg-white shadow sm:rounded-lg overflow-hidden">
          {/* <div className="px-3 sm:px-4 py-3 sm:py-4 md:py-5 border-b border-gray-200">
            <h3 className="text-sm sm:text-base md:text-lg leading-6 font-medium text-gray-900">Contact Support</h3>
            <p className="mt-0.5 sm:mt-1 max-w-2xl text-xs sm:text-sm text-gray-500">
              Choose your preferred way to reach our customer care team
            </p>
          </div> */}
          <div className="px-2 sm:px-3 md:px-4 py-4 sm:py-5 md:py-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
              {/* Email Button */}
              <a 
                href="mailto:customercare@aveyo.com" 
                className="flex flex-col items-center justify-center p-3 sm:p-4 md:p-6 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="rounded-full bg-blue-100 p-1.5 sm:p-2 md:p-3 mb-2 sm:mb-3 md:mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-sm sm:text-base md:text-lg font-medium text-gray-900">Email Us</h3>
                <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-gray-500">customercare@aveyo.com</p>
                <span className="mt-2 sm:mt-3 md:mt-4 inline-flex items-center px-2.5 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 border border-transparent text-xs font-medium rounded-md shadow-sm text-white brand-button">
                  Send Email
                </span>
              </a>
              
              {/* Phone Call Button */}
              <a 
                href="tel:3854693838" 
                className="flex flex-col items-center justify-center p-3 sm:p-4 md:p-6 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="rounded-full bg-blue-100 p-1.5 sm:p-2 md:p-3 mb-2 sm:mb-3 md:mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <h3 className="text-sm sm:text-base md:text-lg font-medium text-gray-900">Call Us</h3>
                <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-gray-500">(385) 469-3838</p>
                <span className="mt-2 sm:mt-3 md:mt-4 inline-flex items-center px-2.5 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 border border-transparent text-xs font-medium rounded-md shadow-sm text-white brand-button">
                  Call Now
                </span>
              </a>
              
              {/* Text Message Button */}
              {/* <a 
                href="sms:3854693838" 
                className="flex flex-col items-center justify-center p-3 sm:p-4 md:p-6 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="rounded-full bg-blue-100 p-1.5 sm:p-2 md:p-3 mb-2 sm:mb-3 md:mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <h3 className="text-sm sm:text-base md:text-lg font-medium text-gray-900">Text Us</h3>
                <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-gray-500">(385) 469-3838</p>
                <span className="mt-2 sm:mt-3 md:mt-4 inline-flex items-center px-2.5 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 border border-transparent text-xs font-medium rounded-md shadow-sm text-white brand-button">
                  Send Text
                </span>
              </a> */}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
