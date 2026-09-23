-- ====================================================================
-- SKEMA SUPABASE POSTGRESQL "PERFORMANCE & SAFETY CORRELATION"
-- Sub-modul: Integrasi K3 (Incident Reports), BPJS Ketenagakerjaan & Appraisal KPI
-- ====================================================================

-- 1. ENUM TYPES FOR SAFETY & INCIDENTS
DO $$ BEGIN
    CREATE TYPE incident_type_enum AS ENUM ('kecelakaan_kerja', 'near_miss', 'penyakit_akibat_kerja');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE incident_severity_enum AS ENUM ('ringan', 'sedang', 'berat', 'fatal');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE bpjs_claim_status_enum AS ENUM ('belum_diajukan', 'diproses', 'disetujui', 'ditolak');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. TABEL INCIDENT REPORTS (INSIDEN K3 & KLAIM BPJS KETENAGAKERJAAN)
CREATE TABLE IF NOT EXISTS public.incident_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    karyawan_id VARCHAR(50) NOT NULL,
    karyawan_name VARCHAR(255) NOT NULL,
    department VARCHAR(100) NOT NULL,
    tanggal_kejadian DATE NOT NULL DEFAULT CURRENT_DATE,
    jenis_insiden incident_type_enum NOT NULL DEFAULT 'kecelakaan_kerja',
    tingkat_keparahan incident_severity_enum NOT NULL DEFAULT 'ringan',
    lokasi VARCHAR(255) NOT NULL,
    deskripsi TEXT NOT NULL,
    status_klaim_bpjs bpjs_claim_status_enum NOT NULL DEFAULT 'belum_diajukan',
    nomor_klaim_bpjs VARCHAR(100),
    biaya_ditanggung_bpjs NUMERIC(15, 2) DEFAULT 0.00,
    tindakan_korektif TEXT NOT NULL,
    foto_bukti_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_incidents_karyawan ON public.incident_reports(karyawan_id);
CREATE INDEX IF NOT EXISTS idx_incidents_dept ON public.incident_reports(department);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON public.incident_reports(tingkat_keparahan);
CREATE INDEX IF NOT EXISTS idx_incidents_bpjs_status ON public.incident_reports(status_klaim_bpjs);

-- 3. TABEL APPRAISALS (PENILAIAN KINERJA & SAFETY COMPLIANCE)
CREATE TABLE IF NOT EXISTS public.appraisals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    karyawan_id VARCHAR(50) NOT NULL,
    karyawan_name VARCHAR(255) NOT NULL,
    department VARCHAR(100) NOT NULL,
    period_year INT NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
    period_quarter VARCHAR(10) NOT NULL DEFAULT 'Q1',
    kpi_score NUMERIC(5,2) NOT NULL DEFAULT 100.00, -- Skor KPI Kerja 0-100
    safety_compliance_score NUMERIC(5,2) NOT NULL DEFAULT 100.00, -- Skor K3 0-100
    penalty_points_applied NUMERIC(5,2) NOT NULL DEFAULT 0.00, -- Total Penalti K3
    overall_appraisal_score NUMERIC(5,2) GENERATED ALWAYS AS (
        (kpi_score * 0.80) + (safety_compliance_score * 0.20)
    ) STORED,
    performance_grade VARCHAR(2) DEFAULT 'A',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_employee_period UNIQUE(karyawan_id, period_year, period_quarter)
);

CREATE INDEX IF NOT EXISTS idx_appraisals_karyawan ON public.appraisals(karyawan_id);
CREATE INDEX IF NOT EXISTS idx_appraisals_dept ON public.appraisals(department);

-- 4. TABEL RELASI INCIDENT <-> APPRAISAL PENALTIES
CREATE TABLE IF NOT EXISTS public.incident_appraisal_penalties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id UUID NOT NULL REFERENCES public.incident_reports(id) ON DELETE CASCADE,
    appraisal_id UUID NOT NULL REFERENCES public.appraisals(id) ON DELETE CASCADE,
    penalty_points NUMERIC(5,2) NOT NULL,
    reason TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ====================================================================
