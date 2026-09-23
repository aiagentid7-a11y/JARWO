-- ============================================================================
-- SKEMA SUPABASE HR "EMPLOYEE DATABASE PRO" - STRUKTUR ORGANISASI & HIERARKI
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABEL DEPARTEMEN (departments)
CREATE TABLE IF NOT EXISTS public.departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    manager_id UUID, -- Will reference employees(id)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. TABEL JOB GRADES / LEVELS (job_grades)
CREATE TABLE IF NOT EXISTS public.job_grades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grade_code VARCHAR(10) NOT NULL UNIQUE, -- e.g., 'G1', 'G2', 'EXEC-1'
    grade_name VARCHAR(50) NOT NULL,        -- e.g., 'Executive', 'Senior Manager', 'Staff'
    level INT NOT NULL CHECK (level >= 1 AND level <= 10), -- 1 = Highest (CEO), 10 = Junior Staff
    min_salary NUMERIC(15, 2),
    max_salary NUMERIC(15, 2),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. TABEL JABATAN / POSISI (job_positions)
CREATE TABLE IF NOT EXISTS public.job_positions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(100) NOT NULL,
    code VARCHAR(20),
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    job_grade_id UUID REFERENCES public.job_grades(id) ON DELETE SET NULL,
    description TEXT,
    min_experience_years INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. UPDATE TABEL KARYAWAN (employees) UNTUK REPORTING LINE & RELASI
-- Note: Jalankan ALTER TABLE jika tabel employees sudah ada di Supabase
DO $$ 
BEGIN 
    -- Foreign Key Atasan Langsung (reports_to_id)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='reports_to_id') THEN
        ALTER TABLE public.employees ADD COLUMN reports_to_id UUID REFERENCES public.employees(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='reports_to_name') THEN
        ALTER TABLE public.employees ADD COLUMN reports_to_name VARCHAR(150);
    END IF;

    -- Foreign Key Departemen
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='department_id') THEN
        ALTER TABLE public.employees ADD COLUMN department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL;
    END IF;

    -- Foreign Key Jabatan
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='job_position_id') THEN
        ALTER TABLE public.employees ADD COLUMN job_position_id UUID REFERENCES public.job_positions(id) ON DELETE SET NULL;
    END IF;

    -- Foreign Key Job Grade
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='job_grade_id') THEN
        ALTER TABLE public.employees ADD COLUMN job_grade_id UUID REFERENCES public.job_grades(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Tambahkan constraint FK manager_id di departemen merujuk ke employees(id)
ALTER TABLE public.departments 
    DROP CONSTRAINT IF EXISTS fk_departments_manager,
    ADD CONSTRAINT fk_departments_manager FOREIGN KEY (manager_id) REFERENCES public.employees(id) ON DELETE SET NULL;

-- 5. FUNCTION & TRIGGER UNTUK MENCEGAH CIRCULAR REPORTING (A -> B -> A)
CREATE OR REPLACE FUNCTION check_circular_reporting()
RETURNS TRIGGER AS $$
DECLARE
    curr_id UUID;
BEGIN
    -- Jika reports_to_id Kosong, maka valid
    IF NEW.reports_to_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Karyawan tidak boleh melapor ke dirinya sendiri
    IF NEW.id = NEW.reports_to_id THEN
        RAISE EXCEPTION 'Circular Reporting Error: Karyawan % tidak dapat melapor ke dirinya sendiri.', NEW.id;
    END IF;

    -- Telusuri hirarki atasan secara rekursif
    curr_id := NEW.reports_to_id;
    WHILE curr_id IS NOT NULL LOOP
        IF curr_id = NEW.id THEN
            RAISE EXCEPTION 'Circular Reporting Error: Terdeteksi siklus hubungan atasan-bawahan melingkar!';
        END IF;

        SELECT reports_to_id INTO curr_id FROM public.employees WHERE id = curr_id;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_circular_reporting ON public.employees;
CREATE TRIGGER trg_prevent_circular_reporting
BEFORE INSERT OR UPDATE OF reports_to_id ON public.employees
FOR EACH ROW
EXECUTE FUNCTION check_circular_reporting();

-- 6. INDEX UNTUK PERFORMANSA QUERY ORG CHART
CREATE INDEX IF NOT EXISTS idx_employees_reports_to ON public.employees(reports_to_id);
CREATE INDEX IF NOT EXISTS idx_employees_department_id ON public.employees(department_id);
CREATE INDEX IF NOT EXISTS idx_job_positions_dept ON public.job_positions(department_id);

-- 7. SEED DATA SAMPEL JABATAN & DEPARTEMEN (OPSIONAL)
INSERT INTO public.job_grades (grade_code, grade_name, level, min_salary, max_salary, description)
VALUES 
    ('G1', 'Direksi / C-Level', 1, 35000000, 75000000, 'Top level executive management'),
    ('G2', 'General Manager', 2, 22000000, 40000000, 'Senior management level'),
    ('G3', 'Manager', 3, 15000000, 25000000, 'Department head level'),
    ('G4', 'Supervisor / Lead', 4, 9000000, 16000000, 'Operational supervisor'),
    ('G5', 'Officer / Staff', 5, 5500000, 10000000, 'Professional staff')
ON CONFLICT (grade_code) DO NOTHING;
