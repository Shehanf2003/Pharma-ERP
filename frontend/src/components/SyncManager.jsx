import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { getPendingActions, removeAction } from '../services/offlineStorage';

const SyncManager = () => {
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncError, setSyncError] = useState(null);

    useEffect(() => {
        const handleOnline = async () => {
            console.log('Network connected. Checking for offline data to sync...');
            await processSyncQueue();
        };

        // Listen for the browser's native 'online' event
        window.addEventListener('online', handleOnline);
        
        // Run on mount just in case there are pending items from a previous closed session
        if (navigator.onLine) {
            processSyncQueue();
        }

        return () => window.removeEventListener('online', handleOnline);
    }, []);

    const processSyncQueue = async () => {
        setIsSyncing(true);
        setSyncError(null);
        
        try {
            const pendingActions = await getPendingActions();
            if (pendingActions.length === 0) {
                setIsSyncing(false);
                return;
            }

            // Sort by timestamp to ensure chronological execution
            const sortedActions = pendingActions.sort((a, b) => a.timestamp - b.timestamp);

            for (const item of sortedActions) {
                try {
                    // Dynamically process the saved HTTP request
                    await axios.post(item.endpoint, item.payload);
                    // Remove from IndexedDB if successful
                    await removeAction(item.id);
                } catch (error) {
                    console.error(`Failed to sync action ${item.id}:`, error);
                    const serverMessage = error.response?.data?.message || 'Server error';
                    setSyncError(`Sync Error: Failed to sync ${item.action}. ${serverMessage}`);
                    // Break the loop on the first failure to prevent subsequent transactions from running out-of-order
                    break; 
                }
            }
        } catch (error) {
            console.error('Error processing sync queue:', error);
        } finally {
            setIsSyncing(false);
        }
    };

    // Renders nothing visually unless there's an active sync or an error
    if (!isSyncing && !syncError) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50 p-4 rounded shadow-lg text-white font-medium" 
             style={{ backgroundColor: syncError ? '#ef4444' : '#10b981' }}>
            {isSyncing && <span>🔄 Syncing offline data...</span>}
            {syncError && (
                <div className="flex flex-col gap-2">
                    <span>⚠️ {syncError}</span>
                    <button onClick={() => setSyncError(null)} className="underline text-sm self-end">
                        Dismiss
                    </button>
                </div>
            )}
        </div>
    );
};

export default SyncManager;