import { 
  IncidentReport, 
  AppraisalPerformance, 
  DepartmentSafetyCorrelation, 
  BPJSClaimSummary,
  UserRoleType 
} from '../src/types';

// Mock in-memory store initialized with realistic mining/industrial site data
export let incidentReportsStore: IncidentReport[] = [
  {
    id: 'inc-001',
    karyawanId: 'EMP001',
    karyawanName: 'Ahmad Subagyo',
    department: 'OPERASIONAL & TAMBANG',
    tanggalKejadian: '2026-02-14',
    jenisInsiden: 'kecelakaan_kerja',
    tingkatKeparahan: 'sedang',
    lokasi: 'Area Pit Mining Block B',
    deskripsi: 'Terpeleset di tangga Haul Truck saat inspeksi pra-operasional shift malam. Mengalami cedera pergelangan kaki ringan sampai sedang.',
    statusKlaimBpjs: 'disetujui',
    nomorKlaimBpjs: 'BPJS-JKK-2026-8812',
    biayaDitanggungBpjs: 12500000,
    tindakanKorektif: 'Pemasangan anti-slip mat pada setiap tangga Haul Truck dan re-training SOP Tiga Titik Tumpu.',
    fotoBuktiUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80',
    createdAt: new Date('2026-02-14').toISOString()
  },
  {
    id: 'inc-002',
    karyawanId: 'EMP004',
    karyawanName: 'Budi Santoso',
    department: 'WORKSHOP & MAINTENANCE',
    tanggalKejadian: '2026-03-01',
    jenisInsiden: 'near_miss',
    tingkatKeparahan: 'ringan',
    lokasi: 'Workshop Bay 3',
    deskripsi: 'Kabel jack pemotong hydraulic terkelupas dan hampir mengenai lengan mekanik saat servicing alat berat Excavator PC400.',
    statusKlaimBpjs: 'belum_diajukan',
    biayaDitanggungBpjs: 0,
    tindakanKorektif: 'Inspeksi berkala mingguan pada seluruh kabel listrik dan sistem hidrolik workshop.',
    fotoBuktiUrl: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?auto=format&fit=crop&w=600&q=80',
    createdAt: new Date('2026-03-01').toISOString()
  },
  {
    id: 'inc-003',
    karyawanId: 'EMP009',
    karyawanName: 'Doni Prasetyo',
    department: 'LOGISTIK & WAREHOUSE',
    tanggalKejadian: '2026-04-10',
    jenisInsiden: 'kecelakaan_kerja',
    tingkatKeparahan: 'berat',
    lokasi: 'Gudang Material Utama Hub Konawe',
    deskripsi: 'Tertimpa palet suku cadang akibat kegagalan hidrolik Forklift. Mengalami fraktur tulang kering kaki kanan.',
    statusKlaimBpjs: 'diproses',
    nomorKlaimBpjs: 'BPJS-JKK-2026-9934',
    biayaDitanggungBpjs: 45000000,
    tindakanKorektif: 'Penghentian operasi unit Forklift FL-02 untuk overhaul total dan wajibkan safety boot steel-toe grade A.',
    fotoBuktiUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80',
    createdAt: new Date('2026-04-10').toISOString()
  },
  {
    id: 'inc-004',
    karyawanId: 'EMP012',
    karyawanName: 'Eko Raharjo',
    department: 'PROCESSING & SMELTER',
    tanggalKejadian: '2026-05-22',
    jenisInsiden: 'penyakit_akibat_kerja',
    tingkatKeparahan: 'sedang',
    lokasi: 'Area Rotary Kiln 2',
    deskripsi: 'Pemeriksaan kesehatan berkala menunjukkan penurunan fungsi pendengaran (Noise-Induced Hearing Loss) akibat paparan kebisingan tinggi.',
    statusKlaimBpjs: 'disetujui',
    nomorKlaimBpjs: 'BPJS-PAK-2026-1102',
    biayaDitanggungBpjs: 18000000,
    tindakanKorektif: 'Rotasi kerja tiap 4 jam di zona bising tinggi dan penambahan ear muff double protection.',
    fotoBuktiUrl: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=600&q=80',
    createdAt: new Date('2026-05-22').toISOString()
  }
];

