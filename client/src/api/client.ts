const API_BASE_URL = '/api/v1';

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

export async function request<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('watt_token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    // Check if token expired
    if (res.status === 401 && !endpoint.includes('/auth/login')) {
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

    return json as T;
  } catch (error: any) {
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
}
