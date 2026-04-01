'use client';

import { useEffect, useState } from 'react';

// Simple analytics dashboard component for development
export default function AnalyticsDashboard() {
  const [isVisible, setIsVisible] = useState(false);
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    // Only show in development
    if (process.env.NODE_ENV !== 'development') return;

    // Listen for analytics events (this is a simple implementation)
    const originalTrack = console.log;
    const eventLog: any[] = [];

    // Override console.log to capture analytics events
    console.log = (...args) => {
      if (args[0] && typeof args[0] === 'string' && args[0].includes('Analytics:')) {
        eventLog.push({
          timestamp: new Date().toISOString(),
          event: args[1],
          data: args[2]
        });
        setEvents([...eventLog]);
      }
      originalTrack.apply(console, args);
    };

    return () => {
      console.log = originalTrack;
    };
  }, []);

  if (process.env.NODE_ENV !== 'development') return null;

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="fixed bottom-4 right-4 z-50 bg-blue-600 text-white p-2 rounded-full shadow-lg hover:bg-blue-700"
        title="Toggle Analytics Dashboard"
      >
        📊
      </button>

      {/* Analytics panel */}
      {isVisible && (
        <div className="fixed bottom-16 right-4 w-80 h-96 bg-white border border-gray-300 rounded-lg shadow-xl z-50 overflow-hidden">
          <div className="bg-blue-600 text-white p-3 flex justify-between items-center">
            <h3 className="font-semibold">Analytics Events</h3>
            <button
              onClick={() => setEvents([])}
              className="text-xs bg-blue-700 px-2 py-1 rounded"
            >
              Clear
            </button>
          </div>
          
          <div className="p-3 h-full overflow-y-auto">
            {events.length === 0 ? (
              <p className="text-gray-500 text-sm">No events tracked yet</p>
            ) : (
              <div className="space-y-2">
                {events.slice(-10).reverse().map((event, index) => (
                  <div key={index} className="text-xs border-b border-gray-200 pb-2">
                    <div className="font-medium text-blue-600">{event.event}</div>
                    <div className="text-gray-600">{new Date(event.timestamp).toLocaleTimeString()}</div>
                    {event.data && (
                      <div className="text-gray-500 mt-1">
                        {JSON.stringify(event.data, null, 2)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
