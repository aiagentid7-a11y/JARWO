CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$ BEGIN CREATE TYPE attendance_status_enum AS ENUM ('Hadir','Terlambat','Absen','Izin'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.attendance_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id VARCHAR(50) NOT NULL,
  department VARCHAR(150),
  attendance_date DATE NOT NULL,
  status attendance_status_enum NOT NULL,
  notes TEXT,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT attendance_employee_date_unique UNIQUE(employee_id, attendance_date)
);
CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON public.attendance_records(employee_id, attendance_date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_department_date ON public.attendance_records(department, attendance_date DESC);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own role permissions" ON public.role_permissions;
CREATE POLICY "Users read own role permissions" ON public.role_permissions
FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.user_roles r
    WHERE r.user_id = auth.uid() AND r.role = public.role_permissions.role
  )
);

DROP POLICY IF EXISTS "attendance_employee_own_or_management" ON public.attendance_records;
CREATE POLICY "attendance_employee_own_or_management" ON public.attendance_records
FOR SELECT TO authenticated USING (
  employee_id = (SELECT employee_id FROM public.user_roles WHERE user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid() AND r.role IN ('Admin','HR'))
  OR (EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid() AND r.role = 'Manager')
      AND department = (SELECT department FROM public.user_roles WHERE user_id = auth.uid()))
);

DROP POLICY IF EXISTS "attendance_employee_insert" ON public.attendance_records;
CREATE POLICY "attendance_employee_insert" ON public.attendance_records
FOR INSERT TO authenticated WITH CHECK (
  employee_id = (SELECT employee_id FROM public.user_roles WHERE user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid() AND r.role IN ('Admin','HR','Manager'))
);

DROP POLICY IF EXISTS "attendance_employee_update" ON public.attendance_records;
CREATE POLICY "attendance_employee_update" ON public.attendance_records
FOR UPDATE TO authenticated
USING (
  employee_id = (SELECT employee_id FROM public.user_roles WHERE user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid() AND r.role IN ('Admin','HR'))
  OR (EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid() AND r.role = 'Manager')
      AND department = (SELECT department FROM public.user_roles WHERE user_id = auth.uid()))
)
WITH CHECK (
  employee_id = (SELECT employee_id FROM public.user_roles WHERE user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid() AND r.role IN ('Admin','HR'))
  OR (EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid() AND r.role = 'Manager')
      AND department = (SELECT department FROM public.user_roles WHERE user_id = auth.uid()))
);

INSERT INTO public.role_permissions (role,module_code,module_name,access_level) VALUES
 ('Admin','absensi','Absensi & Kehadiran','full'),
 ('HR','absensi','Absensi & Kehadiran','full'),
 ('Manager','absensi','Absensi & Kehadiran','edit'),
 ('Employee','absensi','Absensi & Kehadiran','edit')
ON CONFLICT (role,module_code) DO UPDATE SET access_level = EXCLUDED.access_level;

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS attendance_set_updated_at ON public.attendance_records;
CREATE TRIGGER attendance_set_updated_at BEFORE UPDATE ON public.attendance_records FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- RBAC defaults for organization and employee master-data APIs.
-- Employee intentionally has no access to these management modules.
INSERT INTO public.role_permissions (role,module_code,module_name,access_level) VALUES
 ('Admin','employees','Data Karyawan','full'),
 ('HR','employees','Data Karyawan','full'),
 ('Manager','employees','Data Karyawan','view'),
 ('Employee','employees','Data Karyawan','none'),
 ('Admin','org_structure','Struktur Organisasi','full'),
 ('HR','org_structure','Struktur Organisasi','full'),
 ('Manager','org_structure','Struktur Organisasi','view'),
 ('Employee','org_structure','Struktur Organisasi','none')
ON CONFLICT (role,module_code) DO UPDATE SET
  module_name = EXCLUDED.module_name,
  access_level = EXCLUDED.access_level;
