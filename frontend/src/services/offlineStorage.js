import { openDB } from 'idb';

const DB_NAME = 'PharmaERP_OfflineDB';
const STORE_NAME = 'syncQueue';

export const initDB = async () => {
    return openDB(DB_NAME, 1, {
        upgrade(db) {
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                // Create an object store using 'id' as the primary key
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        },
    });
};

export const addOfflineAction = async (actionType, endpoint, payload) => {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const item = {
        id: crypto.randomUUID(), // Automatically generates a unique v4 UUID
        action: actionType,
        endpoint,
        payload,
        timestamp: Date.now(),
        status: 'PENDING'
    };
    
    await tx.store.add(item);
    await tx.done;
    return item;
};

export const getPendingActions = async () => {
    const db = await initDB();
    return db.getAll(STORE_NAME);
};

export const removeAction = async (id) => {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    await tx.store.delete(id);
    await tx.done;
};