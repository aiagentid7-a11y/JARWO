import { Employee } from './types';

/**
 * Parses Indonesian formatted date strings like "02-Nov-2021", "31-Des-2026", "17-Mei-1990"
 * into a JavaScript Date object.
 */
export function parseDateString(dateStr: any): Date | null {
  if (dateStr instanceof Date) {
    return isNaN(dateStr.getTime()) ? null : dateStr;
  }
  if (dateStr === null || dateStr === undefined) return null;
  const str = String(dateStr);
  if (str.trim() === '' || str === '-') return null;
  
  // Normalize string
  let normalized = str
    .trim()
    .replace(/Jan/i, 'Jan')
    .replace(/Feb/i, 'Feb')
    .replace(/Mar/i, 'Mar')
    .replace(/Apr/i, 'Apr')
    .replace(/Mei/i, 'May')
    .replace(/Jun/i, 'Jun')
    .replace(/Jul/i, 'Jul')
    .replace(/Agu/i, 'Aug')
    .replace(/Sep/i, 'Sep')
    .replace(/Okt/i, 'Oct')
    .replace(/Nov/i, 'Nov')
    .replace(/Des/i, 'Dec');
  
  // Try standard date parsing first
  let date = new Date(normalized);
  if (!isNaN(date.getTime())) {
    return date;
  }
  
  // Split manually (e.g. DD-MMM-YYYY)
  const parts = str.split('-');
  if (parts.length === 3) {
    const monthsMap: Record<string, number> = {
      'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'Mei': 4, 'Jun': 5,
      'Jul': 6, 'Agu': 7, 'Sep': 8, 'Okt': 9, 'Nov': 10, 'Des': 11,
      'Oct': 9, 'Dec': 11, 'May': 4, 'Aug': 7,
      '01': 0, '02': 1, '03': 2, '04': 3, '05': 4, '06': 5,
      '07': 6, '08': 7, '09': 8, '10': 9, '11': 10, '12': 11
    };
    
    const day = parseInt(parts[0], 10);
    const monthStr = parts[1].trim();
    
    let month = monthsMap[monthStr];
    if (month === undefined) {
      // try checking if it's month name starting characters
      const matchedMonthKey = Object.keys(monthsMap).find(
        k => monthStr.toLowerCase().startsWith(k.toLowerCase().substring(0, 3))
      );
      if (matchedMonthKey) {
        month = monthsMap[matchedMonthKey];
      } else {
        month = parseInt(monthStr, 10) - 1;
      }
    }
    
    let year = parseInt(parts[2], 10);
    if (year < 100) {
      year += year > 50 ? 1900 : 2000;
    }
    
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) {
      return d;
    }
  }
  
  return null;
}

/**
 * Checks whether a given BPJS TK or BPJS Kesehatan string represents a valid registered account number.
 * Returns false if value is null, undefined, empty, dash (-), '0', 'BELUM TERDAFTAR', 'TIDAK ADA', etc.
 */
export function isBpjsRegistered(val: string | number | null | undefined): boolean {
  if (val === null || val === undefined) return false;
  const s = String(val).trim().toUpperCase();
  if (
    s === '' || 
    s === '-' || 
    s === '0' || 
    s === '0.0' || 
    s === 'BELUM TERDAFTAR' || 
    s === 'BELUM DAFTAR' ||
    s === 'TIDAK ADA' || 
    s === 'TIDAK TERDAFTAR' || 
    s === 'NONE' || 
    s === 'N/A' || 
    s === 'NULL' ||
    s.startsWith('210000') ||
    s.startsWith('0000') ||
    s === '12345' ||
    s === '123456789' ||
    s === '1234567890'
  ) {
    return false;
  }
  return true;
}

export interface ReminderAlert {
  employee: Employee;
  daysLeft: number;
  label: string;
  severity: 'expired' | 'critical' | 'warning' | 'safe';
}

/**
 * Calculates days left and status severity for an expiration date.
 */
