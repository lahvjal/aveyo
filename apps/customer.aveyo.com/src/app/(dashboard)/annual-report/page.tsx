'use client';

import { useState } from 'react';
import '@/styles/brand-colors.css';
import Image from 'next/image';

export default function AnnualReportPage() {
  const [isDownloading, setIsDownloading] = useState(false);

  // Placeholder data - will be replaced with real data later
  const reportData = {
    customerName: 'Donny',
    year: 2026,
    address: '3997 N 420 E',
    city: 'Provo',
    state: 'Utah',
    zip: '84604',
    energyProduced: '3,646',
    systemActivationYear: 2024,
    yearsAsCustomer: 2026 - 2024,
  };

  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    
    // TODO: Implement PDF generation
    // For now, we'll use browser's print functionality
    setTimeout(() => {
      window.print();
      setIsDownloading(false);
    }, 500);
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8 print-wrapper">
        {/* Print styles */}
        <style jsx global>{`
          @media print {
            /* Hide all navigation, headers, and UI chrome */
            header,
            nav,
            aside,
            button:not(.report-container button),
            .no-print,
            .customer-shell-sidebar,
            .customer-shell-topbar,
            .customer-shell-mobile-nav,
            [role="navigation"],
            [aria-label*="navigation"],
            [aria-label*="Navigation"] {
              display: none !important;
              visibility: hidden !important;
            }
            
            /* Reset page styles for clean print */
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            
            body {
              background: white !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            
            html, body {
              width: 100% !important;
              height: auto !important;
            }
            
            /* Only show the print wrapper and its contents */
            .print-wrapper {
              background: white !important;
              padding: 0 !important;
              margin: 0 !important;
              min-height: auto !important;
              display: block !important;
            }
            
            /* Report container - the actual report - COMPACT FOR 1 PAGE */
            .report-container {
              box-shadow: none !important;
              max-width: 100% !important;
              width: 100% !important;
              margin: 0 auto !important;
              padding: 20px 30px !important;
              border: none !important;
              border-radius: 0 !important;
              background: white !important;
              font-size: 11px !important;
            }
            
            /* Compact header */
            .report-container > div:first-child {
              padding: 15px 20px !important;
              margin-bottom: 0 !important;
            }
            
            /* Compact logo */
            .report-container img[alt="Aveyo Logo"] {
              width: 100px !important;
              height: auto !important;
            }
            
            /* Content padding - reduce spacing */
            .report-container > div:nth-child(2) {
              padding: 15px 20px !important;
            }
            
            /* Greeting - compact */
            .report-container h1 {
              font-size: 24px !important;
              margin-bottom: 8px !important;
            }
            
            .report-container h1 + p {
              font-size: 14px !important;
              margin-bottom: 0 !important;
            }
            
            /* All section margins - reduce */
            .report-container .mb-10 {
              margin-bottom: 15px !important;
            }
            
            .report-container .mb-8 {
              margin-bottom: 12px !important;
            }
            
            /* Address section - compact */
            .report-container .p-6 {
              padding: 10px !important;
            }
            
            .report-container .p-8 {
              padding: 12px !important;
            }
            
            /* Energy production highlight - compact */
            .report-container .py-12 {
              padding-top: 15px !important;
              padding-bottom: 15px !important;
            }
            
            .report-container .text-6xl,
            .report-container .text-7xl {
              font-size: 36px !important;
              margin-bottom: 5px !important;
            }
            
            .report-container .text-2xl {
              font-size: 16px !important;
            }
            
            .report-container .text-xl {
              font-size: 14px !important;
            }
            
            .report-container .text-lg {
              font-size: 12px !important;
            }
            
            /* Section headings */
            .report-container h2 {
              font-size: 16px !important;
              margin-bottom: 10px !important;
            }
            
            /* Environmental cards - compact */
            .report-container .grid {
              gap: 10px !important;
            }
            
            /* Environmental impact - ensure 2 column layout on print */
            .report-container .sm\\:grid-cols-2.max-w-2xl {
              grid-template-columns: repeat(2, 1fr) !important;
              max-width: 100% !important;
            }
            
            .report-container .text-4xl {
              font-size: 24px !important;
              margin-bottom: 5px !important;
            }
            
            .report-container .text-3xl {
              font-size: 20px !important;
              margin-bottom: 5px !important;
            }
            
            /* System details grid - make horizontal on print */
            .report-container .gap-4 {
              gap: 8px !important;
            }
            
            .report-container .grid-cols-1,
            .report-container .sm\\:grid-cols-2 {
              grid-template-columns: repeat(4, 1fr) !important;
            }
            
            /* Text sizes */
            .report-container .text-sm {
              font-size: 10px !important;
            }
            
            .report-container .text-xs {
              font-size: 9px !important;
            }
            
            .report-container .text-base {
              font-size: 11px !important;
            }
            
            /* Footer - compact */
            .report-container > div:last-child {
              padding: 12px 20px !important;
              font-size: 9px !important;
            }
            
            /* Chart placeholder - reduce height */
            .report-container .h-64 {
              height: 120px !important;
            }
            
            /* Signature section */
            .report-container .pt-10 {
              padding-top: 15px !important;
            }
            
            .report-container .mb-6 {
              margin-bottom: 10px !important;
            }
            
            /* Optimize print layout for 1 page */
            @page {
              margin: 0.4in 0.5in;
              size: letter portrait;
            }
            
            /* Prevent page breaks */
            .report-container,
            .report-container > * {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            
            /* Ensure images print properly */
            .report-container img {
              max-width: 100% !important;
            }
          }
        `}</style>

        {/* Report Container */}
        <div className="report-container max-w-4xl mx-auto bg-white shadow-lg rounded-xl overflow-hidden border border-gray-200">
          {/* Header with Logo */}
          <div className="bg-gradient-to-r from-gray-800 to-gray-900 p-8">
            <div className="flex items-center justify-between">
              <div className="bg-white p-3 rounded-lg">
                <Image
                  src="/aveyo-logo.svg"
                  alt="Aveyo Logo"
                  width={140}
                  height={30}
                  priority
                />
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-300 font-medium">Annual Solar Report</p>
                <p className="text-3xl font-bold text-white">{reportData.year}</p>
              </div>
            </div>
          </div>

          {/* Letter Content */}
          <div className="p-8 sm:p-12">
            {/* Greeting */}
            <div className="mb-10">
              <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-3">
                Hi {reportData.customerName},
              </h1>
              <p className="text-xl sm:text-2xl text-gray-700 leading-relaxed">
                Your {reportData.year} solar value report is here
              </p>
            </div>

            {/* Address Section */}
            <div className="mb-10 p-6 bg-gray-50 rounded-xl border-2 border-gray-200">
              <p className="text-xs text-gray-600 uppercase tracking-wide font-semibold mb-2">
                Installation Address
              </p>
              <p className="text-lg font-semibold text-gray-900">
                {reportData.address}
              </p>
              <p className="text-lg font-semibold text-gray-900">
                {reportData.city}, {reportData.state} {reportData.zip}
              </p>
            </div>

            {/* Energy Production Highlight */}
            <div className="mb-10">
              <div className="text-center py-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl shadow-md">
                <p className="text-lg sm:text-xl mb-4 text-white font-medium">
                  Your system produced
                </p>
                <p className="text-6xl sm:text-7xl font-bold mb-3 text-white">
                  {reportData.energyProduced}
                </p>
                <p className="text-2xl sm:text-3xl font-semibold text-white">
                  kWh of energy in {reportData.year}
                </p>
              </div>
            </div>

            {/* Environmental Impact Stats */}
            <div className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Environmental Impact</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
                <div className="text-center p-6 bg-white rounded-xl border-2 border-gray-200 hover:border-blue-400 transition-colors">
                  <div className="text-4xl mb-3">🌳</div>
                  <p className="text-3xl font-bold text-gray-900 mb-1">42</p>
                  <p className="text-sm font-medium text-gray-700">Trees Planted Equivalent</p>
                </div>
                <div className="text-center p-6 bg-white rounded-xl border-2 border-gray-200 hover:border-blue-400 transition-colors">
                  <div className="text-4xl mb-3">💨</div>
                  <p className="text-3xl font-bold text-gray-900 mb-1">2.8</p>
                  <p className="text-sm font-medium text-gray-700">Tons CO₂ Offset</p>
                </div>
              </div>
            </div>

            {/* Thank You Message */}
            <div className="mb-10 p-8 bg-gray-50 rounded-xl border-2 border-gray-200">
              <p className="text-lg text-gray-800 leading-relaxed">
                Your system was turned on in <span className="font-bold text-blue-600">{reportData.systemActivationYear}</span>. 
                We appreciate you as an Aveyo customer and thank you for your trust in us over the past{' '}
                <span className="font-bold text-blue-600">{reportData.yearsAsCustomer} years</span>.
              </p>
            </div>

            {/* Monthly Production Chart Placeholder */}
            <div className="mb-10 no-print">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Monthly Production Overview
              </h2>
              <div className="bg-white rounded-xl p-8 border-2 border-dashed border-gray-300">
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <div className="text-6xl mb-4">📊</div>
                    <p className="text-gray-600 font-medium">Production chart coming soon</p>
                  </div>
                </div>
              </div>
            </div>

            {/* System Information */}
            <div className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">System Details</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-6 bg-white border-2 border-gray-200 rounded-xl hover:border-blue-400 transition-colors">
                  <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">System Size</p>
                  <p className="text-2xl font-bold text-gray-900">8.5 kW</p>
                </div>
                <div className="p-6 bg-white border-2 border-gray-200 rounded-xl hover:border-blue-400 transition-colors">
                  <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">Panel Count</p>
                  <p className="text-2xl font-bold text-gray-900">24 Panels</p>
                </div>
                <div className="p-6 bg-white border-2 border-gray-200 rounded-xl hover:border-blue-400 transition-colors">
                  <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">Lifetime Production</p>
                  <p className="text-2xl font-bold text-gray-900">7,892 kWh</p>
                </div>
                <div className="p-6 bg-white border-2 border-gray-200 rounded-xl hover:border-blue-400 transition-colors">
                  <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">System Efficiency</p>
                  <p className="text-2xl font-bold text-gray-900">94.2%</p>
                </div>
              </div>
            </div>

            {/* Signature */}
            <div className="mb-10 pt-10 border-t-2 border-gray-200">
              <p className="text-lg text-gray-700 mb-8 leading-relaxed">
                Thank you for being a valued member of the Aveyo family. Together, we're building a sustainable future.
              </p>
              <div>
                <p className="text-2xl font-bold text-gray-900 mb-1">The Aveyo Team</p>
                <p className="text-base text-gray-600 font-medium">Solar Energy Solutions</p>
              </div>
            </div>

            {/* Download CTA */}
            <div className="no-print text-center pt-8 pb-4 border-t-2 border-gray-200">
              <button
                onClick={handleDownloadPDF}
                disabled={isDownloading}
                className="inline-flex items-center px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white text-lg font-semibold rounded-xl shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDownloading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Preparing Download...
                  </>
                ) : (
                  <>
                    <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download Report as PDF
                  </>
                )}
              </button>
              <p className="mt-4 text-sm text-gray-600 font-medium">
                Save your annual report for your records
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-900 text-white p-8 text-center">
            <p className="mb-2 font-semibold">© {reportData.year} Aveyo Solar. All rights reserved.</p>
            <p className="text-gray-400">
              Questions about your report? Contact us at <span className="text-blue-400 font-medium">support@aveyo.com</span>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
