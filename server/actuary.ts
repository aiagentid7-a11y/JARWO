import { ActuarialAssumption, SeveranceReserveItem, ActuarialProjectionYear } from '../src/types';

// Default Actuarial Assumptions Data Store (In-Memory + File Backed / Supabase ready)
export let actuarialAssumptions: ActuarialAssumption[] = [
  {
    id: 'asmp-2025',
    year: 2025,
    salaryInflationRate: 5.0,
    discountRate: 6.5,
    turnoverRate: 3.5,
    bonusMonths: 1.0,
    allowanceGrowthRate: 4.0,
    notes: 'Asumsi realisasi tahun 2025 (Acuan Bank Indonesia & Sektor Tambang)',
    createdAt: new Date('2025-01-10').toISOString()
  },
  {
    id: 'asmp-2026',
    year: 2026,
    salaryInflationRate: 5.5,
    discountRate: 6.8,
    turnoverRate: 3.0,
    bonusMonths: 1.25,
    allowanceGrowthRate: 4.5,
    notes: 'Asumsi anggaran operasional 2026 (Site Sultra & Head Office)',
    createdAt: new Date('2026-01-15').toISOString()
  },
  {
    id: 'asmp-2027',
    year: 2027,
    salaryInflationRate: 6.0,
    discountRate: 7.0,
    turnoverRate: 2.8,
    bonusMonths: 1.5,
    allowanceGrowthRate: 5.0,
    notes: 'Proyeksi RKAB & Ekspansi Produksi 2027',
    createdAt: new Date('2026-06-01').toISOString()
  }
];

// Helper: Calculate UP, UPMK, UPH according to UU Ketenagakerjaan / PP 35 Cipta Kerja
export function calculateEmployeeSeveranceReserve(
  emp: any,
  discountRate: number = 6.8,
  asOfDate: Date = new Date()
): SeveranceReserveItem {
  const wageStr = String(emp.wage || emp.basicWage || '0').replace(/[^0-9]/g, '');
  const monthlyWage = parseInt(wageStr, 10) || 5000000;

  // Calculate Tenure in years
  let start = new Date(emp.startDate || '2022-01-01');
  if (isNaN(start.getTime())) start = new Date('2022-01-01');

  const diffMs = asOfDate.getTime() - start.getTime();
  const tenureYears = Math.max(0, Math.round((diffMs / (1000 * 60 * 60 * 24 * 365.25)) * 10) / 10);

  // Uang Pesangon (UP)
  let upMonths = 1;
  if (tenureYears >= 8) upMonths = 9;
  else if (tenureYears >= 7) upMonths = 8;
  else if (tenureYears >= 6) upMonths = 7;
  else if (tenureYears >= 5) upMonths = 6;
  else if (tenureYears >= 4) upMonths = 5;
  else if (tenureYears >= 3) upMonths = 4;
  else if (tenureYears >= 2) upMonths = 3;
  else if (tenureYears >= 1) upMonths = 2;

  // Uang Penghargaan Masa Kerja (UPMK)
  let upmkMonths = 0;
  if (tenureYears >= 24) upmkMonths = 10;
  else if (tenureYears >= 21) upmkMonths = 8;
  else if (tenureYears >= 18) upmkMonths = 7;
  else if (tenureYears >= 15) upmkMonths = 6;
  else if (tenureYears >= 12) upmkMonths = 5;
  else if (tenureYears >= 9) upmkMonths = 4;
  else if (tenureYears >= 6) upmkMonths = 3;
  else if (tenureYears >= 3) upmkMonths = 2;

  // Uang Penggantian Hak (UPH) = 15% x (UP + UPMK)
  const uphMonths = Math.round((upMonths + upmkMonths) * 0.15 * 100) / 100;
  const totalMultiplierMonths = upMonths + upmkMonths + uphMonths;

  const nominalGrossReserve = Math.round(monthlyWage * totalMultiplierMonths);
  const discountFactor = Math.round((1 / (1 + discountRate / 100)) * 10000) / 10000;
  const presentValueReserve = Math.round(nominalGrossReserve * discountFactor);

  return {
    employeeId: emp.id || `emp_${emp.globalNo}`,
    nik: emp.nik || '-',
    name: emp.name || 'Unknown',
    position: emp.position || 'Staff',
    department: emp.department || 'OPERATIONAL',
    startDate: emp.startDate || '2022-01-01',
    tenureYears,
    monthlyWage,
    upMonths,
    upmkMonths,
    uphMonths,
    totalMultiplierMonths,
    nominalGrossReserve,
    discountFactor,
    presentValueReserve
  };
}

