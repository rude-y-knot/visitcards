import type { CompanySettings, Employee } from '../types';

let memoryAuthToken: string | null = null;
let onUnauthorizedHandler: (() => void) | null = null;

export function setAuthToken(token: string | null): void {
  memoryAuthToken = token;
}

export function getAuthToken(): string | null {
  return memoryAuthToken;
}

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorizedHandler = handler;
}

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function requestJson<T>(
  path: string,
  options: RequestInit & { auth?: boolean } = {}
): Promise<T> {
  const { auth = false, headers, ...rest } = options;
  const reqHeaders = new Headers(headers);

  if (rest.body && !reqHeaders.has('Content-Type')) {
    reqHeaders.set('Content-Type', 'application/json');
  }

  if (auth && memoryAuthToken) {
    reqHeaders.set('Authorization', `Bearer ${memoryAuthToken}`);
  }

  const res = await fetch(path, {
    ...rest,
    headers: reqHeaders,
  });

  if (res.status === 401 && auth) {
    memoryAuthToken = null;
    onUnauthorizedHandler?.();
  }

  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await res.json() : null;

  if (!res.ok) {
    const message =
      (data && typeof data.error === 'string' && data.error) ||
      `Ошибка запроса (HTTP ${res.status})`;
    throw new ApiError(message, res.status);
  }

  return data as T;
}

export const api = {
  async getAuthStatus(): Promise<{ needsSetup: boolean; authenticated: boolean }> {
    return requestJson('/api/auth/status', { auth: Boolean(memoryAuthToken) });
  },

  async setupPassword(password: string): Promise<{ token: string }> {
    const res = await requestJson<{ token: string }>('/api/auth/setup', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
    setAuthToken(res.token);
    return res;
  },

  async login(password: string): Promise<{ token: string }> {
    const res = await requestJson<{ token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
    setAuthToken(res.token);
    return res;
  },

  async logout(): Promise<void> {
    try {
      if (memoryAuthToken) {
        await requestJson('/api/auth/logout', { method: 'POST', auth: true });
      }
    } finally {
      setAuthToken(null);
    }
  },

  async getPublicCard(id: string): Promise<{ employee: Employee; settings: CompanySettings }> {
    return requestJson(`/api/cards/${encodeURIComponent(id)}`);
  },

  async getPublicSettings(): Promise<{ settings: CompanySettings }> {
    return requestJson('/api/settings/public');
  },

  async getEmployees(): Promise<{ employees: Employee[]; settings: CompanySettings }> {
    return requestJson('/api/employees', { auth: true });
  },

  async createEmployee(payload: Omit<Employee, 'id'> & { id?: string }): Promise<{ employee: Employee }> {
    return requestJson('/api/employees', {
      method: 'POST',
      auth: true,
      body: JSON.stringify(payload),
    });
  },

  async updateEmployee(
    id: string,
    payload: Omit<Employee, 'id'>
  ): Promise<{ employee: Employee }> {
    return requestJson(`/api/employees/${encodeURIComponent(id)}`, {
      method: 'PUT',
      auth: true,
      body: JSON.stringify(payload),
    });
  },

  async setEmployeeArchive(id: string, isActive: boolean): Promise<{ employee: Employee }> {
    return requestJson(`/api/employees/${encodeURIComponent(id)}/archive`, {
      method: 'PATCH',
      auth: true,
      body: JSON.stringify({ isActive }),
    });
  },

  async deleteEmployee(id: string): Promise<{ ok: boolean }> {
    return requestJson(`/api/employees/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      auth: true,
    });
  },

  async reorderEmployees(orderedIds: string[]): Promise<{ ok: boolean; employees: Employee[] }> {
    return requestJson('/api/employees/reorder', {
      method: 'POST',
      auth: true,
      body: JSON.stringify({ orderedIds }),
    });
  },

  async importCsv(
    csvText: string,
    mode: 'merge' | 'replace'
  ): Promise<{ imported: number; updated: number; skipped: number; employees: Employee[] }> {
    return requestJson('/api/employees/import-csv', {
      method: 'POST',
      auth: true,
      body: JSON.stringify({ csvText, mode }),
    });
  },

  async exportCsv(): Promise<Blob> {
    const reqHeaders = new Headers();
    if (memoryAuthToken) {
      reqHeaders.set('Authorization', `Bearer ${memoryAuthToken}`);
    }
    const res = await fetch('/api/employees/export-csv', { headers: reqHeaders });
    if (res.status === 401) {
      setAuthToken(null);
      onUnauthorizedHandler?.();
      throw new ApiError('Требуется авторизация', 401);
    }
    if (!res.ok) {
      throw new ApiError(`Не удалось выгрузить CSV (HTTP ${res.status})`, res.status);
    }
    return res.blob();
  },

  async updateSettings(settings: CompanySettings): Promise<{ settings: CompanySettings }> {
    return requestJson('/api/settings', {
      method: 'PUT',
      auth: true,
      body: JSON.stringify(settings),
    });
  },
};
