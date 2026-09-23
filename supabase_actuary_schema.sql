-- ====================================================================
-- SKEMA SUPABASE POSTGRESQL "AKTUARIA REMUNERASI TAHUNAN & CADANGAN PESANGON"
-- Aplikasi: Employee Database Pro (HR & Actuarial Valuation)
-- ====================================================================

-- 1. TABEL ASUMSI DAKTUARIA TAHUNAN
CREATE TABLE IF NOT EXISTS public.actuarial_assumptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    year INT NOT NULL UNIQUE CHECK (year >= 2020 AND year <= 2100),
    salary_inflation_rate NUMERIC(5, 2) NOT NULL DEFAULT 5.50, -- % Kenaikan/Inflasi Gaji Tahunan
    discount_rate NUMERIC(5, 2) NOT NULL DEFAULT 6.80,         -- % Tingkat Diskonto (Discount Rate)
    turnover_rate NUMERIC(5, 2) NOT NULL DEFAULT 3.00,         -- % Expected Employee Turnover Rate
    bonus_months NUMERIC(4, 2) NOT NULL DEFAULT 1.00,          -- Jumlah Bulan Bonus / THR
    allowance_growth_rate NUMERIC(5, 2) NOT NULL DEFAULT 4.00, -- % Pertumbuhan Tunjangan
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. TABEL HISTORIS PROYEKSI BIAYA REMUNERASI
CREATE TABLE IF NOT EXISTS public.actuarial_projections_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    valuation_year INT NOT NULL,
    horizon_years INT NOT NULL DEFAULT 5,
    active_employees_count INT NOT NULL,
    base_salary_projected NUMERIC(15, 2) NOT NULL,
    bonus_projected NUMERIC(15, 2) NOT NULL,
    allowances_projected NUMERIC(15, 2) NOT NULL,
    total_gross_remuneration NUMERIC(15, 2) NOT NULL,
    net_remuneration_pv NUMERIC(15, 2) NOT NULL, -- Present Value setelah turnover & diskonto
    severance_reserve_pv NUMERIC(15, 2) NOT NULL, -- Cadangan Pesangon Present Value
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. TABEL CADANGAN PESANGON PER KARYAWAN (SNAPSHOT)
CREATE TABLE IF NOT EXISTS public.severance_reserve_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    valuation_date DATE NOT NULL,
    tenure_years NUMERIC(4, 1) NOT NULL,
    monthly_wage NUMERIC(15, 2) NOT NULL,
    up_months NUMERIC(4, 1) NOT NULL,    -- Uang Pesangon (Bulan)
    upmk_months NUMERIC(4, 1) NOT NULL,  -- Uang Penghargaan Masa Kerja (Bulan)
    uph_months NUMERIC(4, 1) NOT NULL,   -- Uang Penggantian Hak (15%)
    total_multiplier_months NUMERIC(4, 1) NOT NULL,
    nominal_gross_reserve NUMERIC(15, 2) NOT NULL,
    discount_factor NUMERIC(6, 4) NOT NULL,
    pv_reserve NUMERIC(15, 2) NOT NULL,   -- Present Value Cadangan Pesangon
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- SEED DATA AWAL ASUMSI AKTUARIA
INSERT INTO public.actuarial_assumptions (year, salary_inflation_rate, discount_rate, turnover_rate, bonus_months, allowance_growth_rate, notes)
VALUES 
  (2025, 5.00, 6.50, 3.50, 1.00, 4.00, 'Realisasi Sektor Tambang 2025'),
  (2026, 5.50, 6.80, 3.00, 1.25, 4.50, 'Target RKAB 2026 Site Sultra'),
  (2027, 6.00, 7.00, 2.80, 1.50, 5.00, 'Rencana Ekspansi Tambang 2027')
ON CONFLICT (year) DO NOTHING;