// Helper: Calculate Multi-Year Remuneration Projections
export function calculateRemunerationProjection(
  employees: any[],
  assumption: ActuarialAssumption,
  horizonYears: number = 5,
  baseYear: number = 2026
): {
  summary: ActuarialProjectionYear[];
  departmentBreakdown: Array<{ department: string; currentCost: number; projectedCost: number; increasePercent: number }>;
} {
  const activeEmps = employees.filter(e => e.status !== 'Terminated' && e.status !== 'PHK');
  const empCount = activeEmps.length;

  // Total current monthly base salary
  const totalMonthlySalary = activeEmps.reduce((acc, emp) => {
    const w = parseInt(String(emp.wage || emp.basicWage || '0').replace(/[^0-9]/g, ''), 10) || 5000000;
    return acc + w;
  }, 0);

  const baseAnnualSalary = totalMonthlySalary * 12;

  // Total current monthly allowances
  const totalMonthlyAllowances = activeEmps.reduce((acc, emp) => {
    const fixed = emp.fixedAllowance || 0;
    const variable = emp.variableAllowance || 0;
    const meal = emp.mealAllowance || 0;
    return acc + fixed + variable + meal;
  }, 0);

  const baseAnnualAllowances = totalMonthlyAllowances * 12;

  const summary: ActuarialProjectionYear[] = [];

  for (let h = 1; h <= horizonYears; h++) {
    const targetYear = baseYear + h - 1;
    
    // Ratios compounding for horizon year h
    const salaryGrowthFactor = Math.pow(1 + assumption.salaryInflationRate / 100, h);
    const allowanceGrowthFactor = Math.pow(1 + assumption.allowanceGrowthRate / 100, h);
    const turnoverFactor = Math.pow(1 - assumption.turnoverRate / 100, h);
    const discountFactor = 1 / Math.pow(1 + assumption.discountRate / 100, h);

    const baseSalaryProjected = Math.round(baseAnnualSalary * salaryGrowthFactor);
    const bonusProjected = Math.round((baseSalaryProjected / 12) * assumption.bonusMonths);
    const allowancesProjected = Math.round(baseAnnualAllowances * allowanceGrowthFactor);

    const totalGrossRemuneration = baseSalaryProjected + bonusProjected + allowancesProjected;
    const netRemunerationAfterTurnover = Math.round(totalGrossRemuneration * turnoverFactor);
    const presentValueRemuneration = Math.round(netRemunerationAfterTurnover * discountFactor);

    // Estimate Severance Reserve for that year (gross & discounted)
    const severanceItems = activeEmps.map(emp => {
      const inflatedWage = (parseInt(String(emp.wage || '0').replace(/[^0-9]/g, ''), 10) || 5000000) * salaryGrowthFactor;
      const res = calculateEmployeeSeveranceReserve({ ...emp, wage: inflatedWage }, assumption.discountRate);
      return res;
    });

    const severanceReserveGross = severanceItems.reduce((acc, i) => acc + i.nominalGrossReserve, 0);
    const severanceReservePV = severanceItems.reduce((acc, i) => acc + i.presentValueReserve, 0);

    summary.push({
      year: targetYear,
      horizonYears: h,
      activeEmployeeCount: Math.round(empCount * turnoverFactor),
      baseSalaryProjected,
      bonusProjected,
      allowancesProjected,
      totalGrossRemuneration,
      turnoverFactor: Math.round(turnoverFactor * 10000) / 10000,
      netRemunerationAfterTurnover,
      discountFactor: Math.round(discountFactor * 10000) / 10000,
      presentValueRemuneration,
      severanceReserveGross,
      severanceReservePV
    });
  }

  // Department Breakdown for Year 1 Projection
  const deptMap = new Map<string, { currentCost: number; projectedCost: number }>();
  activeEmps.forEach(emp => {
    const dept = emp.department || 'LAINNYA';
    const wage = parseInt(String(emp.wage || '0').replace(/[^0-9]/g, ''), 10) || 5000000;
    const currentAnnual = wage * 12;
    const projectedAnnual = currentAnnual * (1 + assumption.salaryInflationRate / 100);

    const curr = deptMap.get(dept) || { currentCost: 0, projectedCost: 0 };
    deptMap.set(dept, {
      currentCost: curr.currentCost + currentAnnual,
      projectedCost: curr.projectedCost + projectedAnnual
    });
  });

  const departmentBreakdown = Array.from(deptMap.entries()).map(([department, data]) => {
    const inc = data.currentCost > 0 ? ((data.projectedCost - data.currentCost) / data.currentCost) * 100 : 0;
    return {
      department,
      currentCost: Math.round(data.currentCost),
      projectedCost: Math.round(data.projectedCost),
      increasePercent: Math.round(inc * 10) / 10
    };
  });

  return { summary, departmentBreakdown };
}
