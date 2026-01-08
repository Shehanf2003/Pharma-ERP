import React, { useEffect, useState } from 'react';
import axios from 'axios';

const ModulePage = ({ name, endpoint }) => {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true); // Added loading state for better UX

  useEffect(() => {
    const fetchData = async () => {
      // Reset states when endpoint changes
      setLoading(true);
      setError('');
      setMessage('');

      try {
        // Artificial delay to show off the loading state (remove in production)
        // await new Promise(resolve => setTimeout(resolve, 600)); 
        
        const res = await axios.get(endpoint);
        setMessage(res.data.message);
      } catch (err) {
        setError(err.response?.data?.message || 'Access Denied');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [endpoint]);

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-10">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="mb-8 border-b border-gray-200 pb-4">
          <h1 className="text-3xl font-bold text-gray-900">{name}</h1>
          <p className="mt-2 text-sm text-gray-500">
            Manage your {name.toLowerCase()} data and configurations here.
          </p>
        </div>

        {/* Content Card */}
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
          <div className="p-6">
            
            {/* Loading State */}
            {loading && (
              <div className="flex flex-col items-center justify-center py-12">
                <svg className="animate-spin h-8 w-8 text-blue-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-gray-500 text-sm font-medium">Loading {name} data...</p>
              </div>
            )}

            {/* Success Alert */}
            {!loading && message && (
              <div className="rounded-md bg-green-50 p-4 border-l-4 border-green-500">
                <div className="flex">
                  <div className="flex-shrink-0">
                    {/* Check Circle Icon */}
                    <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800">Request Successful</h3>
                    <div className="mt-1 text-sm text-green-700">
                      {message}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Error Alert */}
            {!loading && error && (
              <div className="rounded-md bg-red-50 p-4 border-l-4 border-red-500">
                <div className="flex">
                  <div className="flex-shrink-0">
                    {/* X Circle Icon */}
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Error Loading Module</h3>
                    <div className="mt-1 text-sm text-red-700">
                      {error}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Placeholder for future content when no messages exist */}
            {!loading && !message && !error && (
               <div className="text-center py-12 text-gray-400">
                  No data available for this module yet.
               </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModulePage;
