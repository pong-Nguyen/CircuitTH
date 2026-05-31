import type { SimConfig } from '../components/Toolbar';
import type { CircuitComponent, CircuitDocument, Wire } from '../types';

const DB_NAME = 'circuitth-local-db';
const DB_VERSION = 1;
const STORE = 'circuits';
const ACTIVE_KEY = 'circuitth.activeCircuitId';

export type StoredCircuit = Omit<CircuitDocument, 'simConfig'> & {
  simConfig: SimConfig;
};

export interface CircuitPayload {
  components: CircuitComponent[];
  wires: Wire[];
  simConfig: SimConfig;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('updatedAt', 'updatedAt');
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function tx<T>(
  db: IDBDatabase,
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, mode);
    const request = run(transaction.objectStore(STORE));

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function listCircuits(): Promise<StoredCircuit[]> {
  const db = await openDb();
  try {
    const items = await tx<StoredCircuit[]>(db, 'readonly', store => store.getAll());
    return items.sort((a, b) => b.updatedAt - a.updatedAt);
  } finally {
    db.close();
  }
}

export async function saveCircuit(circuit: StoredCircuit): Promise<void> {
  const db = await openDb();
  try {
    await tx<IDBValidKey>(db, 'readwrite', store => store.put(circuit));
    localStorage.setItem(ACTIVE_KEY, circuit.id);
  } finally {
    db.close();
  }
}

export async function deleteCircuit(id: string): Promise<void> {
  const db = await openDb();
  try {
    await tx<undefined>(db, 'readwrite', store => store.delete(id));
    if (localStorage.getItem(ACTIVE_KEY) === id) localStorage.removeItem(ACTIVE_KEY);
  } finally {
    db.close();
  }
}

export function createCircuit(name: string, payload: CircuitPayload): StoredCircuit {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    name,
    components: payload.components,
    wires: payload.wires,
    simConfig: payload.simConfig,
    createdAt: now,
    updatedAt: now,
  };
}

export function getActiveCircuitId() {
  return localStorage.getItem(ACTIVE_KEY);
}
