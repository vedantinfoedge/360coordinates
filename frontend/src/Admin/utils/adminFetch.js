/**
 * Admin API Helper
 * Centralized fetch for admin panel - prefixes API_BASE_URL, sends credentials,
 * handles 401 redirect, and returns data object only.
 */
import { API_BASE_URL } from '../../config/api.config';

/**
 * @param {string} endpoint - API path (e.g. '/admin/auth/verify.php' or full URL)
 * @param {RequestInit & { skipRedirectOn401?: boolean }} options - fetch options; skipRedirectOn401: true to avoid redirect when already on login page
 * @returns {Promise<object>} - The data object from response (data.data)
 * @throws {Error} - On success:false or non-JSON response
 */
export async function adminFetch(endpoint, options = {}) {
  const { skipRedirectOn401, ...fetchOptions } = options;
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  const res = await fetch(url, {
    ...fetchOptions,
    headers: {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    },
    credentials: 'include',
  });

  // 401 → redirect to admin login (unless we're already on login page, to prevent refresh loop)
  if (res.status === 401) {
    if (!skipRedirectOn401) {
      window.location.href = '/admin/login';
    }
    throw new Error('Unauthorized');
  }

  const contentType = res.headers.get('content-type');
  let data;

  if (contentType && contentType.includes('application/json')) {
    try {
      data = await res.json();
    } catch (e) {
      throw new Error('Invalid JSON response from server');
    }
  } else {
    const text = await res.text();
    throw new Error(text || `Invalid response: ${res.status}`);
  }

  if (!data.success) {
    const msg = data.message || data.data?.message || 'Request failed';
    throw new Error(msg);
  }

  return data.data;
}
