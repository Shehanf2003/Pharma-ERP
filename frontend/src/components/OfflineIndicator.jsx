import React, { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';

const OfflineIndicator = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-pulse">
      <WifiOff size={20} />
      <span className="text-sm font-medium">You are offline. Showing cached data.</span>
    </div>
  );
};

export default OfflineIndicator;
