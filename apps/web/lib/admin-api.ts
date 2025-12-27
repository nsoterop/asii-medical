export type ImportRun = {
  id: string;
  status: 'QUEUED' | 'RUNNING' | 'FAILED' | 'SUCCEEDED';
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  totalRows: number;
  inserted: number;
  updated: number;
  deactivated: number;
  errorCount: number;
  originalFilename?: string;
  storedPath?: string;
};

export type ImportRowError = {
  id: string;
  importRunId: string;
  rowNumber: number;
  field: string | null;
  message: string;
  createdAt: string;
};

export type ImportErrorPage = {
  items: ImportRowError[];
  page: number;
  pageSize: number;
  total: number;
  hasNext: boolean;
};

const BASE_URL = '/api';
const ADMIN_SECRET_KEY = 'adminSecret';

function getAdminSecret(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem(ADMIN_SECRET_KEY);
}

async function adminFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const secret = getAdminSecret();
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options?.headers || {}),
      'X-Admin-Secret': secret || ''
    }
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function listImportRuns() {
  return adminFetch<ImportRun[]>('/admin/imports');
}

export function getImportRun(id: string) {
  return adminFetch<ImportRun>(`/admin/imports/${id}`);
}

export function getImportErrors(id: string, page: number, pageSize: number) {
  return adminFetch<ImportErrorPage>(
    `/admin/imports/${id}/errors?page=${page}&pageSize=${pageSize}`
  );
}

export async function uploadImport(file: File) {
  const secret = getAdminSecret();
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${BASE_URL}/admin/imports`, {
    method: 'POST',
    headers: {
      'X-Admin-Secret': secret || ''
    },
    body: formData
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with ${response.status}`);
  }

  return response.json() as Promise<ImportRun>;
}

export function markImportFailed(id: string) {
  return adminFetch<ImportRun>(`/admin/imports/${id}/mark-failed`, {
    method: 'POST'
  });
}
