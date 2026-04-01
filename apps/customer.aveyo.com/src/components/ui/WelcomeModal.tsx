'use client';

import { useEffect } from 'react';
import Link from 'next/link';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WelcomeModal({ isOpen, onClose }: WelcomeModalProps) {
  // Handle Escape key press
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent background scrolling when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#00000069] backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close modal"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* Modal content */}
        <div className="p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <img
              src="/aveyo-logo.svg"
              alt="Aveyo Logo"
              className="h-12 w-auto mx-auto mb-4"
            />
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome to the Aveyo Family!
            </h2>
          </div>

          {/* Body text */}
          <div className="text-gray-700 space-y-4 mb-8">
            <p>
              We're thrilled to have you join the Aveyo community! Our goal is to make your installation experience smooth, efficient, and stress-free. Below you'll find a few helpful reminders and expectations to ensure everything goes perfectly on installation day.
            </p>
            <p>
              If you have any questions or special requests, please don't hesitate to reach out — we're always happy to help!
            </p>

            {/* Contact info box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-5 my-6">
              <div className="flex items-start space-x-3">
                <svg
                  className="w-6 h-6 text-blue-600 mt-0.5 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  />
                </svg>
                <div>
                  <p className="font-semibold text-gray-900 mb-1">
                    Customer Care: <a href="tel:+13854693838" className="text-blue-600 hover:text-blue-700">(385) 469-3838</a>
                  </p>
                  <p className="text-sm text-gray-600">
                    Hours: Monday – Friday, 8:00 AM – 4:00 PM CST
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/expectations#installation-expectations"
              onClick={onClose}
              className="flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Installation Expectations
            </Link>
            <Link
              href="/expectations#delivery-site-prep"
              onClick={onClose}
              className="flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Delivery &amp; Site Prep
            </Link>
            <Link
              href="/expectations#need-help"
              onClick={onClose}
              className="flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Need Help?
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

