import type { SimConfig } from '../components/Toolbar';
import type { CircuitComponent, Wire } from '../types';
import type { StoredCircuit } from './circuitStorage';

const API_URL = import.meta.env.VITE_LAB_API_URL ?? 'http://localhost:4000/api';
const TOKEN_KEY = 'circuitth.labToken';

export interface LabUser {
  id: string;
  email: string;
  fullName: string;
  role: 'admin' | 'member';
}

interface CloudCircuit {
  id: string;
  name: string;
  schematic: { components: CircuitComponent[]; wires: Wire[] };
  simConfig: SimConfig;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export function hasLabToken() {
  return Boolean(localStorage.getItem(TOKEN_KEY));
}

export function logoutLab() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem(TOKEN_KEY);
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const body = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error ?? `Cloud request failed (${response.status})`);
  return body as T;
}

export async function loginLab(email: string, password: string) {
  const result = await request<{ token: string; user: LabUser }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  localStorage.setItem(TOKEN_KEY, result.token);
  return result.user;
}

export function getLabUser() {
  return request<LabUser>('/auth/me');
}

function fromCloud(circuit: CloudCircuit): StoredCircuit {
  return {
    id: circuit.id,
    name: circuit.name,
    components: circuit.schematic?.components ?? [],
    wires: circuit.schematic?.wires ?? [],
    simConfig: circuit.simConfig,
    cloudVersion: circuit.version,
    createdAt: new Date(circuit.createdAt).getTime(),
    updatedAt: new Date(circuit.updatedAt).getTime(),
  };
}

export async function listCloudCircuits() {
  const rows = await request<Array<Pick<CloudCircuit, 'id'>>>('/circuits');
  return Promise.all(rows.map(row => request<CloudCircuit>(`/circuits/${row.id}`).then(fromCloud)));
}

export async function createCloudCircuit(circuit: StoredCircuit) {
  const result = await request<CloudCircuit>('/circuits', {
    method: 'POST',
    body: JSON.stringify({
      name: circuit.name,
      projectId: null,
      schematic: { components: circuit.components, wires: circuit.wires },
      simConfig: circuit.simConfig,
    }),
  });
  return fromCloud(result);
}

export async function updateCloudCircuit(circuit: StoredCircuit) {
  if (!circuit.cloudVersion) throw new Error('Cloud version is missing');
  const result = await request<CloudCircuit>(`/circuits/${circuit.id}`, {
    method: 'PUT',
    body: JSON.stringify({
      name: circuit.name,
      projectId: null,
      schematic: { components: circuit.components, wires: circuit.wires },
      simConfig: circuit.simConfig,
      version: circuit.cloudVersion,
    }),
  });
  return fromCloud(result);
}

export function deleteCloudCircuit(id: string) {
  return request<void>(`/circuits/${id}`, { method: 'DELETE' });
}
