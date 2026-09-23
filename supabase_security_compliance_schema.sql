-- ====================================================================
-- SKEMA SUPABASE POSTGRESQL "KEAMANAN & COMPLIANCE (RBAC, ENKRIPSI, AUDIT LOG)"
-- Aplikasi: Employee Database Pro (Labor Compliance & Wage Benchmarking)
-- ====================================================================

-- 1. EKSTENSI PGCRYPTO UNTUK ENKRIPSI AT-REST
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. ENUM TYPE UNTUK USER ROLE & ACCESS LEVEL
DO $$ BEGIN
    CREATE TYPE user_role_enum AS ENUM ('Admin', 'HR', 'Manager', 'Employee');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE access_level_enum AS ENUM ('none', 'view', 'edit', 'full');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. TABEL USER ROLES & PROFILES
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role user_role_enum NOT NULL DEFAULT 'Employee',
    department VARCHAR(150),
    employee_id VARCHAR(50),
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. TABEL RBAC PERMISSION MATRIX (MODULE-LEVEL PERMISSION)
CREATE TABLE IF NOT EXISTS public.role_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role user_role_enum NOT NULL,
    module_code VARCHAR(50) NOT NULL,
    module_name VARCHAR(150) NOT NULL,
    access_level access_level_enum NOT NULL DEFAULT 'none',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_role_module UNIQUE(role, module_code)
);

-- 5. TABEL AUDIT LOGS (OTOMATIS MENCATAT LOG EDIT/DELETE/INSERT)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(100) NOT NULL DEFAULT 'system',
    user_email VARCHAR(255) NOT NULL DEFAULT 'system@company.com',
    user_role VARCHAR(50) NOT NULL DEFAULT 'Employee',
    action VARCHAR(50) NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE', 'VIEW_SENSITIVE'
    table_name VARCHAR(100) NOT NULL,
    record_id VARCHAR(100),
    old_data JSONB,
    new_data JSONB,
    ip_address VARCHAR(50) DEFAULT '127.0.0.1',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs(user_email);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table ON public.audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at);

-- ====================================================================
-- 6. FUNGSI ENKRIPSI & DEKRIPSI KOLOM SENSITIF (AT-REST PGCRYPTO)
-- ====================================================================
CREATE OR REPLACE FUNCTION encrypt_sensitive_data(plain_text TEXT, secret_key TEXT)
RETURNS TEXT AS $$
BEGIN
    IF plain_text IS NULL OR plain_text = '' THEN
        RETURN NULL;
    END IF;
    RETURN encode(pgp_sym_encrypt(plain_text, secret_key), 'hex');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrypt_sensitive_data(cipher_text TEXT, secret_key TEXT)
RETURNS TEXT AS $$
BEGIN
    IF cipher_text IS NULL OR cipher_text = '' THEN
        RETURN NULL;
    END IF;
    RETURN pgp_sym_decrypt(decode(cipher_text, 'hex'), secret_key);
EXCEPTION WHEN OTHERS THEN
    RETURN '*** TERDEKRIPSI GAGAL ***';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================================================
-- 7. POSTGRES TRIGGER AUTOMATIC AUDIT LOGGING ON SENSITIVE TABLES
-- ====================================================================
CREATE OR REPLACE FUNCTION log_audit_trigger_func()
RETURNS TRIGGER AS $$
DECLARE
    curr_user_email TEXT;
    curr_user_role TEXT;
    curr_user_id TEXT;
BEGIN
    -- Extract current authenticated user context from Supabase auth.jwt() or fallback session
    curr_user_email := COALESCE(current_setting('app.current_user_email', true), 'system@company.com');
    curr_user_role  := COALESCE(current_setting('app.current_user_role', true), 'Admin');
    curr_user_id    := COALESCE(current_setting('app.current_user_id', true), 'sys-001');

    IF (TG_OP = 'DELETE') THEN
        INSERT INTO public.audit_logs (user_id, user_email, user_role, action, table_name, record_id, old_data, new_data)
        VALUES (curr_user_id, curr_user_email, curr_user_role, 'DELETE', TG_TABLE_NAME, OLD.id::text, to_jsonb(OLD), NULL);
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO public.audit_logs (user_id, user_email, user_role, action, table_name, record_id, old_data, new_data)
        VALUES (curr_user_id, curr_user_email, curr_user_role, 'UPDATE', TG_TABLE_NAME, NEW.id::text, to_jsonb(OLD), to_jsonb(NEW));
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO public.audit_logs (user_id, user_email, user_role, action, table_name, record_id, old_data, new_data)
        VALUES (curr_user_id, curr_user_email, curr_user_role, 'INSERT', TG_TABLE_NAME, NEW.id::text, NULL, to_jsonb(NEW));
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply Triggers to Sensitive Tables
DROP TRIGGER IF EXISTS audit_gaji_pph_trigger ON public.gaji_pph;
CREATE TRIGGER audit_gaji_pph_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.gaji_pph
    FOR EACH ROW EXECUTE FUNCTION log_audit_trigger_func();

DROP TRIGGER IF EXISTS audit_labor_regulations_trigger ON public.labor_regulations;
CREATE TRIGGER audit_labor_regulations_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.labor_regulations
    FOR EACH ROW EXECUTE FUNCTION log_audit_trigger_func();

-- ====================================================================
-- 8. ROW LEVEL SECURITY (RLS) POLICIES ON SUPABASE TABLES
-- ====================================================================
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy 1: Only Admin can view and modify Audit Logs
DROP POLICY IF EXISTS "Admin Full Access Audit Logs" ON public.audit_logs;
CREATE POLICY "Admin Full Access Audit Logs" ON public.audit_logs
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'Admin'
        )
    );

-- RLS Policy 2: Admin and HR can view Role Permissions
DROP POLICY IF EXISTS "HR and Admin Read Role Permissions" ON public.role_permissions;
CREATE POLICY "HR and Admin Read Role Permissions" ON public.role_permissions
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('Admin', 'HR')
        )
    );

-- RLS Policy 3: Users can view their own profile and Admin can view all
DROP POLICY IF EXISTS "User View Own Profile and Admin View All" ON public.user_roles;
CREATE POLICY "User View Own Profile and Admin View All" ON public.user_roles
    FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid() OR 
        EXISTS (
            SELECT 1 FROM public.user_roles AS r 
            WHERE r.user_id = auth.uid() AND r.role = 'Admin'
        )
    );

-- ====================================================================
-- 9. SEED DATA AWAL RBAC MATRIX
-- ====================================================================
INSERT INTO public.role_permissions (role, module_code, module_name, access_level)
VALUES
  ('Admin', 'security', 'Keamanan, RBAC & Audit Log', 'full'),
  ('Admin', 'gaji', 'Gaji, Insentif & PPh 21', 'full'),
  ('Admin', 'phk', 'Perhitungan Pesangon & PHK', 'full'),
  ('HR', 'security', 'Keamanan, RBAC & Audit Log', 'view'),
  ('HR', 'gaji', 'Gaji, Insentif & PPh 21', 'full'),
  ('HR', 'phk', 'Perhitungan Pesangon & PHK', 'full'),
  ('Manager', 'security', 'Keamanan, RBAC & Audit Log', 'none'),
  ('Manager', 'gaji', 'Gaji, Insentif & PPh 21', 'view'),
  ('Employee', 'security', 'Keamanan, RBAC & Audit Log', 'none'),
  ('Employee', 'gaji', 'Gaji, Insentif & PPh 21', 'view')
ON CONFLICT (role, module_code) DO NOTHING;
