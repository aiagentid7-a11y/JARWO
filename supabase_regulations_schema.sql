-- ====================================================================
-- SKEMA SUPABASE POSTGRESQL "REGULASI KETENAGAKERJAAN & REFERENSI UMP / UMK"
-- Aplikasi: Employee Database Pro (Labor Compliance & Wage Benchmarking)
-- ====================================================================

-- 1. ENUM TYPE UNTUK KATEGORI & STATUS REGULASI
DO $$ BEGIN
    CREATE TYPE regulation_category_enum AS ENUM (
        'ketenagakerjaan', 
        'pengupahan', 
        'PHK', 
        'BPJS', 
        'pajak', 
        'k3', 
        'lainnya'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE regulation_status_enum AS ENUM (
        'aktif', 
        'tidak_berlaku', 
        'direvisi'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. TABEL REFERENSI REGULASI KETENAGAKERJAAN
CREATE TABLE IF NOT EXISTS public.labor_regulations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    category regulation_category_enum NOT NULL DEFAULT 'ketenagakerjaan',
    summary TEXT NOT NULL,
    effective_date DATE NOT NULL,
    status regulation_status_enum NOT NULL DEFAULT 'aktif',
    document_number VARCHAR(100),
    issuing_authority VARCHAR(150),
    download_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- INDEX UNTUK PENCHARIAN REGULASI FAST LOOKUP
CREATE INDEX IF NOT EXISTS idx_labor_regulations_category ON public.labor_regulations(category);
CREATE INDEX IF NOT EXISTS idx_labor_regulations_status ON public.labor_regulations(status);

-- 3. TABEL REFERENSI UMP / UMK PER PROVINSI & KOTA/KABUPATEN
CREATE TABLE IF NOT EXISTS public.minimum_wages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    province VARCHAR(150) NOT NULL,
    city_district VARCHAR(150),
    wage_type VARCHAR(10) NOT NULL CHECK (wage_type IN ('UMP', 'UMK')),
    year INT NOT NULL CHECK (year >= 2020 AND year <= 2100),
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    regulation_ref VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_region_year UNIQUE(province, city_district, year)
);

-- INDEX UNTUK VALIDASI KEPATUHAN GAJI CEPAT
CREATE INDEX IF NOT EXISTS idx_minimum_wages_region_year ON public.minimum_wages(province, year);

-- 4. SEED DATA AWAL REGULASI KETENAGAKERJAAN INDONESIA
INSERT INTO public.labor_regulations (title, category, summary, effective_date, status, document_number, issuing_authority, download_url)
VALUES 
  (
    'PP No. 35 Tahun 2021', 
    'PHK', 
    'Penyelenggaraan Perjanjian Kerja Waktu Tertentu (PKWT), Alih Daya (Outsourcing), Waktu Kerja dan Waktu Istirahat, serta Pemutusan Hubungan Kerja (PHK). Mengatur rumus Pesangon (UP), UPMK, dan UPH.',
    '2021-02-02', 
    'aktif', 
    'PP 35/2021', 
    'Pemerintah RI / Presiden', 
    'https://jdih.kemnaker.go.id'
  ),
  (
    'PP No. 36 Tahun 2021 jo PP No. 51 Tahun 2023', 
    'pengupahan', 
    'Kebijakan Pengupahan, Penetapan UMP & UMK berbasis variabel pertumbuhan ekonomi, inflasi, dan indeks alfa. Larangan membayar upah di bawah UMP/UMK untuk pekerja >1 tahun.',
    '2023-11-10', 
    'aktif', 
    'PP 51/2023', 
    'Kementerian Ketenagakerjaan RI', 
    'https://jdih.kemnaker.go.id'
  ),
  (
    'PMK No. 168 Tahun 2023 (TER PPh 21)', 
    'pajak', 
    'Petunjuk Pelaksanaan Pemotongan Pajak atas Penghasilan Sehubungan dengan Pekerjaan dengan Tarif Efektif Rata-Rata (TER) Kategori A, B, dan C.',
    '2024-01-01', 
    'aktif', 
    'PMK 168/2023', 
    'Kementerian Keuangan RI', 
    'https://jdih.kemenkeu.go.id'
  ),
  (
    'Perpres No. 59 Tahun 2024 (BPJS Kesehatan & KRIS)', 
    'BPJS', 
    'Jaminan Kesehatan Nasional dan Penerapan Kelas Rawat Inap Standar (KRIS). Batas atas upah BPJS Kesehatan sebesar Rp 12.000.000.',
    '2024-05-08', 
    'aktif', 
    'Perpres 59/2024', 
    'Presiden RI', 
    'https://bpjs-kesehatan.go.id'
  )
ON CONFLICT DO NOTHING;

-- 5. SEED DATA AWAL REFERENSI UMP / UMK 2026
INSERT INTO public.minimum_wages (province, city_district, wage_type, year, amount, regulation_ref, notes)
VALUES
  ('Sulawesi Tenggara', 'Kab. Konawe Utara', 'UMK', 2026, 3250000.00, 'SK Gubernur Sultra No. 721/2025', 'Kawasan Industri Pertambangan Nikel Konawe Utara'),
  ('Sulawesi Tenggara', 'Kota Kendari', 'UMK', 2026, 3180000.00, 'SK Gubernur Sultra No. 720/2025', 'Ibukota Provinsi Sulawesi Tenggara'),
  ('Sulawesi Tenggara', 'Seluruh Wilayah Sultra', 'UMP', 2026, 2985000.00, 'SK Gubernur Sultra No. 715/2025', 'Upah Minimum Provinsi Sulawesi Tenggara'),
  ('Sulawesi Tengah', 'Kab. Morowali', 'UMK', 2026, 3650000.00, 'SK Gubernur Sulteng No. 580/2025', 'Kawasan Industri Smelter IMIP Morowali'),
  ('DKI Jakarta', 'DKI Jakarta', 'UMP', 2026, 5395000.00, 'Kepgub DKI Jakarta No. 1150/2025', 'Upah Minimum Provinsi DKI Jakarta'),
  ('Kalimantan Timur', 'Kab. Kutai Kartanegara', 'UMK', 2026, 3720000.00, 'SK Gubernur Kaltim No. 430/2025', 'Sektor Batubara & Penyangga IKN')
ON CONFLICT (province, city_district, year) DO NOTHING;
