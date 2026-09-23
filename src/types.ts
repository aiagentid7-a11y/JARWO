export interface AttendanceDailyRecord {
  date: string; // format YYYY-MM-DD
  status: 'Hadir' | 'Terlambat' | 'Absen' | 'Izin';
  notes?: string;
}

export interface Employee {
  id: string;
  globalNo: number;
  deptNo: number | null;
  name: string;
  position: string;
  nik: string;
  birthDate: string;
  age: string;
  gender: 'Laki-laki' | 'Perempuan';
  startDate: string;
  education: string;
  certification: string;
  salaryGrade: string;
  wage: string;
  bpjsTk: string;
  bpjsKes: string;
  status: 'PKWT' | 'PKWTT';
  address: string;
  phone: string;
  isLocal: boolean;
  isNonLocal: boolean;
  department: string;
  workLocation?: string;
  contractEndDate?: string;
  leaveExpiryDate?: string;
  leaveRemaining?: number;
  leaveUsed?: number;
  rosterDecision?: 'normal' | 'postponed' | 'annual' | 'special';
  postponedWeeks?: number;
  postponedNotes?: string;
  annualLeaveDuration?: number;
  specialLeaveDuration?: number;
  specialLeaveReason?: string;
  
  // New Attendance Fields
  attendanceRate?: number;
  daysPresent?: number;
  daysLate?: number;
  daysAbsent?: number;
  daysPermit?: number;
  workShift?: 'Shift 1' | 'Shift 2' | 'Regular';
  attendanceRecords?: AttendanceDailyRecord[]; // Log entri harian, sumber untuk rekap bulanan di atas

  // New Payroll/Salary Fields (Upah pokok is mapped to 'wage')
  fixedAllowance?: number;      // Tunjangan tetap
  variableAllowance?: number;   // Tunjangan tidak tetap
  mealAllowance?: number;       // Uang makan
  overtimePay?: number;         // Lembur
  incentive?: number;           // Insentif
  contractCompensation?: number; // Kompensasi kontrak PKWT
  bpjsDeduction?: number;        // Potongan BPJS
  taxRate?: number;             // PPh Final Rate
  taxMethod?: 'final' | 'pph21'; // Tax Method choice
  disableBpjs?: boolean;        // Nonaktifkan potongan BPJS
  disableTax?: boolean;         // Nonaktifkan potongan Pajak (PPh)
  
  // Recruitment & KPI Fields
  recruitmentSource?: string;   // e.g., "LinkedIn", "Referal", "JobStreet", "Disnakertrans", "Media Sosial", "Website"
  recruitmentStage?: 'Sourcing' | 'Interview' | 'Offering' | 'Hired';
  kpiScore?: number;            // e.g., 0-100
  kpiRating?: 'A' | 'B' | 'C' | 'D' | 'E'; // e.g., A=Outstanding, B=Exceeds, C=Meets, D=Needs Improvement, E=Unsatisfactory
  kpiPeriod?: string;           // e.g., "Q2 2026" or "Semester 1 - 2026"

  // Perjalanan Dinas (Business Trip) Fields
  businessTripStatus?: 'none' | 'planned' | 'active' | 'completed';
  businessTripDestination?: string;
  businessTripStartDate?: string;
  businessTripEndDate?: string;
  businessTripPurpose?: string;
  businessTripAllowance?: number;
  businessTripTransport?: string;
  businessTripNotes?: string;

  // Org Structure & Hierarchy Fields
  reportsToId?: string;
  reportsToName?: string;
  departmentId?: string;
  jobPositionId?: string;
  jobGradeId?: string;
  jobGradeLevel?: number;
  directReportsCount?: number;
}

export interface Department {
  id: string;
  code: string;
  name: string;
  description?: string;
  managerId?: string;
  managerName?: string;
  parentId?: string;
  parentName?: string;
  createdAt?: string;
}

export interface JobGrade {
  id: string;
  gradeCode: string;
  gradeName: string;
  level: number; // 1 (highest / CEO) to 10 (junior)
  minSalary?: number;
  maxSalary?: number;
  description?: string;
  createdAt?: string;
}

export interface JobPosition {
  id: string;
  title: string;
  code?: string;
  departmentId?: string;
  departmentName?: string;
  jobGradeId?: string;
  jobGradeName?: string;
  jobGradeLevel?: number;
  description?: string;
  minExperienceYears?: number;
  createdAt?: string;
}

export interface OrgTreeNode {
  id: string;
  globalNo?: number;
  nik?: string;
  name: string;
  position: string;
  department: string;
  jobGrade?: string;
  jobGradeLevel?: number;
  reportsToId?: string;
  reportsToName?: string;
  isHead?: boolean;
  phone?: string;
  status?: string;
  directReports: OrgTreeNode[];
}