export function getDaysLeftAndSeverity(
  dateStr: any,
  refDate: Date = new Date('2026-07-15T00:00:00') // Local baseline date from metadata
): { daysLeft: number; label: string; severity: ReminderAlert['severity'] } | null {
  if (dateStr === null || dateStr === undefined) return null;
  const str = String(dateStr);
  if (str.trim() === '' || str === '-') return null;
  
  const targetDate = parseDateString(str);
  if (!targetDate) return null;
  
  // Set times to midnight to calculate pure days difference
  const d1 = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate());
  const d2 = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  
  const diffTime = d2.getTime() - d1.getTime();
  const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  let label = '';
  let severity: ReminderAlert['severity'] = 'safe';
  
  if (daysLeft < 0) {
    label = `Sudah lewat (${Math.abs(daysLeft)} hari)`;
    severity = 'expired';
  } else if (daysLeft === 0) {
    label = 'Hari ini';
    severity = 'critical';
  } else if (daysLeft <= 30) {
    label = `${daysLeft} hari lagi`;
    severity = 'critical';
  } else if (daysLeft <= 90) {
    label = `${daysLeft} hari lagi`;
    severity = 'warning';
  } else {
    label = `${daysLeft} hari lagi`;
    severity = 'safe';
  }
  
  return { daysLeft, label, severity };
}

export interface Roster82Details {
  startDateStr: string;
  cycleNumber: number;
  isWorkPeriod: boolean;
  daysRemaining: number;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  nextLeaveStart: Date;
  nextLeaveEnd: Date;
  currentStatusLabel: string; // "Bekerja di Lapangan" atau "Cuti Roster"
  upcomingLeaves: Array<{ start: Date; end: Date; cycle: number; label: string }>;
}

