import { supabase } from '../supabaseClient';

/**
 * Interceptor global untuk `fetch`.
 *
 * Banyak komponen (App.tsx, PKWTDashboard, LeaveDashboard, BPJSDashboard,
 * DataExchangeBar, AICopilotChat, RemunerationDashboard, dst.) memanggil
 * endpoint backend lewat `fetch('/api/...')` secara langsung di banyak
 * tempat. Daripada mengedit setiap satu titik panggilan, kita pasang satu
 * lapisan interceptor di sini yang otomatis menempelkan header
 * `Authorization: Bearer <token>` dari sesi Supabase yang sedang aktif ke
 * setiap request ke `/api/*`.
 *
 * File ini harus di-import (efek samping saja, tanpa perlu dipakai
 * simbolnya) sekali saja, di titik paling awal aplikasi (lihat main.tsx),
 * sebelum komponen lain sempat memanggil fetch.
 */
const originalFetch = window.fetch.bind(window);

window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const url = typeof input === 'string'
    ? input
    : input instanceof URL
      ? input.pathname
      : (input as Request).url;

  const isInternalApiCall = typeof url === 'string' && url.startsWith('/api/');

  if (!isInternalApiCall) {
    return originalFetch(input, init);
  }

  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const nextInit: RequestInit = { ...init };
  if (token) {
    nextInit.headers = {
      ...(init?.headers || {}),
      Authorization: `Bearer ${token}`,
    };
  }

  const response = await originalFetch(input, nextInit);

  // Kalau sesi kadaluarsa/token ditolak server, paksa balik ke layar login
  // supaya pengguna tidak melihat error API yang membingungkan.
  if (response.status === 401) {
    supabase.auth.signOut();
  }

  return response;
};
