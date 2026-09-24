import { createClient, type User } from "@supabase/supabase-js";
import type { NextFunction, Request, Response } from "express";
import { appUsersStore } from "./security";

export type AppRole = "Admin" | "HR" | "Manager" | "Employee";

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: AppRole;
  name: string;
  department?: string | null;
  employeeId?: string | null;
  status: string;
  supabaseUser: User;
}

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthenticatedUser;
    }
  }
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false }
    })
  : null;

const VALID_ROLES: AppRole[] = ["Admin", "HR", "Manager", "Employee"];

function normalizeRole(value: unknown): AppRole | null {
  return typeof value === "string" && VALID_ROLES.includes(value as AppRole)
    ? value as AppRole
    : null;
}

async function resolveProfile(user: User): Promise<AuthenticatedUser | null> {
  if (!supabase) return null;

  // Resolve the authoritative role from the protected user_roles table.
  // The access token is supplied per request so RLS evaluates auth.uid().
  const { data, error } = await supabase
    .from("user_roles")
    .select("user_id,email,full_name,role,department,employee_id,status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!error && data) {
    const role = normalizeRole(data.role);
    if (!role || data.status !== "active") return null;
    return {
      id: data.user_id,
      email: data.email || user.email || "",
      role,
      name: data.full_name || user.email || "",
      department: data.department,
      employeeId: data.employee_id,
      status: data.status,
      supabaseUser: user,
    };
  }

  // Backward-compatible fallback for the existing in-memory demo users.
  // This never trusts role supplied by the request body/query string.
  const email = (user.email || "").toLowerCase();
  const stored = appUsersStore.find(u => u.email.toLowerCase() === email);
  const role = normalizeRole(stored?.role);
  if (!stored || !role || stored.status !== "active") return null;

  return {
    id: user.id,
    email,
    role,
    name: stored.name,
    department: stored.department,
    employeeId: stored.employeeId,
    status: stored.status,
    supabaseUser: user,
  };
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.header("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7).trim() : "";

  if (!token) {
    return res.status(401).json({ error: "Autentikasi diperlukan." });
  }
  if (!supabase) {
    return res.status(503).json({
      error: "Supabase Auth belum dikonfigurasi di server. Set SUPABASE_URL dan SUPABASE_ANON_KEY."
    });
  }

  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) {
      return res.status(401).json({ error: "Token autentikasi tidak valid atau sudah kedaluwarsa." });
    }

    // Use a token-bound client for RLS-backed profile lookup.
    const userClient = createClient(supabaseUrl!, supabaseKey!, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
      global: { headers: { Authorization: `Bearer ${token}` } }
    });
    const previous = supabase;
    void previous;

    const { data: profileData, error: profileError } = await userClient
      .from("user_roles")
      .select("user_id,email,full_name,role,department,employee_id,status")
      .eq("user_id", data.user.id)
      .maybeSingle();

    let profile: AuthenticatedUser | null = null;
    if (!profileError && profileData) {
      const role = normalizeRole(profileData.role);
      if (role && profileData.status === "active") {
        profile = {
          id: profileData.user_id,
          email: profileData.email || data.user.email || "",
          role,
          name: profileData.full_name || data.user.email || "",
          department: profileData.department,
          employeeId: profileData.employee_id,
          status: profileData.status,
          supabaseUser: data.user,
        };
      }
    }

    if (!profile) profile = await resolveProfile(data.user);
    if (!profile) {
      return res.status(403).json({ error: "Akun terautentikasi belum memiliki profil/RBAC aktif." });
    }

    req.authUser = profile;
    return next();
  } catch (error) {
    console.error("Authentication middleware error:", error);
    return res.status(401).json({ error: "Gagal memverifikasi autentikasi." });
  }
}

export function requireRoles(...roles: AppRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const role = req.authUser?.role;
    if (!role || !roles.includes(role)) {
      return res.status(403).json({ error: "Akses ditolak untuk role pengguna saat ini." });
    }
    return next();
  };
}

export function authorizeApiRequest(req: Request, res: Response, next: NextFunction) {
  const role = req.authUser?.role;
  if (!role) return res.status(401).json({ error: "Autentikasi diperlukan." });

  const path = req.path;
  const method = req.method.toUpperCase();

  if (path === "/auth/me") return next();

  const allow = (roles: AppRole[]) => roles.includes(role);

  // Master employee and payroll-sensitive operations.
  if (path === "/employees" && method === "GET") {
    return allow(["Admin", "HR"]) ? next() : res.status(403).json({ error: "Hanya Admin/HR yang dapat melihat seluruh data karyawan." });
  }
  if (path.startsWith("/employees") || path === "/upload-excel") {
    return allow(["Admin", "HR"]) ? next() : res.status(403).json({ error: "Operasi master karyawan memerlukan role Admin/HR." });
  }

  if (path.startsWith("/dashboard-state")) {
    return allow(["Admin", "HR", "Manager"]) ? next() : res.status(403).json({ error: "Akses dashboard ditolak." });
  }

  if (path.startsWith("/actuary")) {
    return allow(["Admin", "HR"]) ? next() : res.status(403).json({ error: "Data aktuaria hanya dapat diakses Admin/HR." });
  }

  if (path.startsWith("/regulations") || path.startsWith("/minimum-wages")) {
    if (method === "GET" || path.endsWith("/check-compliance")) return next();
    return allow(["Admin", "HR"]) ? next() : res.status(403).json({ error: "Perubahan regulasi/UMP hanya dapat dilakukan Admin/HR." });
  }

  if (path.startsWith("/security/roles")) {
    return method === "GET"
      ? (allow(["Admin", "HR"]) ? next() : res.status(403).json({ error: "Akses RBAC ditolak." }))
      : (role === "Admin" ? next() : res.status(403).json({ error: "Hanya Admin yang dapat mengubah RBAC." }));
  }

  if (path.startsWith("/security/users")) {
    return method === "GET"
      ? (allow(["Admin", "HR"]) ? next() : res.status(403).json({ error: "Akses pengguna sistem ditolak." }))
      : (role === "Admin" ? next() : res.status(403).json({ error: "Hanya Admin yang dapat mengelola pengguna." }));
  }

  if (path.startsWith("/security/audit-logs")) {
    return role === "Admin" ? next() : res.status(403).json({ error: "Audit log hanya dapat diakses Admin." });
  }

  if (path.startsWith("/security/encrypted-catalog") || path.startsWith("/security/test-encryption")) {
    return allow(["Admin", "HR"]) ? next() : res.status(403).json({ error: "Akses data terenkripsi ditolak." });
  }

  if (path === "/chat") {
    return allow(["Admin", "HR"]) ? next() : res.status(403).json({ error: "AI Copilot dengan akses data HR hanya tersedia untuk Admin/HR." });
  }

  return next();
}
