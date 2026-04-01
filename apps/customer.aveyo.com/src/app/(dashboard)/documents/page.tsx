'use client';

import { useState, useEffect } from 'react';
import AppShell from '@/components/layout/AppShell';
import { supabase } from '@/lib/supabase/client';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Document } from '@/types';

// Types are now imported from @/types

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
      
      if (data.user && data.user.email) {
        fetchDocuments();
      } else {
        setLoading(false);
      }
    };

    getUser();
  }, []);

  const fetchDocuments = async () => {
    try {
      // Fetch documents via API route
      const response = await fetch('/api/documents');
      
      if (!response.ok) {
        throw new Error('Failed to fetch documents');
      }
      
      const docs = await response.json();
      setDocuments(docs);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  // Group documents by project
  const documentsByProject = documents.reduce((acc, doc) => {
    if (!acc[doc.project_id]) {
      acc[doc.project_id] = {
        project_name: doc.project_name,
        documents: [],
      };
    }
    acc[doc.project_id].documents.push(doc);
    return acc;
  }, {} as Record<string, { project_name: string; documents: Document[] }>);

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return (
          <svg className="w-6 h-6 text-red-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
          </svg>
        );
      case 'image':
        return (
          <svg className="w-6 h-6 text-blue-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <svg className="w-6 h-6 text-gray-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  return (
    <AppShell>
      <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-4 sm:mb-6">
        <div className="px-3 sm:px-4 py-4 sm:py-5">
          <h3 className="text-base sm:text-lg leading-6 font-medium text-gray-900">Project Documents</h3>
          <p className="mt-1 max-w-2xl text-xs sm:text-sm text-gray-500">
            Access and download important files related to your solar installation
          </p>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner size="large" className="py-12" />
      ) : (
        <div className="space-y-8">
          {Object.entries(documentsByProject).map(([projectId, { project_name, documents }]) => (
            <div key={projectId} className="bg-white shadow sm:rounded-lg overflow-hidden">
              <div className="px-3 sm:px-4 py-3 sm:py-5 border-b border-gray-200">
                <h3 className="text-base sm:text-lg leading-6 font-medium text-gray-900">{project_name}</h3>
              </div>
              <ul className="divide-y divide-gray-200">
                {documents.map((doc) => (
                  <li key={doc.id} className="px-3 sm:px-4 py-3 sm:py-4 hover:bg-gray-50">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 mr-2 sm:mr-3">
                          {getFileIcon(doc.type)}
                        </div>
                        <div>
                          <div className="text-xs sm:text-sm font-medium text-blue-600 line-clamp-1">{doc.name}</div>
                          <div className="text-xs sm:text-sm text-gray-500 line-clamp-1">{doc.description}</div>
                          <div className="mt-1 flex items-center text-xs text-gray-400">
                            <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                            <span className="mx-1">•</span>
                            <span>{doc.size}</span>
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="inline-flex items-center justify-center w-full sm:w-auto px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 mt-2 sm:mt-0"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