export let appraisalsStore: AppraisalPerformance[] = [
  {
    id: 'app-001',
    karyawanId: 'EMP001',
    karyawanName: 'Ahmad Subagyo',
    department: 'OPERASIONAL & TAMBANG',
    periodYear: 2026,
    periodQuarter: 'Q1',
    kpiScore: 88,
    safetyComplianceScore: 85, // Penalized -15 due to 'sedang' incident
    penaltyPointsApplied: 15,
    overallAppraisalScore: 87.4,
    performanceGrade: 'B',
    notes: 'Kinerja operasional sangat baik, namun mendapat penalti K3 karena insiden cedera pergelangan kaki.'
  },
  {
    id: 'app-002',
    karyawanId: 'EMP004',
    karyawanName: 'Budi Santoso',
    department: 'WORKSHOP & MAINTENANCE',
    periodYear: 2026,
    periodQuarter: 'Q1',
    kpiScore: 92,
    safetyComplianceScore: 95, // Penalized -5 due to 'ringan' near-miss
    penaltyPointsApplied: 5,
    overallAppraisalScore: 92.6,
    performanceGrade: 'A',
    notes: 'Inisiatif tinggi dalam pelaporan near-miss workshop.'
  },
  {
    id: 'app-003',
    karyawanId: 'EMP009',
    karyawanName: 'Doni Prasetyo',
    department: 'LOGISTIK & WAREHOUSE',
    periodYear: 2026,
    periodQuarter: 'Q2',
    kpiScore: 80,
    safetyComplianceScore: 70, // Penalized -30 due to 'berat' incident
    penaltyPointsApplied: 30,
    overallAppraisalScore: 78.0,
    performanceGrade: 'C',
    notes: 'Perlu evaluasi keselamatan kerja ketat di area gudang.'
  },
  {
    id: 'app-004',
    karyawanId: 'EMP012',
    karyawanName: 'Eko Raharjo',
    department: 'PROCESSING & SMELTER',
    periodYear: 2026,
    periodQuarter: 'Q2',
    kpiScore: 86,
    safetyComplianceScore: 85, // Penalized -15 due to PAK
    penaltyPointsApplied: 15,
    overallAppraisalScore: 85.8,
    performanceGrade: 'B',
    notes: 'Monitoring pemeriksaan audiometri rutin.'
  }
];

// Department baseline employee counts for Safety Index calculation
const DEPT_EMPLOYEE_COUNTS: Record<string, number> = {
  'OPERASIONAL & TAMBANG': 120,
  'WORKSHOP & MAINTENANCE': 45,
  'LOGISTIK & WAREHOUSE': 30,
  'PROCESSING & SMELTER': 85,
  'HSE & ENVIRONMENT': 15,
  'MANAGEMENT': 20
};

/**
 * Automatically calculates penalty points based on incident severity
 */
export function calculateSeverityPenalty(severity: string): number {
  switch (severity) {
    case 'ringan': return 5;
    case 'sedang': return 15;
    case 'berat': return 30;
    case 'fatal': return 50;
    default: return 0;
  }
}

/**
 * Add a new Incident Report and trigger auto-deduction on employee appraisal
 */