export function formatDate(date: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const day = String(date.getDate()).padStart(2, '0');
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

export function getRoster82Details(
  startDateStr: any,
  refDate: Date = new Date('2026-07-15T00:00:00'),
  rosterDecision?: 'normal' | 'postponed' | 'annual' | 'special'
): Roster82Details | null {
  if (startDateStr === null || startDateStr === undefined) return null;
  const str = String(startDateStr);
  if (str.trim() === '' || str === '-') return null;
  
  const startDate = parseDateString(str);
  if (!startDate) return null;

  const d1 = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const dToday = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate());
  
  const diffTime = dToday.getTime() - d1.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  const workDays = 56; // 8 weeks
  const leaveDays = 14; // 2 weeks
  const cycleDays = 70; // 10 weeks
  
  let cycleNumber = 1;
  let isWorkPeriod = true;
  let daysRemaining = 0;
  let currentPeriodStart = new Date(d1);
  let currentPeriodEnd = new Date(d1);
  let nextLeaveStart = new Date(d1);
  let nextLeaveEnd = new Date(d1);
  let currentStatusLabel = '';

  const isPostponed = rosterDecision === 'postponed';
  const isAnnual = rosterDecision === 'annual';
  const isSpecial = rosterDecision === 'special';

  if (diffDays >= 0) {
    cycleNumber = Math.floor(diffDays / cycleDays) + 1;
    const position = diffDays % cycleDays;
    
    if (position < workDays) {
      isWorkPeriod = true;
      daysRemaining = workDays - position;
      currentStatusLabel = 'Bekerja di Lapangan';
      
      // Current work period dates
      currentPeriodStart = new Date(d1.getTime() + (cycleNumber - 1) * cycleDays * 24 * 60 * 60 * 1000);
      currentPeriodEnd = new Date(currentPeriodStart.getTime() + (workDays - 1) * 24 * 60 * 60 * 1000);
      
      if (isPostponed) {
        nextLeaveStart = new Date(d1.getTime() + (cycleNumber * cycleDays + 42) * 24 * 60 * 60 * 1000);
        nextLeaveEnd = new Date(nextLeaveStart.getTime() + (leaveDays - 1) * 24 * 60 * 60 * 1000);
        currentStatusLabel = 'Bekerja di Lapangan (Cuti Ditunda)';
      } else if (isAnnual) {
        nextLeaveStart = new Date(currentPeriodEnd.getTime() + 24 * 60 * 60 * 1000);
        nextLeaveEnd = new Date(nextLeaveStart.getTime() + (leaveDays - 1) * 24 * 60 * 60 * 1000);
        currentStatusLabel = 'Bekerja di Lapangan (Rencana Cuti Tahunan)';
      } else if (isSpecial) {
        nextLeaveStart = new Date(currentPeriodEnd.getTime() + 24 * 60 * 60 * 1000);
        nextLeaveEnd = new Date(nextLeaveStart.getTime() + (leaveDays - 1) * 24 * 60 * 60 * 1000);
        currentStatusLabel = 'Bekerja di Lapangan (Rencana Cuti Khusus)';
      } else {
        // Next leave dates
        nextLeaveStart = new Date(currentPeriodEnd.getTime() + 24 * 60 * 60 * 1000);
        nextLeaveEnd = new Date(nextLeaveStart.getTime() + (leaveDays - 1) * 24 * 60 * 60 * 1000);
      }
    } else {
      if (isPostponed) {
        isWorkPeriod = true;
        daysRemaining = cycleDays - position;
        currentStatusLabel = 'Bekerja di Lapangan (Cuti Ditunda)';
        
        currentPeriodStart = new Date(d1.getTime() + ((cycleNumber - 1) * cycleDays + workDays) * 24 * 60 * 60 * 1000);
        currentPeriodEnd = new Date(currentPeriodStart.getTime() + (leaveDays - 1) * 24 * 60 * 60 * 1000);
        
        nextLeaveStart = new Date(d1.getTime() + (cycleNumber * cycleDays + 42) * 24 * 60 * 60 * 1000);
        nextLeaveEnd = new Date(nextLeaveStart.getTime() + (leaveDays - 1) * 24 * 60 * 60 * 1000);
      } else if (isAnnual) {
        isWorkPeriod = false;
        daysRemaining = cycleDays - position;
        currentStatusLabel = 'Melaksanakan Cuti Tahunan (12 Hari)';
        
        nextLeaveStart = new Date(d1.getTime() + ((cycleNumber - 1) * cycleDays + workDays) * 24 * 60 * 60 * 1000);
        nextLeaveEnd = new Date(nextLeaveStart.getTime() + (leaveDays - 1) * 24 * 60 * 60 * 1000);
        
        currentPeriodStart = nextLeaveStart;
        currentPeriodEnd = nextLeaveEnd;
      } else if (isSpecial) {
        isWorkPeriod = false;
        daysRemaining = cycleDays - position;
        currentStatusLabel = 'Melaksanakan Cuti Khusus';
        
        nextLeaveStart = new Date(d1.getTime() + ((cycleNumber - 1) * cycleDays + workDays) * 24 * 60 * 60 * 1000);
        nextLeaveEnd = new Date(nextLeaveStart.getTime() + (leaveDays - 1) * 24 * 60 * 60 * 1000);
        
        currentPeriodStart = nextLeaveStart;
        currentPeriodEnd = nextLeaveEnd;
      } else {
        isWorkPeriod = false;
        daysRemaining = cycleDays - position;
        currentStatusLabel = 'Cuti Roster';
        
        // Current leave period dates
        nextLeaveStart = new Date(d1.getTime() + ((cycleNumber - 1) * cycleDays + workDays) * 24 * 60 * 60 * 1000);
        nextLeaveEnd = new Date(nextLeaveStart.getTime() + (leaveDays - 1) * 24 * 60 * 60 * 1000);
        
        currentPeriodStart = nextLeaveStart;
        currentPeriodEnd = nextLeaveEnd;
      }
    }
  } else {
    // Future start date
    cycleNumber = 1;
    isWorkPeriod = true;
    daysRemaining = Math.abs(diffDays);
    currentStatusLabel = 'Belum Mulai Kerja';
    
    currentPeriodStart = new Date(d1);
    currentPeriodEnd = new Date(currentPeriodStart.getTime() + (workDays - 1) * 24 * 60 * 60 * 1000);
    
    nextLeaveStart = new Date(currentPeriodEnd.getTime() + 24 * 60 * 60 * 1000);
    nextLeaveEnd = new Date(nextLeaveStart.getTime() + (leaveDays - 1) * 24 * 60 * 60 * 1000);
  }

  // Calculate upcoming leave periods
  const upcomingLeaves: Array<{ start: Date; end: Date; cycle: number; label: string }> = [];
  let startCycle = cycleNumber;
  
  for (let i = 0; i < 6; i++) {
    const cyc = startCycle + i;
    let lStart: Date;
    let labelSuffix = '';
    
    if (isPostponed && cyc === cycleNumber) {
      continue;
    } else if (isPostponed && cyc === cycleNumber + 1) {
      lStart = new Date(d1.getTime() + ((cyc - 1) * cycleDays + workDays - 14) * 24 * 60 * 60 * 1000);
      labelSuffix = ' (Maju 2 Minggu)';
    } else {
      lStart = new Date(d1.getTime() + ((cyc - 1) * cycleDays + workDays) * 24 * 60 * 60 * 1000);
      if (cyc === cycleNumber) {
        if (isAnnual) labelSuffix = ' (Cuti Tahunan 12 Hari)';
        if (isSpecial) labelSuffix = ' (Cuti Khusus)';
      }
    }
    
    const lEnd = new Date(lStart.getTime() + (leaveDays - 1) * 24 * 60 * 60 * 1000);
    
    // Check if leave has already passed
    if (lEnd.getTime() >= dToday.getTime()) {
      upcomingLeaves.push({
        start: lStart,
        end: lEnd,
        cycle: cyc,
        label: `Siklus ${cyc}${labelSuffix}`
      });
    }
    if (upcomingLeaves.length >= 4) break;
  }

  return {
    startDateStr,
    cycleNumber,
    isWorkPeriod,
    daysRemaining,
    currentPeriodStart,
    currentPeriodEnd,
    nextLeaveStart,
    nextLeaveEnd,
    currentStatusLabel,
    upcomingLeaves
  };
}

