import { openDB } from 'idb';

const DB_NAME = 'pos-db';
const DB_VERSION = 1;

export const initDB = async () => {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('products')) {
        db.createObjectStore('products', { keyPath: '_id' });
      }
      if (!db.objectStoreNames.contains('pendingSales')) {
        db.createObjectStore('pendingSales', { keyPath: 'id', autoIncrement: true });
      }
    },
  });
};

export const cacheProducts = async (products) => {
  const db = await initDB();
  const tx = db.transaction('products', 'readwrite');
  await tx.store.clear();
  for (const product of products) {
    await tx.store.put(product);
  }
  await tx.done;
};

export const getCachedProducts = async () => {
  const db = await initDB();
  return db.getAll('products');
};

export const savePendingSale = async (sale) => {
  const db = await initDB();
  return db.add('pendingSales', { ...sale, timestamp: Date.now() });
};

export const getPendingSales = async () => {
  const db = await initDB();
  return db.getAll('pendingSales');
};

export const removePendingSale = async (id) => {
    const db = await initDB();
    return db.delete('pendingSales', id);
};
