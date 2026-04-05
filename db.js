
const DB_NAME = 'crewBriefDB';
const DB_VERSION = 1;
let db;

const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (e) => reject("Database error: " + e.target.errorCode);
    
    request.onupgradeneeded = (e) => {
      const localDb = e.target.result;
      if (!localDb.objectStoreNames.contains('briefs')) {
        localDb.createObjectStore('briefs', { keyPath: 'id' });
      }
      if (!localDb.objectStoreNames.contains('cities')) {
        localDb.createObjectStore('cities', { keyPath: 'DestinationICAO' });
      }
      if (!localDb.objectStoreNames.contains('syncQueue')) {
        localDb.createObjectStore('syncQueue', { keyPath: 'id' });
      }
    };

    request.onsuccess = (e) => {
      db = e.target.result;
      resolve(db);
    };
  });
};

const dbOp = (storeName, mode, operation) => {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    const request = operation(store);
    
    transaction.oncomplete = () => resolve(request.result);
    transaction.onerror = () => reject(transaction.error);
  });
};

const DB = {
  // Store methods
  put: (storeName, data) => dbOp(storeName, 'readwrite', s => s.put(data)),
  getAll: (storeName) => dbOp(storeName, 'readonly', s => s.getAll()),
  get: (storeName, key) => dbOp(storeName, 'readonly', s => s.get(key)),
  delete: (storeName, key) => dbOp(storeName, 'readwrite', s => s.delete(key)),
  clear: (storeName) => dbOp(storeName, 'readwrite', s => s.clear()),
  
  // Specific app methods
  queueSyncItem: async (action, data) => {
    const item = { id: Date.now().toString(), action, data, timestamp: new Date().getTime() };
    await DB.put('syncQueue', item);
  }
};