/**
 * Helper to parse wage string to number
 */
export function parseWageToNumber(wageStr: any): number {
  if (wageStr === null || wageStr === undefined) return 0;
  if (typeof wageStr === 'number') return wageStr;
  const str = String(wageStr);
  if (!str) return 0;
  const clean = str.replace(/[^\d]/g, '');
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

export interface CompensationDetails {
  basicWage: number;
  fixedAllowance: number;
  wageBase: number;
  totalDays: number;
  totalMonths: number;
  accruedDays: number;
  accruedMonths: number;
  projectedCompensation: number;
  accruedCompensation: number;
  isCompleted: boolean;
}

export function calculateCompensation(
  emp: Employee,
  refDate: Date = new Date('2026-07-15T00:00:00')
): CompensationDetails | null {
  if (emp.status && emp.status.toUpperCase() === 'PKWTT') {
    return null;
  }
  if (!emp.startDate || emp.startDate === '-' || !emp.contractEndDate || emp.contractEndDate === '-') {
    return null;
  }
  
  const start = parseDateString(emp.startDate);
  const endContract = parseDateString(emp.contractEndDate);
  if (!start || !endContract || endContract <= start) return null;
  
  // Calculate basic wage & fixed allowance
  const basicWage = parseWageToNumber(emp.wage) || parseWageToNumber((emp as any).basicWage) || 0;
  const fixedAllowance = emp.fixedAllowance !== undefined ? emp.fixedAllowance : 0;
  const wageBase = basicWage + fixedAllowance;
  
  // Total contract duration
  const totalDiffTime = endContract.getTime() - start.getTime();
  const totalDays = Math.max(0, Math.floor(totalDiffTime / (1000 * 60 * 60 * 24)));
  // Standard conversion to months (PP 35/2021)
  const totalMonths = totalDays / 30;
  
  // Accrued duration (up to refDate, capped at endContract)
  const effectiveEnd = refDate.getTime() > endContract.getTime() ? endContract.valueOf() : refDate.valueOf();
  const accruedDiffTime = effectiveEnd - start.getTime();
  const accruedDays = Math.max(0, Math.floor(accruedDiffTime / (1000 * 60 * 60 * 24)));
  const accruedMonths = Math.max(0, accruedDays / 30);
  
  const projectedCompensation = Math.round((totalMonths / 12) * wageBase);
  const accruedCompensation = Math.round((accruedMonths / 12) * wageBase);
  const isCompleted = refDate.getTime() >= endContract.getTime();
  
  return {
    basicWage,
    fixedAllowance,
    wageBase,
    totalDays,
    totalMonths,
    accruedDays,
    accruedMonths,
    projectedCompensation,
    accruedCompensation,
    isCompleted
  };
}