export interface DepartmentStat {
  name: string;
  count: number;
  localCount: number;
  nonLocalCount: number;
  pkwtCount: number;
  pkwttCount: number;
  maleCount: number;
  femaleCount: number;
  avgAge: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ActuarialAssumption {
  id: string;
  year: number;
  salaryInflationRate: number; // e.g. 5.5 (%)
  discountRate: number;        // e.g. 6.8 (%)
  turnoverRate: number;        // e.g. 3.0 (%)
  bonusMonths: number;         // e.g. 1.0 (bulan)
  allowanceGrowthRate: number; // e.g. 4.0 (%)
  notes?: string;
  createdAt?: string;
}

export interface SeveranceReserveItem {
  employeeId: string;
  nik: string;
  name: string;
  position: string;
  department: string;
  startDate: string;
  tenureYears: number;
  monthlyWage: number;
  upMonths: number;         // Uang Pesangon
  upmkMonths: number;       // Uang Penghargaan Masa Kerja
  uphMonths: number;        // Uang Penggantian Hak (15% x (UP+UPMK))
  totalMultiplierMonths: number;
  nominalGrossReserve: number;
  discountFactor: number;
  presentValueReserve: number; // Discounted
}

export interface ActuarialProjectionYear {
  year: number;
  horizonYears: number;
  activeEmployeeCount: number;
  baseSalaryProjected: number;
  bonusProjected: number;
  allowancesProjected: number;
  totalGrossRemuneration: number;
  turnoverFactor: number;
  netRemunerationAfterTurnover: number;
  discountFactor: number;
  presentValueRemuneration: number;
  severanceReserveGross: number;
  severanceReservePV: number;
}

export type RegulationCategory = 'ketenagakerjaan' | 'pengupahan' | 'PHK' | 'BPJS' | 'pajak' | 'k3' | 'lainnya';
export type RegulationStatus = 'aktif' | 'tidak_berlaku' | 'direvisi';

export interface LaborRegulation {
  id: string;
  title: string;
  category: RegulationCategory;
  summary: string;
  effectiveDate: string;
  status: RegulationStatus;
  documentNumber?: string;
  issuingAuthority?: string;
  downloadUrl?: string;
  createdAt?: string;
}

export interface MinimumWage {
  id: string;
  province: string;
  cityDistrict?: string;
  type: 'UMP' | 'UMK';
  year: number;
  amount: number;
  regulationRef?: string;
  notes?: string;
  createdAt?: string;
}

export interface WageComplianceResult {
  isCompliant: boolean;
  employeeWage: number;
  minimumWageAmount: number;
  region: string;
  type: 'UMP' | 'UMK';
  year: number;
  difference: number;
  percentageDiff: number;
  complianceStatus: 'Lulus UMK' | 'Di Bawah UMK' | 'Sesuai Pas UMK';
  regulationRef?: string;
}

export type UserRoleType = 'Admin' | 'HR' | 'Manager' | 'Employee';
export type AccessLevel = 'none' | 'view' | 'edit' | 'full';

export interface ModulePermission {
  moduleCode: string;
  moduleName: string;
  accessLevel: AccessLevel;
}

export interface UserRoleDefinition {
  id: string;
  roleName: UserRoleType;
  description: string;
  isSystemDefault: boolean;
  permissions: ModulePermission[];
  userCount?: number;
}

export interface AppUser {
  id: string;
  email: string;
  name: string;
  role: UserRoleType;
  employeeId?: string;
  department?: string;
  lastLogin?: string;
  status: 'active' | 'suspended';
}

export interface AuditLogEntry {
  id: string;
  userId: string;
  userEmail: string;
  userRole: UserRoleType;
  action: 'CREATE' | 'INSERT' | 'UPDATE' | 'DELETE' | 'VIEW_SENSITIVE' | 'LOGIN' | 'EXPORT';
  tableName: string;
  recordId?: string;
  oldData?: any;
  newData?: any;
  ipAddress?: string;
  timestamp: string;
}

export interface EncryptedFieldInfo {
  fieldName: string;
  tableName: string;
  description: string;
  algorithm: string;
  accessRequiredRole: UserRoleType[];
  status: 'Encrypted at Rest' | 'Masked on API';
}

export type IncidentType = 'kecelakaan_kerja' | 'near_miss' | 'penyakit_akibat_kerja';
export type IncidentSeverity = 'ringan' | 'sedang' | 'berat' | 'fatal';
export type BPJSClaimStatus = 'belum_diajukan' | 'diproses' | 'disetujui' | 'ditolak';

export interface IncidentReport {
  id: string;
  karyawanId: string;
  karyawanName: string;
  department: string;
  tanggalKejadian: string; // YYYY-MM-DD
  jenisInsiden: IncidentType;
  tingkatKeparahan: IncidentSeverity;
  lokasi: string;
  deskripsi: string;
  statusKlaimBpjs: BPJSClaimStatus;
  nomorKlaimBpjs?: string;
  biayaDitanggungBpjs?: number;
  tindakanKorektif: string;
  fotoBuktiUrl?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AppraisalPerformance {
  id: string;
  karyawanId: string;
  karyawanName: string;
  department: string;
  periodYear: number;
  periodQuarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  kpiScore: number; // 0-100 (e.g. 85)
  safetyComplianceScore: number; // 0-100, automatically penalized by incidents
  penaltyPointsApplied: number; // Penalty points from incidents
  overallAppraisalScore: number; // Weighted average (e.g., 80% KPI + 20% Safety)
  performanceGrade: 'A' | 'B' | 'C' | 'D' | 'E';
  notes?: string;
}

export interface DepartmentSafetyCorrelation {
  department: string;
  employeeCount: number;
  totalIncidents: number;
  incidentBySeverity: {
    ringan: number;
    sedang: number;
    berat: number;
    fatal: number;
  };
  safetyIndex: number; // Incident rate per 100 employees (e.g., (incidents / employeeCount) * 100)
  avgSafetyComplianceScore: number;
  avgKpiScore: number;
  avgOverallScore: number;
  riskLevel: 'Rendah' | 'Sedang' | 'Tinggi' | 'Sangat Kritis';
}

export interface BPJSClaimSummary {
  totalIncidents: number;
  belumDiajukanCount: number;
  diprosesCount: number;
  disetujuiCount: number;
  ditolakCount: number;
  totalBiayaKlaimDisetujui: number;
  totalBiayaKlaimDiproses: number;
}