export function createIncidentReport(data: Partial<IncidentReport>): IncidentReport {
  const penalty = calculateSeverityPenalty(data.tingkatKeparahan || 'ringan');
  
  const newIncident: IncidentReport = {
    id: `inc-${Date.now().toString(36)}`,
    karyawanId: data.karyawanId || 'EMP000',
    karyawanName: data.karyawanName || 'Karyawan Tanpa Nama',
    department: (data.department || 'OPERASIONAL & TAMBANG').toUpperCase(),
    tanggalKejadian: data.tanggalKejadian || new Date().toISOString().split('T')[0],
    jenisInsiden: data.jenisInsiden || 'kecelakaan_kerja',
    tingkatKeparahan: data.tingkatKeparahan || 'ringan',
    lokasi: data.lokasi || 'Area Site',
    deskripsi: data.deskripsi || 'Tidak ada deskripsi detail.',
    statusKlaimBpjs: data.statusKlaimBpjs || 'belum_diajukan',
    nomorKlaimBpjs: data.nomorKlaimBpjs || '',
    biayaDitanggungBpjs: Number(data.biayaDitanggungBpjs) || 0,
    tindakanKorektif: data.tindakanKorektif || 'Lakukan evaluasi SOP keselamatan.',
    fotoBuktiUrl: data.fotoBuktiUrl || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80',
    createdAt: new Date().toISOString()
  };

  incidentReportsStore.unshift(newIncident);

  // Auto-deduct or update employee's safety compliance score in appraisals
  const existingAppraisalIdx = appraisalsStore.findIndex(a => 
    a.karyawanId === newIncident.karyawanId && 
    a.periodYear === 2026
  );

  if (existingAppraisalIdx >= 0) {
    const appraisal = appraisalsStore[existingAppraisalIdx];
    const newPenaltyTotal = appraisal.penaltyPointsApplied + penalty;
    const newSafetyScore = Math.max(0, 100 - newPenaltyTotal);
    const newOverall = (appraisal.kpiScore * 0.8) + (newSafetyScore * 0.2);

    appraisalsStore[existingAppraisalIdx] = {
      ...appraisal,
      penaltyPointsApplied: newPenaltyTotal,
      safetyComplianceScore: newSafetyScore,
      overallAppraisalScore: Math.round(newOverall * 10) / 10,
      notes: `${appraisal.notes || ''} [Update K3: Penalti -${penalty} poin dari insiden ${newIncident.tingkatKeparahan}]`
    };
  } else {
    // Create new appraisal entry
    const newSafetyScore = Math.max(0, 100 - penalty);
    const kpiBase = 85;
    const overall = (kpiBase * 0.8) + (newSafetyScore * 0.2);

    appraisalsStore.unshift({
      id: `app-${Date.now().toString(36)}`,
      karyawanId: newIncident.karyawanId,
      karyawanName: newIncident.karyawanName,
      department: newIncident.department,
      periodYear: 2026,
      periodQuarter: 'Q2',
      kpiScore: kpiBase,
      safetyComplianceScore: newSafetyScore,
      penaltyPointsApplied: penalty,
      overallAppraisalScore: Math.round(overall * 10) / 10,
      performanceGrade: overall >= 85 ? 'B' : 'C',
      notes: `Penalti K3 awal -${penalty} poin akibat insiden ${newIncident.tingkatKeparahan}`
    });
  }

  return newIncident;
}

/**
 * Get Safety Index and Performance Correlation breakdown by Department
 */
