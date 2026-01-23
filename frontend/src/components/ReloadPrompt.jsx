import React, { useState, useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import toast from 'react-hot-toast';

function ReloadPrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered: ' + r);
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
  });

  useEffect(() => {
    if (offlineReady) {
      toast.success('App is ready to work offline');
      setOfflineReady(false);
    }
  }, [offlineReady, setOfflineReady]);

  useEffect(() => {
    if (needRefresh) {
      toast((t) => (
        <div className="flex flex-col gap-2">
          <span>New content available, click on reload button to update.</span>
          <button
            className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 transition-colors"
            onClick={() => {
              updateServiceWorker(true);
              toast.dismiss(t.id);
            }}
          >
            Reload
          </button>
          <button
            className="text-gray-500 text-xs hover:text-gray-700"
            onClick={() => {
              setNeedRefresh(false);
              toast.dismiss(t.id);
            }}
          >
            Close
          </button>
        </div>
      ), { duration: Infinity });
    }
  }, [needRefresh, updateServiceWorker, setNeedRefresh]);

  return null;
}

export default ReloadPrompt;
