# Audit & Perbaikan — Boow / Employee Database Pro

## Masalah kritis yang ditemukan

1. **`server.ts` vs `/api` tidak sinkron.** `server.ts` (Express, all-in-one)
   berisi seluruh endpoint aplikasi, tapi Vercel di production HANYA
   menjalankan file di folder `/api` sebagai serverless function.
   Sebelum perbaikan ini, `/api` cuma cover: employees, departments,
   job-positions, org-chart. Modul Aktuaria, Regulasi & UMK, Keamanan &
   Compliance — 404 di production meski kodenya "ada".

2. **4 modul pakai in-memory store**, bukan Supabase, walau schema SQL-nya
   (`supabase_actuary_schema.sql`, `supabase_regulations_schema.sql`,
   `supabase_security_compliance_schema.sql`,
   `supabase_performance_safety_schema.sql`) sudah dibuat. Artinya data
   di modul-modul ini reset tiap kali serverless function cold start.
   **Belum diperbaiki di pass ini** — butuh migrasi tersendiri per modul.

3. **Kemungkinan mismatch penamaan kolom** — endpoint `/api/employees`,
   `/api/departments` query Supabase pakai snake_case (`global_no`,
   `parent_id`) tapi tipe frontend (`src/types.ts`) pakai camelCase
   (`globalNo`). Karena `.insert(req.body)` / `.update(req.body)` dikirim
   apa adanya ke Supabase client tanpa transform, field yang namanya beda
   berpotensi silent-fail. **Perlu diverifikasi langsung ke skema Supabase
   live** — tidak bisa dipastikan dari kode saja.

4. Modul **Performance & Safety** (korelasi BPJS ↔ Insiden ↔ Appraisal)
   sudah ada logic-nya di `server/performanceSafety.ts` tapi tidak ada
   endpoint API, komponen dashboard, atau entry menu.

5. **SOP/WI (ISO)** di modul Struktur Organisasi — belum diimplementasikan
   sama sekali di `OrgStructureDashboard.tsx`.

## Yang sudah diperbaiki di pass ini

### Endpoint serverless baru (folder `/api`)
- `api/actuary/assumptions.ts`, `api/actuary/projection.ts`,
  `api/actuary/severance-reserve.ts`
- `api/regulations/index.ts`, `api/regulations/[id].ts`
- `api/minimum-wages/index.ts`, `api/minimum-wages/[id].ts`,
  `api/minimum-wages/check-compliance.ts`
- `api/security/roles/index.ts`, `api/security/roles/[roleId].ts`
- `api/security/users/index.ts`
- `api/security/audit-logs/index.ts`
- `api/security/encrypted-catalog/index.ts`
- `api/security/test-encryption.ts`
- `api/performance-safety/index.ts` (baru — sebelumnya tidak ada sama sekali)

Semua endpoint di atas membungkus logic yang sudah ada di `server/*.ts`
(bukan tulis ulang), jadi behavior-nya identik dengan yang jalan di
`npm run dev` lokal — bedanya sekarang benar-benar ter-deploy di Vercel.

Endpoint `actuary/projection.ts` dan `actuary/severance-reserve.ts` saya
ubah untuk mengambil data karyawan dari **Supabase langsung**
(bukan `data/employees.json` lokal yang dipakai `server.ts` — file itu
kosong `[]` di project ini dan tidak reliable di serverless).

### Frontend
- `src/components/PerformanceSafetyDashboard.tsx` — dashboard baru:
  tab Korelasi Safety-Performance per departemen, Laporan Insiden
  (dengan form input), dan ringkasan Klaim BPJS.
- `src/App.tsx` — import komponen baru, entry menu "Performance & Safety"
  (ditaruh setelah BPJS), dan routing tab-nya.

## Belum dikerjakan (prioritas selanjutnya)

1. **Verifikasi skema Supabase live** vs `src/types.ts` — pastikan tidak
   ada mismatch snake_case/camelCase yang bikin update silent-fail.
2. **Migrasi 4 modul (Aktuaria, Regulasi, Security, Performance & Safety)
   dari in-memory ke Supabase** — pakai schema SQL yang sudah ada.
3. **SOP & WI (ISO)** di modul Struktur Organisasi — belum dibuat.
4. **`/api/chat` (AI HR Agent)** — masih hanya ada di `server.ts`, belum
   di-port ke serverless. Kompleksitas lebih tinggi karena ada
   function-calling (add/update/delete employee) yang saat ini menulis ke
   file JSON lokal — pendekatan ini tidak akan persist di Vercel
   serverless dan perlu ditulis ulang ke Supabase.
5. Pertimbangkan **hapus/nonaktifkan `server.ts`** dari alur produksi
   (biarkan hanya untuk `npm run dev` lokal) supaya tidak ada dua sumber
   kebenaran untuk logic yang sama — sekarang ada risiko dua file
   di-maintain terpisah dan makin divergen.