export function getDepartmentSafetyCorrelation(userRole?: UserRoleType, userDept?: string): DepartmentSafetyCorrelation[] {
  const departments = Object.keys(DEPT_EMPLOYEE_COUNTS);

  let filteredDepts = departments;
  if (userRole === 'Manager' && userDept) {
    filteredDepts = departments.filter(d => d.toLowerCase().includes(userDept.toLowerCase()) || userDept.toLowerCase().includes(d.toLowerCase()));
    if (filteredDepts.length === 0) filteredDepts = [userDept.toUpperCase()];
  }

  return filteredDepts.map(dept => {
    const empCount = DEPT_EMPLOYEE_COUNTS[dept] || 25;
    const deptIncidents = incidentReportsStore.filter(i => i.department.toUpperCase() === dept.toUpperCase());
    const deptAppraisals = appraisalsStore.filter(a => a.department.toUpperCase() === dept.toUpperCase());

    const severityBreakdown = {
      ringan: deptIncidents.filter(i => i.tingkatKeparahan === 'ringan').length,
      sedang: deptIncidents.filter(i => i.tingkatKeparahan === 'sedang').length,
      berat: deptIncidents.filter(i => i.tingkatKeparahan === 'berat').length,
      fatal: deptIncidents.filter(i => i.tingkatKeparahan === 'fatal').length,
    };

    const totalIncidents = deptIncidents.length;
    // Safety Index = (Total Incidents / Total Employees) * 100
    const safetyIndex = Math.round((totalIncidents / empCount) * 100 * 10) / 10;

    let avgKpi = 88;
    let avgSafetyScore = 100;
    
    if (deptAppraisals.length > 0) {
      avgKpi = Math.round(deptAppraisals.reduce((sum, a) => sum + a.kpiScore, 0) / deptAppraisals.length);
      avgSafetyScore = Math.round(deptAppraisals.reduce((sum, a) => sum + a.safetyComplianceScore, 0) / deptAppraisals.length);
    } else if (totalIncidents > 0) {
      const penaltySum = deptIncidents.reduce((s, inc) => s + calculateSeverityPenalty(inc.tingkatKeparahan), 0);
      avgSafetyScore = Math.max(0, 100 - penaltySum);
    }

    const avgOverall = Math.round(((avgKpi * 0.8) + (avgSafetyScore * 0.2)) * 10) / 10;

    let riskLevel: 'Rendah' | 'Sedang' | 'Tinggi' | 'Sangat Kritis' = 'Rendah';
    if (severityBreakdown.fatal > 0 || severityBreakdown.berat > 1 || safetyIndex > 8) {
      riskLevel = 'Sangat Kritis';
    } else if (severityBreakdown.berat > 0 || severityBreakdown.sedang > 1 || safetyIndex > 5) {
      riskLevel = 'Tinggi';
    } else if (severityBreakdown.sedang > 0 || safetyIndex > 2) {
      riskLevel = 'Sedang';
    }

    return {
      department: dept,
      employeeCount: empCount,
      totalIncidents,
      incidentBySeverity: severityBreakdown,
      safetyIndex,
      avgSafetyComplianceScore: avgSafetyScore,
      avgKpiScore: avgKpi,
      avgOverallScore: avgOverall,
      riskLevel
    };
  });
}

/**
 * Get BPJS Ketenagakerjaan Claims Summary
 */
export function getBPJSClaimsSummary(): BPJSClaimSummary {
  const totalIncidents = incidentReportsStore.length;
  const belumDiajukanCount = incidentReportsStore.filter(i => i.statusKlaimBpjs === 'belum_diajukan').length;
  const diprosesCount = incidentReportsStore.filter(i => i.statusKlaimBpjs === 'diproses').length;
  const disetujuiCount = incidentReportsStore.filter(i => i.statusKlaimBpjs === 'disetujui').length;
  const ditolakCount = incidentReportsStore.filter(i => i.statusKlaimBpjs === 'ditolak').length;

  const totalBiayaKlaimDisetujui = incidentReportsStore
    .filter(i => i.statusKlaimBpjs === 'disetujui')
    .reduce((sum, i) => sum + (i.biayaDitanggungBpjs || 0), 0);

  const totalBiayaKlaimDiproses = incidentReportsStore
    .filter(i => i.statusKlaimBpjs === 'diproses')
    .reduce((sum, i) => sum + (i.biayaDitanggungBpjs || 0), 0);

  return {
    totalIncidents,
    belumDiajukanCount,
    diprosesCount,
    disetujuiCount,
    ditolakCount,
    totalBiayaKlaimDisetujui,
    totalBiayaKlaimDiproses
  };
}
