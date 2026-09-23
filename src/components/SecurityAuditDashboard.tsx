import React, { useState, useEffect, useMemo } from 'react';
import { 
  UserRoleDefinition, AppUser, AuditLogEntry, EncryptedFieldInfo, 
  UserRoleType, AccessLevel, ModulePermission 
} from '../types';
import { 
  ShieldCheck, Lock, Key, Eye, EyeOff, FileText, UserCheck, Search, 
  Check, X, RefreshCw, Filter, Calendar, Database, ShieldAlert, Cpu, 
  Copy, Layers, AlertTriangle, Plus, ChevronDown, ChevronRight, CheckCircle2
} from 'lucide-react';

interface SecurityAuditDashboardProps {
  currentUserRole?: UserRoleType;
  currentUserEmail?: string;
}

export default function SecurityAuditDashboard({ 
  currentUserRole = 'Admin', 
  currentUserEmail = 'admin.hr@company.com' 
}: SecurityAuditDashboardProps) {
  const [activeTab, setActiveTab] = useState<'rbac' | 'encryption' | 'audit_log' | 'sql_schema'>('rbac');

  // RBAC State
  const [roles, setRoles] = useState<UserRoleDefinition[]>([]);
  const [modules, setModules] = useState<{ moduleCode: string; moduleName: string }[]>([]);
  const [selectedRole, setSelectedRole] = useState<UserRoleType>('Admin');
  const [permissionDraft, setPermissionDraft] = useState<ModulePermission[]>([]);
  const [isEditingMatrix, setIsEditingMatrix] = useState(false);

  // User Management State
  const [users, setUsers] = useState<AppUser[]>([]);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<AppUser> | null>(null);

  // Audit Log State
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [logSearchTerm, setLogSearchTerm] = useState('');
  const [logTableFilter, setLogTableFilter] = useState('all');
  const [logActionFilter, setLogActionFilter] = useState('all');
  const [logUserFilter, setLogUserFilter] = useState('all');
  const [logStartDate, setLogStartDate] = useState('');
  const [logEndDate, setLogEndDate] = useState('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Encryption Simulator State
  const [encryptedCatalog, setEncryptedCatalog] = useState<EncryptedFieldInfo[]>([]);
  const [testInputText, setTestInputText] = useState('5000000');
  const [testFieldType, setTestFieldType] = useState<'wage' | 'nik' | 'bankAccount' | 'phone'>('wage');
  const [simulatedRole, setSimulatedRole] = useState<UserRoleType>('Employee');
  const [simResult, setSimResult] = useState<any>(null);

  // UI status
  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);

  // Fetch Roles and Permissions Matrix
  const fetchRoles = async () => {
    try {
      const res = await fetch('/api/security/roles');
      if (res.ok) {
        const json = await res.json();
        setRoles(json.roles || []);
        setModules(json.modules || []);
      }
    } catch (err) {
      console.warn('Gagal memuat RBAC roles:', err);
    }
  };

  // Fetch Users
  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/security/users');
      if (res.ok) {
        const json = await res.json();
        setUsers(json.users || []);
      }
    } catch (err) {
      console.warn('Gagal memuat pengguna:', err);
    }
  };

  // Fetch Audit Logs
  const fetchAuditLogs = async () => {
    try {
      const query = new URLSearchParams({
        userId: logUserFilter,
        tableName: logTableFilter,
        action: logActionFilter,
        startDate: logStartDate,
        endDate: logEndDate,
        search: logSearchTerm,
        requesterRole: currentUserRole
      });
      const res = await fetch(`/api/security/audit-logs?${query.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setAuditLogs(json.auditLogs || []);
      }
    } catch (err) {
      console.warn('Gagal memuat jejak audit:', err);
    }
  };

  // Fetch Encrypted Catalog
  const fetchEncryptedCatalog = async () => {
    try {
      const res = await fetch('/api/security/encrypted-catalog');
      if (res.ok) {
        const json = await res.json();
        setEncryptedCatalog(json.catalog || []);
      }
    } catch (err) {
      console.warn('Gagal memuat katalog enkripsi:', err);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      fetchRoles(),
      fetchUsers(),
      fetchAuditLogs(),
      fetchEncryptedCatalog()
    ]).finally(() => setIsLoading(false));
  }, []);

  // Update Draft permissions when selected role changes
  useEffect(() => {
    const roleDef = roles.find(r => r.roleName === selectedRole);
    if (roleDef) {
      setPermissionDraft(JSON.parse(JSON.stringify(roleDef.permissions || [])));
    }
  }, [selectedRole, roles]);

  // Handle Save Role Permissions
  const handleSaveRoleMatrix = async () => {
    const roleDef = roles.find(r => r.roleName === selectedRole);
    if (!roleDef) return;

    try {
      const res = await fetch(`/api/security/roles/${roleDef.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          permissions: permissionDraft,
          currentUserEmail,
          currentUserRole
        })
      });

      if (res.ok) {
        const json = await res.json();
        setSuccessMsg(json.message || 'Matriks hak akses berhasil diperbarui.');
        setIsEditingMatrix(false);
        fetchRoles();
        fetchAuditLogs();
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        const errJson = await res.json();
        setErrorMsg(errJson.error || 'Gagal menyimpan matriks RBAC.');
      }
    } catch (err) {
      setErrorMsg('Gagal terhubung ke server.');
    }
  };

  // Handle Save User
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser?.email || !editingUser?.name || !editingUser?.role) {
      setErrorMsg('Email, Nama, dan Role wajib diisi.');
      return;
    }

    try {
      const res = await fetch('/api/security/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editingUser,
          currentUserEmail,
          currentUserRole
        })
      });

      if (res.ok) {
        const json = await res.json();
        setSuccessMsg(json.message || 'Pengguna berhasil disimpan.');
        setIsUserModalOpen(false);
        setEditingUser(null);
        fetchUsers();
        fetchAuditLogs();
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        const errJson = await res.json();
        setErrorMsg(errJson.error || 'Gagal menyimpan pengguna.');
      }
    } catch (err) {
      setErrorMsg('Gagal terhubung ke server.');
    }
  };

  // Handle Test Encryption
  const handleRunEncryptionTest = async () => {
    try {
      const res = await fetch('/api/security/test-encryption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plainText: testInputText,
          fieldType: testFieldType,
          requesterRole: simulatedRole
        })
      });

      if (res.ok) {
        const json = await res.json();
        setSimResult(json);
        fetchAuditLogs();
      }
    } catch (err) {
      setErrorMsg('Gagal melakukan simulasi enkripsi.');
    }
  };

  // Copy SQL Script
  const copySqlScript = () => {
    const sql = `-- SKEMA SUPABASE POSTGRESQL "KEAMANAN, RBAC & AUDIT LOG"
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'Employee',
    department VARCHAR(150),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role VARCHAR(50) NOT NULL,
    module_code VARCHAR(50) NOT NULL,
    access_level VARCHAR(20) NOT NULL DEFAULT 'none',
    CONSTRAINT unique_role_module UNIQUE(role, module_code)
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_email VARCHAR(255) NOT NULL,
    user_role VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    record_id VARCHAR(100),
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
`;
    navigator.clipboard.writeText(sql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return users.filter(u => 
      u.name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      u.role.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      (u.department && u.department.toLowerCase().includes(userSearchTerm.toLowerCase()))
    );
  }, [users, userSearchTerm]);

  return (
    <div className="space-y-6 text-slate-100">
      {/* NOTIFICATION ALERTS */}
      {successMsg && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-medium flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="hover:text-white"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-medium flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="hover:text-white"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* HEADER CARD */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 md:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-purple-400 uppercase tracking-wider mb-1">
              <ShieldCheck className="w-4 h-4" /> Modul Keamanan &amp; Compliance &bull; Enterprise Governance
            </div>
            <h1 className="text-xl md:text-2xl font-black text-white font-heading">
              Keamanan Data, RBAC &amp; Audit Trail
            </h1>
            <p className="text-slate-400 text-xs md:text-sm mt-1 max-w-2xl">
              Pengaturan matriks Role-Based Access Control (RBAC), Enkripsi At-Rest pgcrypto untuk data sensitif, dan Jejak Audit (Audit Trail) otomatis tingkat database Supabase.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                fetchRoles();
                fetchUsers();
                fetchAuditLogs();
              }}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Segarkan Audit</span>
            </button>
          </div>
        </div>

        {/* SUMMARY KPI BANNER */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800/80">
          <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              <span>RBAC Role System</span>
              <Key className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className="text-base md:text-lg font-black text-white font-mono mt-1">
              {roles.length} Level Role
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Admin, HR, Mgr, Emp</div>
          </div>

          <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              <span>Modul Terlindungi</span>
              <ShieldAlert className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className="text-base md:text-lg font-black text-blue-400 font-mono mt-1">
              {modules.length} Modul
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Granular Access Control</div>
          </div>

          <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              <span>Enkripsi At-Rest</span>
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-base md:text-lg font-black text-emerald-400 font-mono mt-1">
              AES-256
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Gaji, NIK &amp; Rekening</div>
          </div>

          <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              <span>Log Jejak Audit</span>
              <FileText className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-base md:text-lg font-black text-amber-400 font-mono mt-1">
              {auditLogs.length} Aktivitas
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">DB Postgres Triggers</div>
          </div>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('rbac')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'rbac'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Key className="w-4 h-4" />
          <span>🔑 Matriks Matriks RBAC &amp; Pengguna</span>
        </button>

        <button
          onClick={() => setActiveTab('encryption')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'encryption'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>🔒 Enkripsi Data Sensitif (UU PDP)</span>
        </button>

        <button
          onClick={() => setActiveTab('audit_log')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'audit_log'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>📜 Jejak Audit (Audit Trail)</span>
        </button>

        <button
          onClick={() => setActiveTab('sql_schema')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'sql_schema'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>⚡ RLS &amp; Trigger SQL Supabase</span>
        </button>
      </div>

      {/* TAB 1: RBAC MATRIX & USERS MANAGEMENT */}
      {activeTab === 'rbac' && (
        <div className="space-y-6">
          {/* ROLE SELECTOR & MATRIX EDITOR */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Key className="w-4.5 h-4.5 text-purple-400" /> Matriks Hak Akses Per Role
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Tentukan level izin (None, View, Edit, Full) untuk setiap modul aplikasi.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                  {(['Admin', 'HR', 'Manager', 'Employee'] as UserRoleType[]).map((r) => (
                    <button
                      key={r}
                      onClick={() => {
                        setSelectedRole(r);
                        setIsEditingMatrix(false);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                        selectedRole === r ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>

                {currentUserRole === 'Admin' && (
                  !isEditingMatrix ? (
                    <button
                      onClick={() => setIsEditingMatrix(true)}
                      className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl border border-slate-700"
                    >
                      Ubah Matriks
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setIsEditingMatrix(false)}
                        className="px-3 py-1.5 bg-slate-800 text-slate-300 text-xs rounded-xl"
                      >
                        Batal
                      </button>
                      <button
                        onClick={handleSaveRoleMatrix}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl"
                      >
                        Simpan Perubahan
                      </button>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* ROLE DESCRIPTION BOX */}
            {(() => {
              const currentRoleDef = roles.find(r => r.roleName === selectedRole);
              return (
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 flex items-start justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Deskripsi Role</span>
                    <p className="text-slate-200 mt-0.5 font-medium">{currentRoleDef?.description}</p>
                  </div>
                  <span className="px-2.5 py-1 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-lg font-mono font-bold">
                    {currentRoleDef?.userCount || 0} Pengguna
                  </span>
                </div>
              );
            })()}

            {/* PERMISSIONS MATRIX TABLE */}
            <div className="overflow-x-auto border border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Modul Sistem</th>
                    <th className="px-4 py-3 text-center">None (Tidak Ada)</th>
                    <th className="px-4 py-3 text-center">View (Lihat Saja)</th>
                    <th className="px-4 py-3 text-center">Edit (Ubah Data)</th>
                    <th className="px-4 py-3 text-center">Full (Akses Penuh)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {modules.map((mod) => {
                    const perm = permissionDraft.find(p => p.moduleCode === mod.moduleCode);
                    const currentLevel = perm ? perm.accessLevel : 'none';

                    return (
                      <tr key={mod.moduleCode} className="hover:bg-slate-800/40">
                        <td className="px-4 py-3 font-sans font-bold text-slate-200">
                          {mod.moduleName}
                        </td>
                        {(['none', 'view', 'edit', 'full'] as AccessLevel[]).map((lvl) => (
                          <td key={lvl} className="px-4 py-3 text-center">
                            {isEditingMatrix ? (
                              <input
                                type="radio"
                                name={`perm-${mod.moduleCode}`}
                                checked={currentLevel === lvl}
                                onChange={() => {
                                  setPermissionDraft(prev => prev.map(p => {
                                    if (p.moduleCode === mod.moduleCode) return { ...p, accessLevel: lvl };
                                    return p;
                                  }));
                                }}
                                className="accent-purple-500 cursor-pointer"
                              />
                            ) : (
                              currentLevel === lvl ? (
                                <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold ${
                                  lvl === 'full' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                  lvl === 'edit' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                  lvl === 'view' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                  'bg-slate-800 text-slate-500'
                                }`}>
                                  ✓ {lvl.toUpperCase()}
                                </span>
                              ) : (
                                <span className="text-slate-700">&bull;</span>
                              )
                            )}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* USER ROLES MANAGEMENT TABLE */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <UserCheck className="w-4.5 h-4.5 text-blue-400" /> Daftar Pengguna System &amp; Penugasan Role
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Daftar akun pengguna terdaftar beserta peran otorisasi pada aplikasi.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative w-64">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Cari nama, email, role..."
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                  />
                </div>

                {currentUserRole === 'Admin' && (
                  <button
                    onClick={() => {
                      setEditingUser({ role: 'Employee' });
                      setIsUserModalOpen(true);
                    }}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Pengguna</span>
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Nama &amp; Email Pengguna</th>
                    <th className="px-4 py-3">ID Karyawan / Dept</th>
                    <th className="px-4 py-3 text-center">Role Otorisasi</th>
                    <th className="px-4 py-3">Login Terakhir</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-bold text-white">
                        <div>{u.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono font-normal">{u.email}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-300">
                        {u.employeeId || '-'} &bull; {u.department || 'Operations'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold font-mono ${
                          u.role === 'Admin' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                          u.role === 'HR' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                          u.role === 'Manager' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                          'bg-slate-800 text-slate-300'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-400">
                        {u.lastLogin ? new Date(u.lastLogin).toLocaleString('id-ID') : '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded text-[10px] font-bold">
                          {u.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ENCRYPTION AT-REST & MASKING */}
      {activeTab === 'encryption' && (
        <div className="space-y-6">
          {/* CATALOG OF ENCRYPTED FIELDS */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Lock className="w-4.5 h-4.5 text-emerald-400" /> Katalog Kolom Terenkripsi (At-Rest pgcrypto)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Kolom-kolom bernilai sensitif yang wajib terenkripsi sesuai UU Perlindungan Data Pribadi (PDP).
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {encryptedCatalog.map((field, idx) => (
                <div key={idx} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded font-mono text-[10px] font-bold">
                      {field.status}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">{field.algorithm}</span>
                  </div>

                  <h4 className="text-sm font-bold text-white font-mono">{field.fieldName}</h4>
                  <div className="text-[11px] text-slate-400">Tabel: <span className="font-mono text-slate-300">{field.tableName}</span></div>
                  <p className="text-xs text-slate-300">{field.description}</p>

                  <div className="pt-2 border-t border-slate-850 flex items-center gap-1 text-[10px] text-purple-400 font-mono">
                    <Key className="w-3 h-3" /> Akses Dekripsi: {field.accessRequiredRole.join(', ')}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* INTERACTIVE ENCRYPTION & MASKING SIMULATOR */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Cpu className="w-4.5 h-4.5 text-purple-400" /> Simulator Enkripsi Server-Side &amp; Masking PDP
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Uji coba input teks sensitif, lihat ciphertext terenkripsi di database, dekripsi server-side, dan penyamaran (masking) berdasarkan role.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
                <label className="block text-xs font-semibold text-slate-300">Teks Sensitif Teruji</label>
                <input
                  type="text"
                  value={testInputText}
                  onChange={(e) => setTestInputText(e.target.value)}
                  placeholder="Isi gaji, NIK, dll..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                />

                <label className="block text-xs font-semibold text-slate-300 mt-2">Jenis Teks</label>
                <select
                  value={testFieldType}
                  onChange={(e) => setTestFieldType(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="wage">Gaji / Nominal Upah</option>
                  <option value="nik">NIK Identitas (16 Digit)</option>
                  <option value="bankAccount">Nomor Rekening Bank</option>
                </select>

                <label className="block text-xs font-semibold text-slate-300 mt-2">Peran User Pengakses (Simulasi API)</label>
                <select
                  value={simulatedRole}
                  onChange={(e) => setSimulatedRole(e.target.value as UserRoleType)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-purple-500 font-bold"
                >
                  <option value="Admin">Admin (Bisa Lihat Asli)</option>
                  <option value="HR">HR (Bisa Lihat Asli)</option>
                  <option value="Manager">Manager (Ter-Masking ***)</option>
                  <option value="Employee">Employee (Ter-Masking ***)</option>
                </select>

                <button
                  onClick={handleRunEncryptionTest}
                  className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition-colors mt-2"
                >
                  Jalankan Simulasi Enkripsi
                </button>
              </div>

              {simResult && (
                <div className="lg:col-span-2 space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs">
                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase font-bold">1. Ciphertext Terenkripsi At-Rest (Simulasi Supabase Vault / pgcrypto)</span>
                    <div className="font-mono text-xs text-amber-400 break-all mt-1 bg-black p-2 rounded border border-amber-500/20">
                      {simResult.cipherTextAtRest}
                    </div>
                  </div>

                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase font-bold">2. Hasil Dekripsi Server-Side (Internal Service Role Only)</span>
                    <div className="font-mono text-xs text-emerald-400 mt-1 bg-black p-2 rounded border border-emerald-500/20">
                      {simResult.decryptedServerSide}
                    </div>
                  </div>

                  <div className={`p-3 rounded-lg border ${simResult.isMasked ? 'bg-rose-950/30 border-rose-500/30' : 'bg-emerald-950/30 border-emerald-500/30'}`}>
                    <span className="text-[10px] text-slate-400 uppercase font-bold">
                      3. Data Dikirim ke Frontend Response API (Untuk Role: {simResult.requesterRole})
                    </span>
                    <div className={`font-mono text-sm font-bold mt-1 p-2 rounded ${simResult.isMasked ? 'text-rose-400 bg-rose-950/80' : 'text-emerald-400 bg-emerald-950/80'}`}>
                      {simResult.finalValueExposedToClient}
                    </div>
                    <p className="text-[11px] mt-2 italic text-slate-300">{simResult.message}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: AUDIT TRAIL LOG VIEWER */}
      {activeTab === 'audit_log' && (
        <div className="space-y-4">
          {/* SEARCH & FILTERS */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Cari email user, tabel, atau ID record..."
                value={logSearchTerm}
                onChange={(e) => setLogSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500 placeholder-slate-600"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
              <select
                value={logTableFilter}
                onChange={(e) => setLogTableFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
              >
                <option value="all">Semua Tabel</option>
                <option value="gaji_pph">Gaji &amp; PPh</option>
                <option value="pkwt_contracts">PKWT Contracts</option>
                <option value="cuti_requests">Cuti Requests</option>
                <option value="data_pribadi_karyawan">Data Pribadi</option>
                <option value="role_permissions">Role Permissions</option>
              </select>

              <select
                value={logActionFilter}
                onChange={(e) => setLogActionFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
              >
                <option value="all">Semua Aksi</option>
                <option value="CREATE">CREATE (Tambah)</option>
                <option value="UPDATE">UPDATE (Ubah)</option>
                <option value="DELETE">DELETE (Hapus)</option>
                <option value="VIEW_SENSITIVE">VIEW_SENSITIVE (Lihat Data)</option>
              </select>

              <button
                onClick={fetchAuditLogs}
                className="px-3 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-500"
              >
                Filter
              </button>
            </div>
          </div>

          {/* AUDIT LOG TABLE */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider font-bold border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Waktu &amp; IP Address</th>
                    <th className="px-4 py-3">Pengguna &amp; Role</th>
                    <th className="px-4 py-3 text-center">Aksi DB</th>
                    <th className="px-4 py-3">Tabel Terpengaruh</th>
                    <th className="px-4 py-3">ID Record</th>
                    <th className="px-4 py-3 text-center">Detail Perubahan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {auditLogs.map((log) => {
                    const isExpanded = expandedLogId === log.id;

                    return (
                      <React.Fragment key={log.id}>
                        <tr className="hover:bg-slate-800/40 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-200">
                              {new Date(log.timestamp).toLocaleString('id-ID')}
                            </div>
                            <div className="text-[10px] text-slate-500">{log.ipAddress || '127.0.0.1'}</div>
                          </td>

                          <td className="px-4 py-3 font-sans">
                            <div className="font-bold text-white">{log.userEmail}</div>
                            <span className="text-[10px] text-purple-400 font-mono">{log.userRole}</span>
                          </td>

                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              log.action === 'CREATE' || log.action === 'INSERT' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                              log.action === 'UPDATE' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                              log.action === 'DELETE' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                              'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}>
                              {log.action}
                            </span>
                          </td>

                          <td className="px-4 py-3 font-bold text-slate-300">
                            {log.tableName}
                          </td>

                          <td className="px-4 py-3 text-slate-400 text-[11px]">
                            {log.recordId || '-'}
                          </td>

                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[10px] font-bold transition-colors flex items-center justify-center gap-1 mx-auto"
                            >
                              <span>{isExpanded ? 'Tutup' : 'Lihat Diff'}</span>
                              <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            </button>
                          </td>
                        </tr>

                        {/* EXPANDED BEFORE / AFTER JSON DIFF */}
                        {isExpanded && (
                          <tr className="bg-slate-950/90">
                            <td colSpan={6} className="p-4 border-b border-slate-800">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px]">
                                <div className="space-y-1">
                                  <span className="text-[10px] font-bold uppercase text-rose-400">Data Sebelum (Old Value)</span>
                                  <pre className="p-3 bg-black border border-slate-800 rounded-xl text-slate-300 overflow-x-auto">
                                    {log.oldData ? JSON.stringify(log.oldData, null, 2) : 'Null (Record Baru)'}
                                  </pre>
                                </div>

                                <div className="space-y-1">
                                  <span className="text-[10px] font-bold uppercase text-emerald-400">Data Sesudah (New Value)</span>
                                  <pre className="p-3 bg-black border border-slate-800 rounded-xl text-slate-300 overflow-x-auto">
                                    {log.newData ? JSON.stringify(log.newData, null, 2) : 'Null (Record Dihapus)'}
                                  </pre>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SUPABASE RLS & TRIGGER SQL SCRIPT */}
      {activeTab === 'sql_schema' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-purple-400 uppercase tracking-wider">
                <Database className="w-4 h-4" /> Skema SQL Supabase PostgreSQL (RLS, pgcrypto &amp; Triggers)
              </div>
              <button
                onClick={copySqlScript}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shadow"
              >
                {copiedSql ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedSql ? 'Tersalin!' : 'Salin SQL Script'}</span>
              </button>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Script DDL PostgreSQL ini membuat tabel user_roles, role_permissions, audit_logs, fungsi pgcrypto untuk enkripsi at-rest, serta Postgres trigger otomatis untuk audit logging.
            </p>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 font-mono text-xs text-purple-300 overflow-x-auto shadow-inner">
            <pre className="whitespace-pre-wrap leading-relaxed">
{`-- 1. TABEL AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(100) NOT NULL DEFAULT 'system',
    user_email VARCHAR(255) NOT NULL,
    user_role VARCHAR(50) NOT NULL DEFAULT 'Employee',
    action VARCHAR(50) NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
    table_name VARCHAR(100) NOT NULL,
    record_id VARCHAR(100),
    old_data JSONB,
    new_data JSONB,
    ip_address VARCHAR(50) DEFAULT '127.0.0.1',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. POSTGRES TRIGGER AUTOMATIC AUDIT LOGGING
CREATE OR REPLACE FUNCTION log_audit_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO public.audit_logs (action, table_name, record_id, old_data)
        VALUES ('DELETE', TG_TABLE_NAME, OLD.id::text, to_jsonb(OLD));
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO public.audit_logs (action, table_name, record_id, old_data, new_data)
        VALUES ('UPDATE', TG_TABLE_NAME, OLD.id::text, to_jsonb(OLD), to_jsonb(NEW));
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO public.audit_logs (action, table_name, record_id, new_data)
        VALUES ('INSERT', TG_TABLE_NAME, NEW.id::text, to_jsonb(NEW));
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;`}
            </pre>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT SYSTEM USER */}
      {isUserModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-scaleIn text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">
                {editingUser?.id ? 'Edit Pengguna System' : 'Tambah Pengguna Baru'}
              </h3>
              <button onClick={() => setIsUserModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  value={editingUser?.name || ''}
                  onChange={(e) => setEditingUser(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Nama Pengguna..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Email Perusahaan</label>
                <input
                  type="email"
                  value={editingUser?.email || ''}
                  onChange={(e) => setEditingUser(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="user@company.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-purple-500 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Role Otorisasi</label>
                <select
                  value={editingUser?.role || 'Employee'}
                  onChange={(e) => setEditingUser(prev => ({ ...prev, role: e.target.value as UserRoleType }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-purple-500 font-bold"
                >
                  <option value="Admin">Admin (Akses Penuh)</option>
                  <option value="HR">HR (Akses Operasional HR)</option>
                  <option value="Manager">Manager (Akses Tim Bawahan)</option>
                  <option value="Employee">Employee (Self-Service)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Departemen</label>
                <input
                  type="text"
                  value={editingUser?.department || ''}
                  onChange={(e) => setEditingUser(prev => ({ ...prev, department: e.target.value }))}
                  placeholder="Human Capital / Operations..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 hover:text-white rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold"
                >
                  Simpan Pengguna
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