-- 5. TRIGGER AUTOMATIC SAFETY COMPLIANCE SCORE DEDUCTION
-- ====================================================================
CREATE OR REPLACE FUNCTION trigger_deduct_safety_score_func()
RETURNS TRIGGER AS $$
DECLARE
    curr_year INT;
    curr_quarter VARCHAR(10);
    target_appraisal_id UUID;
    penalty_pts NUMERIC(5,2) := 0;
BEGIN
    curr_year := EXTRACT(YEAR FROM NEW.tanggal_kejadian);
    
    -- Hitung Kuartal Kejadian
    IF EXTRACT(MONTH FROM NEW.tanggal_kejadian) BETWEEN 1 AND 3 THEN curr_quarter := 'Q1';
    ELSIF EXTRACT(MONTH FROM NEW.tanggal_kejadian) BETWEEN 4 AND 6 THEN curr_quarter := 'Q2';
    ELSIF EXTRACT(MONTH FROM NEW.tanggal_kejadian) BETWEEN 7 AND 9 THEN curr_quarter := 'Q3';
    ELSE curr_quarter := 'Q4';
    END IF;

    -- Penalti Berdasarkan Tingkat Keparahan Insiden:
    -- 'ringan' = -5 poin, 'sedang' = -15 poin, 'berat' = -30 poin, 'fatal' = -50 poin
    IF NEW.tingkat_keparahan = 'ringan' THEN penalty_pts := 5.00;
    ELSIF NEW.tingkat_keparahan = 'sedang' THEN penalty_pts := 15.00;
    ELSIF NEW.tingkat_keparahan = 'berat' THEN penalty_pts := 30.00;
    ELSIF NEW.tingkat_keparahan = 'fatal' THEN penalty_pts := 50.00;
    END IF;

    -- Pastikan ada Record Appraisal Karyawan di Periode Tersebut
    INSERT INTO public.appraisals (karyawan_id, karyawan_name, department, period_year, period_quarter, kpi_score, safety_compliance_score, penalty_points_applied)
    VALUES (NEW.karyawan_id, NEW.karyawan_name, NEW.department, curr_year, curr_quarter, 85.00, 100.00, 0.00)
    ON CONFLICT (karyawan_id, period_year, period_quarter) DO NOTHING;

    -- Ambil ID Appraisal Target
    SELECT id INTO target_appraisal_id 
    FROM public.appraisals 
    WHERE karyawan_id = NEW.karyawan_id 
      AND period_year = curr_year 
      AND period_quarter = curr_quarter;

    IF target_appraisal_id IS NOT NULL THEN
        -- Kurangi Skor Safety Compliance
        UPDATE public.appraisals
        SET 
            penalty_points_applied = penalty_points_applied + penalty_pts,
            safety_compliance_score = GREATEST(0.00, 100.00 - (penalty_points_applied + penalty_pts)),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = target_appraisal_id;

        -- Catat ke Tabel Relasi Penalti
        INSERT INTO public.incident_appraisal_penalties (incident_id, appraisal_id, penalty_points, reason)
        VALUES (
            NEW.id, 
            target_appraisal_id, 
            penalty_pts, 
            'Penalti Insiden K3 [' || UPPER(NEW.tingkat_keparahan::text) || ']: ' || NEW.deskripsi
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Pasang Trigger ke Tabel incident_reports
DROP TRIGGER IF EXISTS trg_incident_safety_deduction ON public.incident_reports;
CREATE TRIGGER trg_incident_safety_deduction
    AFTER INSERT ON public.incident_reports
    FOR EACH ROW EXECUTE FUNCTION trigger_deduct_safety_score_func();

-- ====================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================
ALTER TABLE public.incident_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appraisals ENABLE ROW LEVEL SECURITY;

-- Policy: Admin & HR Full Access
CREATE POLICY "Admin & HR Full Access Incidents" ON public.incident_reports
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('Admin', 'HR')
        )
    );

-- Policy: Manager Read Direct Department Incidents
CREATE POLICY "Manager Read Dept Incidents" ON public.incident_reports
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_roles.user_id = auth.uid() 
              AND user_roles.role = 'Manager' 
              AND user_roles.department = incident_reports.department
        )
    );
