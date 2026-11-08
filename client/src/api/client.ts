import { apiCache, CACHE_TTL } from './cache.js';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

export class ApiError extends Error {
  status: number;
  data: any;
  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export interface RequestOptions extends RequestInit {
  cacheTtl?: number;
  cacheTags?: string[];
  skipCache?: boolean;
}

/**
 * Maps mutations to related cache tags that must be invalidated
 */
function getInvalidationTagsForMutation(endpoint: string): string[] {
  const clean = endpoint.toLowerCase();
  const tags: string[] = [];

  if (clean.includes('/sesi') || clean.includes('/events')) {
    tags.push('events', 'sesi', 'dashboard');
  }
  if (clean.includes('/mahasiswa')) {
    tags.push('mahasiswa', 'dashboard');
  }
  if (clean.includes('/qr')) {
    tags.push('qr', 'mahasiswa', 'dashboard', 'sesi');
  }
  if (clean.includes('/scan') || clean.includes('/absensi')) {
    tags.push('absensi', 'dashboard', 'sesi');
  }
  if (clean.includes('/users')) {
    tags.push('users');
  }

  return tags;
}

export async function request<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();
  const isGet = method === 'GET';

  // 1. Check in-memory cache for GET requests
  const cacheKey = apiCache.generateKey(endpoint);
  if (isGet && !options.skipCache && options.cacheTtl !== 0) {
    const cachedData = apiCache.get<T>(cacheKey);
    if (cachedData !== null) {
      return cachedData;
    }

    // Check if an identical GET request is already in-flight
    const inFlightPromise = apiCache.getInFlight<T>(cacheKey);
    if (inFlightPromise) {
      return inFlightPromise;
    }
  }

  const token = localStorage.getItem('watt_token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  // 30-second request timeout to allow batch operations and image generations without premature aborts
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  // Link caller signal if provided
  if (options.signal) {
    options.signal.addEventListener('abort', () => controller.abort());
  }

  const executeFetch = async (): Promise<T> => {
    try {
      const res = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers,
      }).finally(() => clearTimeout(timeoutId));

      // Check if token expired
      if (res.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/me')) {
        apiCache.clear();
        localStorage.removeItem('watt_token');
        localStorage.removeItem('watt_user');
        window.location.href = '/login?expired=1';
        throw new ApiError('Sesi Anda telah kedaluwarsa. Silakan login kembali.', 401);
      }

      // Check for blob / download responses
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('text/csv')) {
        return (await res.blob()) as unknown as T;
      }

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        const message = json?.message || `Permintaan gagal dengan status ${res.status}`;
        throw new ApiError(message, res.status, json);
      }

      // If mutation succeeded, auto-invalidate related cache tags
      if (!isGet) {
        const tagsToInvalidate = getInvalidationTagsForMutation(endpoint);
        if (tagsToInvalidate.length > 0) {
          apiCache.invalidateTags(tagsToInvalidate);
        }
      } else if (options.cacheTtl && options.cacheTtl > 0) {
        // Cache the successful GET response
        apiCache.set(cacheKey, json, options.cacheTtl, options.cacheTags || []);
      }

      return json as T;
    } catch (error: any) {
      if (error?.name === 'AbortError' || error?.code === 20) {
        const abortErr = new ApiError('Permintaan dibatalkan.', 0, { isAborted: true });
        abortErr.name = 'AbortError';
        throw abortErr;
      }
      if (error instanceof ApiError) {
        throw error;
      }
      // Network / offline error
      throw new ApiError(
        'Koneksi server gagal atau terputus. Periksa jaringan Anda.',
        0,
        { isNetworkError: true }
      );
    }
  };

  const fetchPromise = executeFetch();

  if (isGet && !options.skipCache) {
    apiCache.setInFlight(cacheKey, fetchPromise);
  }

  return fetchPromise;
}

export { apiCache, CACHE_TTL };
