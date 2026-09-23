import { 
  UserRoleDefinition, AppUser, AuditLogEntry, EncryptedFieldInfo, 
  UserRoleType, AccessLevel, ModulePermission 
} from '../src/types';
import crypto from 'crypto';

// Secret key for AES-256 field encryption at rest (simulating pgcrypto / Supabase Vault secret)
const ENCRYPTION_SECRET = process.env.FIELD_ENCRYPTION_SECRET || 'hr-employee-pro-super-secret-key-32b!';

/**
 * AES-256-CBC Field Encryption Helper
 */
export function encryptSensitiveField(plainText: string | number): string {
  if (plainText === undefined || plainText === null || plainText === '') return '';
  const textStr = String(plainText);
  try {
    const iv = crypto.randomBytes(16);
    const key = crypto.scryptSync(ENCRYPTION_SECRET, 'salt', 32);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(textStr, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
  } catch (err) {
    return `ENC[${Buffer.from(textStr).toString('base64')}]`;
  }
}

/**
 * AES-256-CBC Field Decryption Helper
 */
export function decryptSensitiveField(cipherText: string): string {
  if (!cipherText || typeof cipherText !== 'string') return '';
  if (!cipherText.includes(':') && !cipherText.startsWith('ENC[')) return cipherText;

  if (cipherText.startsWith('ENC[')) {
    const base64 = cipherText.replace('ENC[', '').replace(']', '');
    return Buffer.from(base64, 'base64').toString('utf8');
  }

  try {
    const [ivHex, encryptedHex] = cipherText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const key = crypto.scryptSync(ENCRYPTION_SECRET, 'salt', 32);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    return '*** TERDEKRIPSI GAGAL ***';
  }
}

/**
 * Masking Helper for unauthorized roles
 */
export function maskSensitiveField(value: string | number, type: 'nik' | 'wage' | 'bankAccount' | 'phone'): string {
  const valStr = String(value || '');
  if (!valStr) return '***';

  if (type === 'nik') {
    if (valStr.length >= 8) {
      return valStr.substring(0, 4) + '********' + valStr.substring(valStr.length - 4);
    }
    return '7403************';
  }

  if (type === 'wage') {
    return 'Rp ***.***.***';
  }

  if (type === 'bankAccount') {
    if (valStr.length >= 4) {
      return '****-****-' + valStr.substring(valStr.length - 4);
    }
    return '****-****-1234';
  }

  return '********';
}

// Default Modules in Employee Database Pro System
export const MODULE_LIST = [
  { moduleCode: 'orgstructure', moduleName: 'Struktur Organisasi & Level' },
  { moduleCode: 'pkwt', moduleName: 'Perjanjian Kerja (PKWT/PKWTT)' },
  { moduleCode: 'cuti', moduleName: 'Pengelolaan Cuti & Izin' },
  { moduleCode: 'absensi', moduleName: 'Absensi & Kehadiran' },
  { moduleCode: 'lembur', moduleName: 'Lembur & Overtime' },
  { moduleCode: 'bpjs', moduleName: 'BPJS Kesehatan & Ketenagakerjaan' },
  { moduleCode: 'gaji', moduleName: 'Gaji, Insentif & PPh 21' },
  { moduleCode: 'remunerasi', moduleName: 'Sistem Remunerasi & Graded Scale' },
  { moduleCode: 'phk', moduleName: 'Perhitungan Pesangon & PHK' },
  { moduleCode: 'datapribadi', moduleName: 'Data Pribadi Karyawan' },
  { moduleCode: 'rekrutmen', moduleName: 'Rekrutmen & Onboarding' },
  { moduleCode: 'kpi', moduleName: 'Manajemen Kinerja & KPI' },
  { moduleCode: 'dinas', moduleName: 'Perjalanan Dinas (SPPD)' },
  { moduleCode: 'regulasi', moduleName: 'Regulasi & Referensi UMK' },
  { moduleCode: 'security', moduleName: 'Keamanan, RBAC & Audit Log' }
];

// Initial Roles Definition Store
export let defaultRoleDefinitions: UserRoleDefinition[] = [
  {
    id: 'role-admin',
    roleName: 'Admin',
    description: 'Akses penuh tanpa batasan ke seluruh modul, pengaturan sistem, enkripsi data, dan audit trail.',
    isSystemDefault: true,
    userCount: 2,
    permissions: MODULE_LIST.map(m => ({ moduleCode: m.moduleCode, moduleName: m.moduleName, accessLevel: 'full' as AccessLevel }))
  },
  {
    id: 'role-hr',
    roleName: 'HR',
    description: 'Akses penuh operasional HR (PKWT, Cuti, Gaji, Rekrutmen, PHK). Tidak bisa mengubah konfigurasi role/security sistem.',
    isSystemDefault: true,
    userCount: 5,
    permissions: MODULE_LIST.map(m => {
      if (m.moduleCode === 'security') return { moduleCode: m.moduleCode, moduleName: m.moduleName, accessLevel: 'view' as AccessLevel };
      return { moduleCode: m.moduleCode, moduleName: m.moduleName, accessLevel: 'full' as AccessLevel };
    })
  },
  {
    id: 'role-manager',
    roleName: 'Manager',
    description: 'Akses approval cuti, lembur, dan evaluasi KPI tim bawahan langsung. Akses terbatas/view pada data gaji & pesangon.',
    isSystemDefault: true,
    userCount: 8,
    permissions: MODULE_LIST.map(m => {
      if (['cuti', 'absensi', 'lembur', 'kpi', 'dinas'].includes(m.moduleCode)) {
        return { moduleCode: m.moduleCode, moduleName: m.moduleName, accessLevel: 'edit' as AccessLevel };
      }
      if (['orgstructure', 'datapribadi', 'regulasi'].includes(m.moduleCode)) {
        return { moduleCode: m.moduleCode, moduleName: m.moduleName, accessLevel: 'view' as AccessLevel };
      }
      return { moduleCode: m.moduleCode, moduleName: m.moduleName, accessLevel: 'none' as AccessLevel };
    })
  },
  {
    id: 'role-employee',
    roleName: 'Employee',
    description: 'Akses portal Mandiri (Self-Service): Mengajukan cuti, lembur, perjalanan dinas, serta melihat slip gaji sendiri.',
    isSystemDefault: true,
    userCount: 145,
    permissions: MODULE_LIST.map(m => {
      if (['cuti', 'absensi', 'lembur', 'dinas'].includes(m.moduleCode)) {
        return { moduleCode: m.moduleCode, moduleName: m.moduleName, accessLevel: 'edit' as AccessLevel };
      }
      if (['gaji', 'datapribadi', 'regulasi'].includes(m.moduleCode)) {
        return { moduleCode: m.moduleCode, moduleName: m.moduleName, accessLevel: 'view' as AccessLevel };
      }
      return { moduleCode: m.moduleCode, moduleName: m.moduleName, accessLevel: 'none' as AccessLevel };
    })
  }
];

// Initial App Users Store
export let appUsersStore: AppUser[] = [
  {
    id: 'usr-001',
    email: 'admin.hr@company.com',
    name: 'Budi Santoso (System Admin)',
    role: 'Admin',
    employeeId: 'EMP-001',
    department: 'IT & Security',
    lastLogin: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    status: 'active'
  },
  {
    id: 'usr-002',
    email: 'hr.manager@company.com',
    name: 'Siti Rahmawati (HR Lead)',
    role: 'HR',
    employeeId: 'EMP-002',
    department: 'Human Capital',
    lastLogin: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    status: 'active'
  },
  {
    id: 'usr-003',
    email: 'site.manager@company.com',
    name: 'Hendrikus Subekti (Mining Site Mgr)',
    role: 'Manager',
    employeeId: 'EMP-003',
    department: 'Operations Site Konawe',
    lastLogin: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
    status: 'active'
  },
  {
    id: 'usr-004',
    email: 'operator.site@company.com',
    name: 'Agus Setiawan (Dump Truck Operator)',
    role: 'Employee',
    employeeId: 'EMP-004',
    department: 'Heavy Equipment Ops',
    lastLogin: new Date(Date.now() - 1000 * 60 * 1440).toISOString(),
    status: 'active'
  }
];

// Initial Audit Logs Store
export let auditLogsStore: AuditLogEntry[] = [
  {
    id: 'log-1001',
    userId: 'usr-001',
    userEmail: 'admin.hr@company.com',
    userRole: 'Admin',
    action: 'UPDATE',
    tableName: 'gaji_pph',
    recordId: 'EMP-004',
    oldData: { basicWage: encryptSensitiveField(3200000), position: 'Operator Junior' },
    newData: { basicWage: encryptSensitiveField(3500000), position: 'Operator Senior' },
    ipAddress: '180.252.12.89',
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString()
  },
  {
    id: 'log-1002',
    userId: 'usr-002',
    userEmail: 'hr.manager@company.com',
    userRole: 'HR',
    action: 'CREATE',
    tableName: 'pkwt_contracts',
    recordId: 'PKWT-2026-089',
    oldData: null,
    newData: { employeeName: 'Rian Hidayat', durationMonths: 12, siteLocation: 'Konawe Utara' },
    ipAddress: '103.111.20.14',
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString()
  },
  {
    id: 'log-1003',
    userId: 'usr-003',
    userEmail: 'site.manager@company.com',
    userRole: 'Manager',
    action: 'UPDATE',
    tableName: 'cuti_requests',
    recordId: 'LEAVE-992',
    oldData: { status: 'PENDING' },
    newData: { status: 'APPROVED', approvedBy: 'Hendrikus Subekti' },
    ipAddress: '114.124.21.50',
    timestamp: new Date(Date.now() - 1000 * 60 * 300).toISOString()
  },
  {
    id: 'log-1004',
    userId: 'usr-001',
    userEmail: 'admin.hr@company.com',
    userRole: 'Admin',
    action: 'VIEW_SENSITIVE',
    tableName: 'data_pribadi_karyawan',
    recordId: 'EMP-002',
    oldData: null,
    newData: { viewedFields: ['NIK', 'Nomor_Rekening', 'Gaji_Pokok'] },
    ipAddress: '180.252.12.89',
    timestamp: new Date(Date.now() - 1000 * 60 * 500).toISOString()
  }
];

// Encrypted Columns Catalog Metadata
export const ENCRYPTED_FIELDS_CATALOG: EncryptedFieldInfo[] = [
  {
    fieldName: 'wage / basic_salary',
    tableName: 'gaji_pph & employees',
    description: 'Nominal Gaji Pokok & Tunjangan Tetap Karyawan',
    algorithm: 'AES-256-CBC (pgcrypto at-rest)',
    accessRequiredRole: ['Admin', 'HR'],
    status: 'Encrypted at Rest'
  },
  {
    fieldName: 'nik (Nomor Induk Kependudukan)',
    tableName: 'data_pribadi_karyawan',
    description: '16 digit NIK Identitas Nasional sesuai UU PDP',
    algorithm: 'AES-256-CBC (pgcrypto at-rest)',
    accessRequiredRole: ['Admin', 'HR'],
    status: 'Encrypted at Rest'
  },
  {
    fieldName: 'bank_account_number',
    tableName: 'gaji_pph & employees',
    description: 'Nomor Rekening Bank Payroll Transfer Gaji',
    algorithm: 'AES-256-CBC (pgcrypto at-rest)',
    accessRequiredRole: ['Admin', 'HR'],
    status: 'Encrypted at Rest'
  },
  {
    fieldName: 'npwp / bpjs_number',
    tableName: 'bpjs & data_pribadi_karyawan',
    description: 'Nomor Pokok Wajib Pajak & Kartu BPJS Kesehatan/TK',
    algorithm: 'AES-256-CBC (pgcrypto at-rest)',
    accessRequiredRole: ['Admin', 'HR'],
    status: 'Encrypted at Rest'
  }
];

/**
 * Record an Audit Log Event
 */
export function recordAuditLog(
  userId: string,
  userEmail: string,
  userRole: UserRoleType,
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'VIEW_SENSITIVE' | 'LOGIN' | 'EXPORT',
  tableName: string,
  recordId?: string,
  oldData?: any,
  newData?: any,
  ipAddress?: string
): AuditLogEntry {
  const log: AuditLogEntry = {
    id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    userId: userId || 'sys-anon',
    userEmail: userEmail || 'system@company.com',
    userRole: userRole || 'Employee',
    action,
    tableName,
    recordId,
    oldData: oldData || null,
    newData: newData || null,
    ipAddress: ipAddress || '127.0.0.1',
    timestamp: new Date().toISOString()
  };

  auditLogsStore.unshift(log);
  // Keep last 500 audit logs in memory
  if (auditLogsStore.length > 500) {
    auditLogsStore = auditLogsStore.slice(0, 500);
  }
  return log;
}

/**
 * Check RBAC permission for a role and module
 */
export function checkPermission(roleName: UserRoleType, moduleCode: string, requiredLevel: AccessLevel): boolean {
  if (roleName === 'Admin') return true; // Admin always full

  const roleDef = defaultRoleDefinitions.find(r => r.roleName === roleName);
  if (!roleDef) return false;

  const perm = roleDef.permissions.find(p => p.moduleCode === moduleCode);
  if (!perm) return false;

  const levelHierarchy: Record<AccessLevel, number> = {
    'none': 0,
    'view': 1,
    'edit': 2,
    'full': 3
  };

  return levelHierarchy[perm.accessLevel] >= levelHierarchy[requiredLevel];
}

/**
 * Update Role Permissions Definition
 */
export function updateRolePermissions(roleId: string, updatedPermissions: ModulePermission[]): UserRoleDefinition | null {
  const idx = defaultRoleDefinitions.findIndex(r => r.id === roleId);
  if (idx !== -1) {
    defaultRoleDefinitions[idx].permissions = updatedPermissions;
    return defaultRoleDefinitions[idx];
  }
  return null;
}

/**
 * Get Filtered Audit Logs
 */
export function getFilteredAuditLogs(
  userId?: string,
  tableName?: string,
  action?: string,
  startDate?: string,
  endDate?: string,
  search?: string
): AuditLogEntry[] {
  return auditLogsStore.filter(log => {
    const matchUser = !userId || userId === 'all' || log.userId === userId || log.userEmail.includes(userId);
    const matchTable = !tableName || tableName === 'all' || log.tableName === tableName;
    const matchAction = !action || action === 'all' || log.action === action;
    const matchSearch = !search || 
      log.userEmail.toLowerCase().includes(search.toLowerCase()) ||
      log.tableName.toLowerCase().includes(search.toLowerCase()) ||
      (log.recordId && log.recordId.toLowerCase().includes(search.toLowerCase()));
    
    let matchDate = true;
    if (startDate) {
      matchDate = matchDate && new Date(log.timestamp) >= new Date(startDate);
    }
    if (endDate) {
      matchDate = matchDate && new Date(log.timestamp) <= new Date(endDate + 'T23:59:59');
    }

    return matchUser && matchTable && matchAction && matchSearch && matchDate;
  });
}
