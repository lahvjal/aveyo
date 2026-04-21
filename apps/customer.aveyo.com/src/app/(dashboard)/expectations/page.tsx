'use client';

import { useEffect } from 'react';

export default function ExpectationsPage() {
  // Smooth scroll to anchor on page load
  useEffect(() => {
    if (window.location.hash) {
      const element = document.querySelector(window.location.hash);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    }
  }, []);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-[var(--customer-color-text-primary)] mb-2">
          Aveyo Install Customer Expectations
        </h2>
        <p className="text-[var(--customer-color-text-subtle)]">
          We are excited to welcome you to the Aveyo family. Below is a list of expectations that we have from you to ensure you have a smooth installation experience. Feel free to contact your sales representative or our corporate customer care team if you have any questions or concerns. Our team is available between 8:00 AM - 4:00 PM CST and can be reached at{' '}
          <a href="tel:+13854693838" className="text-brand-blue font-semibold">
            (385) 469-3838
          </a>
          .
        </p>
      </div>

      <section id="installation-expectations" className="mb-12 scroll-mt-6">
        <div className="customer-panel border-l-4 border-[var(--customer-color-action)] p-6">
            <div className="flex items-start mb-4">
              <span className="text-3xl mr-3">🏡</span>
              <h3 className="text-2xl font-bold text-[var(--customer-color-text-primary)]">
                Before and During Installation
              </h3>
            </div>

            <div className="space-y-4">
              <div className="flex items-start">
                <div className="flex-shrink-0 mt-1">
                  <div className="h-2 w-2 rounded-full bg-[var(--customer-color-action)]"></div>
                </div>
                <div className="ml-4">
                  <h3 className="font-semibold text-[var(--customer-color-text-primary)] mb-1">Be Home for Day 1 Walkthrough</h3>
                  <p className="text-[var(--customer-color-text-subtle)]">
                    Homeowner is required to be home upon crew arrival on day 1 for walk through with the installer to ensure accurate expectations and game plan for installation. Please plan to be home when our crew arrives on the first day. We'll do a quick walkthrough together to confirm details and align on the installation plan.
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex-shrink-0 mt-1">
                  <div className="h-2 w-2 rounded-full bg-[var(--customer-color-action)]"></div>
                </div>
                <div className="ml-4">
                  <h3 className="font-semibold text-[var(--customer-color-text-primary)] mb-1">Access to Key Areas</h3>
                  <p className="text-[var(--customer-color-text-subtle)]">
                    The crew will need access to attic and main service panel. The installation team will need access to your attic and main electrical service panel.
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex-shrink-0 mt-1">
                  <div className="h-2 w-2 rounded-full bg-[var(--customer-color-action)]"></div>
                </div>
                <div className="ml-4">
                  <h3 className="font-semibold text-[var(--customer-color-text-primary)] mb-1">Temporary Power Outage</h3>
                  <p className="text-[var(--customer-color-text-subtle)]">
                    Homeowner will be without power for approximately 2-4 hours if any electrical upgrades are required OR if we are doing a whole home battery backup. If electrical upgrades or a whole-home battery backup are part of your project, your power may be off for approximately 2–4 hours.
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex-shrink-0 mt-1">
                  <div className="h-2 w-2 rounded-full bg-[var(--customer-color-action)]"></div>
                </div>
                <div className="ml-4">
                  <h3 className="font-semibold text-[var(--customer-color-text-primary)] mb-1">Private Lines</h3>
                  <p className="text-[var(--customer-color-text-subtle)] mb-2">
                    Any private lines must be marked by the homeowner prior to installation. 811 does not mark private lines. Please mark any private utility lines before installation. (Note: 811 does not mark private lines.)
                  </p>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mt-2">
                    <p className="text-sm text-[var(--customer-color-text-subtle)]">
                      <strong>Important:</strong> If you have private lines that are not marked, please call Aveyo customer care at{' '}
                      <a href="tel:+13854693838" className="text-brand-blue font-semibold">
                        (385) 469-3838
                      </a>
                    </p>
                  </div>
                </div>
              </div>
            </div>
        </div>
      </section>

      <section id="delivery-site-prep" className="mb-12 scroll-mt-6">
        <div className="customer-panel border-l-4 border-green-600 p-6">
            <div className="flex items-start mb-4">
              <span className="text-3xl mr-3">📦</span>
              <h3 className="text-2xl font-bold text-[var(--customer-color-text-primary)]">
                Delivery and Site Preparation
              </h3>
            </div>

            <div className="space-y-4">
              <div className="flex items-start">
                <div className="flex-shrink-0 mt-1">
                  <div className="h-2 w-2 rounded-full bg-green-600"></div>
                </div>
                <div className="ml-4">
                  <h3 className="font-semibold text-[var(--customer-color-text-primary)] mb-1">Equipment Delivery</h3>
                  <p className="text-[var(--customer-color-text-subtle)] mb-2">
                    Equipment will be dropped off 1-2 business day(s) prior to installation. Your equipment will be delivered one to two business days before installation.
                  </p>
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mt-2">
                    <p className="text-sm text-[var(--customer-color-text-subtle)]">
                      <strong>Note:</strong> If you have any special requests on where you want the equipment delivered, please call Aveyo customer care at{' '}
                      <a href="tel:+13854693838" className="text-brand-blue font-semibold">
                        (385) 469-3838
                      </a>
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex-shrink-0 mt-1">
                  <div className="h-2 w-2 rounded-full bg-green-600"></div>
                </div>
                <div className="ml-4">
                  <h3 className="font-semibold text-[var(--customer-color-text-primary)] mb-1">Electrical Panel Labeling</h3>
                  <p className="text-[var(--customer-color-text-subtle)]">
                    The main service electrical panel should be labeled prior to the installer doing work. This is to ensure we are backing up the right circuits for your new battery. Please make sure your main service electrical panel is labeled before installation. This helps our team confirm that your new battery back up system, (if applicable) provides power to back up the correct circuits.
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex-shrink-0 mt-1">
                  <div className="h-2 w-2 rounded-full bg-green-600"></div>
                </div>
                <div className="ml-4">
                  <h3 className="font-semibold text-[var(--customer-color-text-primary)] mb-1">Clear Work Areas</h3>
                  <p className="text-[var(--customer-color-text-subtle)]">
                    The main service electrical panel and utility meter area must be cleared of any debris to ensure a clean and safe working environment. The space around your main service panel and utility meter should be free of debris to provide a safe, clean work area for our crew.
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex-shrink-0 mt-1">
                  <div className="h-2 w-2 rounded-full bg-green-600"></div>
                </div>
                <div className="ml-4">
                  <h3 className="font-semibold text-[var(--customer-color-text-primary)] mb-1">Placards</h3>
                  <p className="text-[var(--customer-color-text-subtle)]">
                    In the event that placards and/or labels are delivered to you, please ensure that they are available for crew on the day of installation. If any placards (labels) are delivered to you ahead of time, please have them available for the crew on installation day.
                  </p>
                </div>
              </div>
            </div>
        </div>
      </section>

      <section id="need-help" className="mb-12 scroll-mt-6">
        <div className="rounded-[var(--customer-radius-card)] bg-gradient-to-r from-[var(--customer-color-action)] to-[var(--customer-color-action-hover)] p-8 text-white shadow-[var(--customer-shadow-panel)]">
            <div className="flex items-start mb-4">
              <span className="text-4xl mr-3">💬</span>
              <h3 className="text-2xl font-bold">Need Help?</h3>
            </div>

            <p className="text-lg mb-6">
              We're here for you every step of the way!
            </p>

            <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-6 mb-6">
              <div className="flex items-center space-x-3">
                <svg
                  className="w-8 h-8 flex-shrink-0"
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
                  <p className="text-xl font-bold mb-1">
                    Aveyo Customer Care:{' '}
                    <a href="tel:+13854693838" className="hover:underline">
                      (385) 469-3838
                    </a>
                  </p>
                  <p className="text-sm opacity-90">
                    Hours: Monday – Friday, 8:00 AM – 4:00 PM CST
                  </p>
                </div>
              </div>
            </div>

            <p className="text-base">
              If you have any questions before or during installation, don't hesitate to reach out. We can't wait to bring clean, reliable energy to your home — thank you for choosing Aveyo!
            </p>
        </div>
      </section>
    </div>
  );
}

