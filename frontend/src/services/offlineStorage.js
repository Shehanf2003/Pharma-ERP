import { openDB } from 'idb';

const DB_NAME = 'pharma-erp-db';
const DB_VERSION = 1;

export const initDB = async () => {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Store for pending sales (offline queue)
      if (!db.objectStoreNames.contains('pendingSales')) {
        db.createObjectStore('pendingSales', { keyPath: 'id', autoIncrement: true });
      }
      // Store for caching customers (optional, for offline search)
      if (!db.objectStoreNames.contains('cachedCustomers')) {
        db.createObjectStore('cachedCustomers', { keyPath: '_id' });
      }
    },
  });
};

export const saveOfflineSale = async (saleData) => {
  const db = await initDB();
  const id = await db.add('pendingSales', {
    ...saleData,
    createdAt: new Date().toISOString(),
    status: 'PENDING'
  });
  return id;
};

export const getPendingSales = async () => {
  const db = await initDB();
  return db.getAll('pendingSales');
};

export const removePendingSale = async (id) => {
  const db = await initDB();
  return db.delete('pendingSales', id);
};
