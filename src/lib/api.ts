import type { GraphData, GraphEdge, GraphNode, NodeType, SavedGraph, User } from '../types';

const TOKEN_KEY = 'run_neeti_token';

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable (private mode) — session lasts until reload */
  }
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/**
 * fetch() wrapper: adds the auth token and always resolves to parsed JSON,
 * turning HTML error pages / timeouts into readable messages.
 */
export async function apiFetch<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');

  let res: Response;
  try {
    res = await fetch(`/api${path}`, { ...init, headers });
  } catch {
    throw new ApiError('Could not reach the server. Check your internet connection and try again.', 0);
  }

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON response */
  }

  if (!res.ok || !data || data.success === false) {
    const fallback =
      res.status === 413 ? 'File is too large. Maximum size is 4 MB.' :
      res.status === 504 ? 'The server took too long to respond. Please try again.' :
      res.status === 429 ? 'Too many requests. Please wait a moment and try again.' :
      `Request failed (${res.status}). Please try again.`;
    throw new ApiError(data?.error || fallback, res.status);
  }
  return data as T;
}

// ─── Auth ───────────────────────────────────────────────────────────
export async function signup(input: { email: string; password: string; phone: string; age: number }) {
  const data = await apiFetch<{ token: string; user: User }>('/auth/signup', { method: 'POST', body: JSON.stringify(input) });
  setToken(data.token);
  return data.user;
}

export async function login(email: string, password: string) {
  const data = await apiFetch<{ token: string; user: User }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  setToken(data.token);
  return data.user;
}

export async function fetchCurrentUser(): Promise<User | null> {
  if (!getToken()) return null;
  try {
    return (await apiFetch<{ user: User }>('/auth/me')).user;
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) setToken(null);
    return null;
  }
}

// ─── Graph data ─────────────────────────────────────────────────────
const NODE_TYPES: NodeType[] = ['major', 'header', 'sub-topic', 'concept'];

/** Maps any saved/legacy graph shape onto the one the screens expect. */
export function toGraphData(item: SavedGraph): GraphData {
  const rawNodes: any[] = item.graph?.nodes || (item as any).nodes || [];
  const rawEdges: any[] = item.graph?.edges || (item as any).edges || [];

  const legacyType: Record<string, NodeType> = { core: 'major', minor: 'concept' };
  const nodes: GraphNode[] = rawNodes
    .filter(n => n && n.id != null && n.label)
    .map(n => ({
      id: String(n.id),
      label: String(n.label),
      type: NODE_TYPES.includes(n.type) ? n.type : legacyType[n.type] || 'concept',
      desc: n.desc || '',
      importance: Number(n.importance) || 5,
      parentId: n.parentId ?? null,
    }));

  // Old records may have several "core" nodes; keep a single root.
  const roots = nodes.filter(n => n.type === 'major');
  roots.slice(1).forEach(n => (n.type = 'header'));
  if (roots.length === 0 && nodes.length > 0) nodes[0].type = 'major';

  const ids = new Set(nodes.map(n => n.id));
  const edges: GraphEdge[] = rawEdges
    .map(e => ({
      source: String(e.source?.id ?? e.source ?? e.from),
      target: String(e.target?.id ?? e.target ?? e.to),
      label: e.label,
      importance: Number(e.importance) || 5,
    }))
    .filter(e => ids.has(e.source) && ids.has(e.target) && e.source !== e.target);

  return {
    id: item.id || item._id,
    nodes,
    edges,
    metadata: item.metadata || {},
    filename: item.filename || 'document.pdf',
    fallbackUsed: item.fallbackUsed,
  };
}
