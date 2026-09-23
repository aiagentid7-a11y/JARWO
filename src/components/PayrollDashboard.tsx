import React, { useState, useMemo } from 'react';
import { Employee } from '../types';
import { 
  Search, Filter, DollarSign, Wallet, FileText, Printer, 
  ChevronLeft, ChevronRight, Edit3, CheckCircle, Info, Sparkles, Building, AlertCircle
} from 'lucide-react';
import DataExchangeBar from './DataExchangeBar';

interface PayrollDashboardProps {
  employees: Employee[];
  onUpdateEmployee: (empId: string, updatedData: Partial<Employee>) => Promise<void>;
  onUploadSuccess?: () => void;
}

export default function PayrollDashboard({ 
  employees, 
  onUpdateEmployee,
  onUploadSuccess
}: PayrollDashboardProps) {
  // Filters & State
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Selected Employee to Edit Salary
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [formWage, setFormWage] = useState(0);
  const [formFixedAllowance, setFormFixedAllowance] = useState(0);
  const [formVariableAllowance, setFormVariableAllowance] = useState(0);
  const [formMealAllowance, setFormMealAllowance] = useState(0);
  const [formOvertime, setFormOvertime] = useState(0);
  const [formIncentive, setFormIncentive] = useState(0);
  const [formContractCompensation, setFormContractCompensation] = useState(0);
  const [formBpjsDeduction, setFormBpjsDeduction] = useState(0);
  const [formTaxMethod, setFormTaxMethod] = useState<'final' | 'pph21'>('final');
  const [formTaxRate, setFormTaxRate] = useState(0.5); // Default PPh Final 0.5% (flat UMKM or similar flat final)
  const [formDisableBpjs, setFormDisableBpjs] = useState(false);
  const [formDisableTax, setFormDisableTax] = useState(false);
  
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Selected Employee for Slip Gaji (Payslip) View
  const [payslipEmp, setPayslipEmp] = useState<any | null>(null);

  // Departments List
  const departments = useMemo(() => {
    const depts = new Set<string>();
    employees.forEach(e => { if (e.department) depts.add(e.department); });
    return Array.from(depts).sort();
  }, [employees]);

  // Helper to parse and clean money string to float
  const parseWage = (wageStr: any): number => {
    if (wageStr === null || wageStr === undefined) return 0;
    if (typeof wageStr === 'number') return wageStr;
    const str = String(wageStr);
    if (!str) return 0;
    // Strip Rp, commas, dots, whitespace
    const clean = str.replace(/[^\d]/g, '');
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  };

  // Process all employees with complete payroll data
  const processedPayroll = useMemo(() => {
    return employees.map(emp => {
      // 1. Upah Pokok (Basic Wage)
      const basicWage = parseWage(emp.wage) || parseWage((emp as any).basicWage) || 0;

      // 2. Tunjangan Tetap
      const fixedAllowance = emp.fixedAllowance !== undefined ? emp.fixedAllowance : 0;
      
      // 3. Tunjangan Tidak Tetap
      const variableAllowance = emp.variableAllowance !== undefined ? emp.variableAllowance : 0;
      
      // 4. Uang Makan
      const mealAllowance = emp.mealAllowance !== undefined ? emp.mealAllowance : 0;
      
      // 5. Lembur
      const overtimePay = emp.overtimePay !== undefined ? emp.overtimePay : 0;
      
      // 6. Insentif
      const incentive = emp.incentive !== undefined ? emp.incentive : 0;

      // 7. Kompensasi Kontrak
      const contractCompensation = emp.contractCompensation !== undefined ? emp.contractCompensation : 0;

      // 8. Potongan BPJS Sesuai Perundangan (Employee Portion: 3% BPJS TK + 1% BPJS Kes = 4% total of basic wage)
      const bpjsTkDeduction = Math.round(basicWage * 0.03);
      const bpjsKesDeduction = Math.round(Math.min(12000000, basicWage) * 0.01);
      const bpjsDeduction = emp.disableBpjs 
        ? 0 
        : (emp.bpjsDeduction !== undefined ? emp.bpjsDeduction : (bpjsTkDeduction + bpjsKesDeduction));

      // 9. Tax Method and Tax Rate
      const taxMethod = emp.taxMethod || 'final';
      const taxRate = emp.taxRate !== undefined ? emp.taxRate : 0.5; // 0.5% flat PPh Final as default

      // Calculations
      const grossSalary = basicWage + fixedAllowance + variableAllowance + mealAllowance + overtimePay + incentive + contractCompensation;
      
      let pphTax = 0;
      if (emp.disableTax) {
        pphTax = 0;
      } else if (taxMethod === 'final') {
        pphTax = Math.round(grossSalary * (taxRate / 100));
      } else {
        // Simple PPh 21 Indonesian progressive simulation
        // Deduction: Biaya Jabatan (5% up to Rp 500.000)
        const jobDed = Math.min(500000, Math.round(grossSalary * 0.05));
        const bpjsTkDed = Math.round(basicWage * 0.03); // 2% JHT + 1% JP
        const netMonth = grossSalary - jobDed - bpjsTkDed;
        const netYear = netMonth * 12;

        // PTKP (Asumsi single TK/0: Rp 54.000.000 per year)
        const ptkp = 54000000;
        const pkp = Math.max(0, netYear - ptkp);

        // Tax Progressive Rates
        let taxYear = 0;
        if (pkp <= 60000000) {
          taxYear = pkp * 0.05;
        } else if (pkp <= 250000000) {
          taxYear = (60000000 * 0.05) + ((pkp - 60000000) * 0.15);
        } else {
          taxYear = (60000000 * 0.05) + (190000000 * 0.15) + ((pkp - 250000000) * 0.25);
        }
        pphTax = Math.round(taxYear / 12);
      }

      const netSalary = grossSalary - pphTax - bpjsDeduction;

      return {
        ...emp,
        basicWage,
        fixedAllowance,
        variableAllowance,
        mealAllowance,
        overtimePay,
        incentive,
        contractCompensation,
        bpjsDeduction,
        taxMethod,
        taxRate,
        grossSalary,
        pphTax,
        netSalary
      };
    });
  }, [employees]);

  // Overall statistics calculations
  const stats = useMemo(() => {
    let totalGross = 0;
    let totalBasic = 0;
    let totalFixedAll = 0;
    let totalVarAll = 0;
    let totalMeal = 0;
    let totalOvertime = 0;
    let totalIncentive = 0;
    let totalContractComp = 0;
    let totalBpjsDeduction = 0;
    let totalTax = 0;
    let totalNet = 0;

    processedPayroll.forEach(e => {
      totalGross += e.grossSalary;
      totalBasic += e.basicWage;
      totalFixedAll += e.fixedAllowance;
      totalVarAll += e.variableAllowance;
      totalMeal += e.mealAllowance;
      totalOvertime += e.overtimePay;
      totalIncentive += e.incentive;
      totalContractComp += e.contractCompensation || 0;
      totalBpjsDeduction += e.bpjsDeduction || 0;
      totalTax += e.pphTax;
      totalNet += e.netSalary;
    });

    return {
      totalGross,
      totalBasic,
      totalFixedAll,
      totalVarAll,
      totalMeal,
      totalOvertime,
      totalIncentive,
      totalContractComp,
      totalBpjsDeduction,
      totalTax,
      totalNet
    };
  }, [processedPayroll]);

  // Department payroll costs for visual charts
  const deptPayrollCosts = useMemo(() => {
    const map: Record<string, { count: number, totalGross: number, totalNet: number }> = {};
    processedPayroll.forEach(e => {
      if (!map[e.department]) {
        map[e.department] = { count: 0, totalGross: 0, totalNet: 0 };
      }
      map[e.department].count++;
      map[e.department].totalGross += e.grossSalary;
      map[e.department].totalNet += e.netSalary;
    });

    return Object.entries(map).map(([name, data]) => ({
      name,
      gross: data.totalGross,
      net: data.totalNet,
      count: data.count
    })).sort((a, b) => b.gross - a.gross);
  }, [processedPayroll]);

  // Filter logic
  const filteredPayroll = useMemo(() => {
    return processedPayroll.filter(emp => {
      const query = (searchTerm || '').toLowerCase();
      const matchSearch = (emp.name || '').toLowerCase().includes(query) || 
                          (emp.position || '').toLowerCase().includes(query);
      const matchDept = deptFilter === '' || emp.department === deptFilter;
      return matchSearch && matchDept;
    });
  }, [processedPayroll, searchTerm, deptFilter]);

  // Pagination
  const totalItems = filteredPayroll.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const paginatedPayroll = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredPayroll.slice(start, start + itemsPerPage);
  }, [filteredPayroll, currentPage]);

  const handleOpenEdit = (emp: any) => {
    setEditingEmp(emp);
    const wageVal = emp.basicWage || parseWage(emp.wage) || 0;
    setFormWage(wageVal);
    setFormFixedAllowance(emp.fixedAllowance !== undefined ? emp.fixedAllowance : 0);
    setFormVariableAllowance(emp.variableAllowance !== undefined ? emp.variableAllowance : 0);
    setFormMealAllowance(emp.mealAllowance !== undefined ? emp.mealAllowance : 0);
    setFormOvertime(emp.overtimePay !== undefined ? emp.overtimePay : 0);
    setFormIncentive(emp.incentive !== undefined ? emp.incentive : 0);
    setFormContractCompensation(emp.contractCompensation !== undefined ? emp.contractCompensation : 0);
    setFormBpjsDeduction(emp.bpjsDeduction !== undefined ? emp.bpjsDeduction : (Math.round(wageVal * 0.03) + Math.round(Math.min(12000000, wageVal) * 0.01)));
    setFormTaxMethod(emp.taxMethod || 'final');
    setFormTaxRate(emp.taxRate !== undefined ? emp.taxRate : 0.5);
    setFormDisableBpjs(!!emp.disableBpjs);
    setFormDisableTax(!!emp.disableTax);
    setSaveSuccess(false);
  };

  const handleSaveSalary = async () => {
    if (!editingEmp) return;
    setIsSaving(true);
    try {
      // Save string version of basic wage in primary e.wage to keep synced
      const formattedWageStr = `Rp. ${formWage.toLocaleString('id-ID')}`;

      await onUpdateEmployee(editingEmp.id, {
        wage: formattedWageStr,
        fixedAllowance: formFixedAllowance,
        variableAllowance: formVariableAllowance,
        mealAllowance: formMealAllowance,
        overtimePay: formOvertime,
        incentive: formIncentive,
        contractCompensation: formContractCompensation,
        bpjsDeduction: formBpjsDeduction,
        taxMethod: formTaxMethod,
        taxRate: formTaxRate,
        disableBpjs: formDisableBpjs,
        disableTax: formDisableTax
      });
      setSaveSuccess(true);
      setTimeout(() => {
        setEditingEmp(null);
        setSaveSuccess(false);
      }, 1000);
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan data gaji karyawan.');
    } finally {
      setIsSaving(false);
    }
  };

  const formatIDR = (num: number) => {
    return `Rp ${num.toLocaleString('id-ID')}`;
  };

  const handlePrintPayslip = () => {
    window.print();
  };

  return (
    <div className="space-y-6" id="payroll-dashboard">
      
      {/* 1. TOP HEADER SUMMARY */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 relative overflow-hidden shadow-xl">
        <div className="absolute right-0 top-0 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 w-60 h-60 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-blue-400 text-xs font-bold uppercase tracking-wider mb-2">
              <Sparkles className="w-4 h-4" />
              <span>Payroll &amp; Tax Ledger</span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight leading-tight">
              Gaji, Tunjangan &amp; PPh Final
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              Kelola upah pokok, tunjangan tetap &amp; tidak tetap, kompensasi lembur, insentif, serta perhitungan Pajak Penghasilan (PPh Final atau PPh Pasal 21) terintegrasi.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-slate-950/80 p-4 rounded-2xl border border-slate-800/80 backdrop-blur-sm">
            <div className="text-right">
              <span className="text-[10px] text-slate-500 font-bold block uppercase">TOTAL PENGELUARAN GAJI NET</span>
              <strong className="text-2xl font-black text-emerald-450 font-mono">{formatIDR(stats.totalNet)}</strong>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400">
              <Wallet className="w-8 h-8" />
            </div>
          </div>
        </div>
      </div>

      {/* DATA EXPORT / IMPORT BAR */}
      <DataExchangeBar 
        data={filteredPayroll} 
        fileName="laporan_gaji_karyawan" 
        onUploadSuccess={onUploadSuccess}
        title="Kelola &amp; Ekspor Penggajian Karyawan One For All"
      />

      {/* 2. SUMMARY COUNTER CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Bruto Card */}
        <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 shadow-sm flex flex-col justify-between">
          <span className="text-[9.5px] text-slate-500 font-bold uppercase tracking-wider block">Gaji Bruto (Gross Cost)</span>
          <div className="mt-2 flex items-baseline justify-between">
            <strong className="text-lg font-bold text-slate-100 font-mono">{formatIDR(stats.totalGross)}</strong>
          </div>
          <span className="text-[9px] text-slate-400 mt-1 block">Komponen upah + tunjangan kotor</span>
        </div>

        {/* Total Pokok Card */}
        <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 shadow-sm flex flex-col justify-between">
          <span className="text-[9.5px] text-slate-500 font-bold uppercase tracking-wider block">Upah Pokok Akumulatif</span>
          <div className="mt-2 flex items-baseline justify-between">
            <strong className="text-lg font-bold text-slate-100 font-mono">{formatIDR(stats.totalBasic)}</strong>
          </div>
          <span className="text-[9px] text-slate-400 mt-1 block">
            {stats.totalBasic > 0 
              ? `Rata-rata Pokok: Rp ${Math.round(stats.totalBasic / (employees.length || 1)).toLocaleString('id-ID')}/kry`
              : 'Belum ada data gaji diunggah'}
          </span>
        </div>

        {/* Total Allowances Card */}
        <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 shadow-sm flex flex-col justify-between">
          <span className="text-[9.5px] text-slate-500 font-bold uppercase tracking-wider block">Tunjangan, Lembur &amp; Kontrak</span>
          <div className="mt-2 flex items-baseline justify-between">
            <strong className="text-lg font-bold text-slate-100 font-mono">{formatIDR(stats.totalFixedAll + stats.totalVarAll + stats.totalMeal + stats.totalOvertime + stats.totalIncentive + stats.totalContractComp)}</strong>
          </div>
          <span className="text-[9px] text-blue-450 mt-1 block">Tetap, T.Tetap, Lembur, Insentif &amp; Kontrak</span>
        </div>

        {/* Total Tax Card */}
        <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 shadow-sm flex flex-col justify-between">
          <span className="text-[9.5px] text-slate-500 font-bold uppercase tracking-wider block">Potongan Pajak &amp; BPJS</span>
          <div className="mt-2 flex items-baseline justify-between">
            <strong className="text-lg font-bold text-rose-450 font-mono">{formatIDR(stats.totalTax + stats.totalBpjsDeduction)}</strong>
          </div>
          <span className="text-[9px] text-rose-400/80 mt-1 block">PPh: {formatIDR(stats.totalTax)} | BPJS: {formatIDR(stats.totalBpjsDeduction)}</span>
        </div>
      </div>

      {/* 3. COST CHART & INFO */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Department Payroll Breakdown Chart */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-bold text-white">Distribusi Anggaran Gaji Bruto per Departemen</h3>
            </div>
            <span className="text-[10px] bg-blue-500/15 text-blue-400 border border-blue-500/20 font-bold px-2 py-0.5 rounded">Rasio Alokasi Site</span>
          </div>

          <div className="space-y-3.5 pt-2">
            {deptPayrollCosts.slice(0, 6).map((dept, index) => {
              const maxCost = deptPayrollCosts[0]?.gross || 1;
              const barPercentage = Math.round((dept.gross / maxCost) * 100);
              
              return (
                <div key={index} className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <span className="text-slate-500 font-mono text-[10px]">{index + 1}.</span>
                      <span>{dept.name}</span>
                      <span className="text-[9px] text-slate-500 font-normal">({dept.count} Kry)</span>
                    </span>
                    <span className="font-mono text-slate-100 font-bold">
                      {formatIDR(dept.gross)}
                    </span>
                  </div>
                  <div className="h-2 bg-slate-950 rounded-full overflow-hidden">
                    <div 
                      style={{ width: `${barPercentage}%` }} 
                      className="rounded-full h-full bg-gradient-to-r from-blue-600 to-indigo-500 transition-all duration-500"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Informative Help Guide Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">Komponen Gaji One For All</h3>
            </div>
            
            <p className="text-xs text-slate-400 leading-relaxed">
              Sistem mencatat upah komprehensif bagi pekerja dengan pembagian hak normatif:
            </p>

            <div className="space-y-2.5 pt-1 text-[11px] text-slate-400">
              <div>
                <strong className="text-slate-200">1. Upah Pokok &amp; Tunjangan Tetap:</strong>
                <p className="text-[10.5px] text-slate-500">Kompensasi dasar berdasarkan jabatan dan golongan pangkat (Salary Grade).</p>
              </div>
              <div>
                <strong className="text-slate-200">2. Tunjangan Tidak Tetap:</strong>
                <p className="text-[10.5px] text-slate-500">Tunjangan lapangan/site, transport, atau shift kerja non-regular.</p>
              </div>
              <div>
                <strong className="text-slate-200">3. Uang Makan &amp; Overtime (Lembur):</strong>
                <p className="text-[10.5px] text-slate-500">Uang kehadiran makan site terintegrasi, dan kompensasi jam lembur disetujui KTT.</p>
              </div>
              <div>
                <strong className="text-slate-200">4. PPh Final (0.5% - 5%):</strong>
                <p className="text-[10.5px] text-slate-500">Dihitung otomatis memotong gaji bruto untuk kewajiban pajak karyawan.</p>
              </div>
            </div>
          </div>

          <div className="bg-emerald-950/10 p-3 rounded-xl border border-emerald-500/10 text-[10px] text-emerald-400/90 leading-normal flex items-start gap-1.5">
            <CheckCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>Pajak Penghasilan (PPh) dapat ditukar metode flat (Final) maupun progresif (PPh Pasal 21 standard) per karyawan.</span>
          </div>
        </div>
      </div>

      {/* 4. FILTER BAR AND SEARCH */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
        
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="w-4 h-4 text-slate-500" />
          </span>
          <input
            type="text"
            placeholder="Cari nama atau jabatan..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-850 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
          />
        </div>

        {/* Dropdowns */}
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          {/* Department filter */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-850 px-2 py-1 rounded-xl">
            <span className="text-[10px] text-slate-500 font-bold">BAGIAN:</span>
            <select
              value={deptFilter}
              onChange={(e) => { setDeptFilter(e.target.value); setCurrentPage(1); }}
              className="bg-transparent border-none text-xs text-slate-300 font-semibold focus:outline-none cursor-pointer pr-1"
            >
              <option value="">Semua Bagian</option>
              {departments.map((d, i) => (
                <option key={i} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 5. MAIN DATA TABLE */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/60 border-b border-slate-850 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Nama &amp; Bagian</th>
                <th className="py-3 px-3">Upah Pokok</th>
                <th className="py-3 px-3 text-sky-450">Komp. Kontrak</th>
                <th className="py-3 px-3">Tunjangan (T / TT)</th>
                <th className="py-3 px-3">Uang Makan</th>
                <th className="py-3 px-3">Lembur &amp; Insentif</th>
                <th className="py-3 px-3 text-rose-450">Pot. BPJS</th>
                <th className="py-3 px-3">PPh Pajak</th>
                <th className="py-3 px-3">Gaji Bersih</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850/50 text-xs">
              {filteredPayroll.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-500 font-medium">
                    Tidak ada data gaji karyawan ditemukan.
                  </td>
                </tr>
              ) : (
                paginatedPayroll.map((emp, idx) => {
                  return (
                    <tr key={idx} className="hover:bg-slate-950/20 transition-colors group">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-200 group-hover:text-blue-400 transition-colors">{emp.name}</div>
                        <div className="text-[10px] text-slate-500 font-medium">{emp.position} &bull; {emp.department}</div>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-300">
                        {formatIDR(emp.basicWage)}
                      </td>
                      <td className="py-3 px-3 font-mono text-sky-400/95 font-medium">
                        {formatIDR(emp.contractCompensation || 0)}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-400">
                        <div className="text-[11px]">{formatIDR(emp.fixedAllowance)} <span className="text-[9px] text-slate-500">(Tetap)</span></div>
                        <div className="text-[10px] text-slate-400">{formatIDR(emp.variableAllowance)} <span className="text-[9px] text-slate-500">(T.Tetap)</span></div>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-400">
                        {formatIDR(emp.mealAllowance)}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-400">
                        <div>{formatIDR(emp.overtimePay)} <span className="text-[9px] text-slate-500">(Lembur)</span></div>
                        <div className="text-[10px] text-emerald-450">{formatIDR(emp.incentive)} <span className="text-[9px] text-slate-500">(Insentif)</span></div>
                      </td>
                      <td className="py-3 px-3 font-mono text-rose-450/95 font-medium">
                        -{formatIDR(emp.bpjsDeduction || 0)}
                      </td>
                      <td className="py-3 px-3 font-mono text-rose-450">
                        -{formatIDR(emp.pphTax)}
                        <span className="block text-[9px] text-slate-500 uppercase font-bold mt-0.5">
                          {emp.taxMethod === 'final' ? `Final ${emp.taxRate}%` : 'PPh 21 Prog'}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-emerald-400">
                        {formatIDR(emp.netSalary)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex justify-end items-center gap-1.5">
                          {/* Print Payslip button */}
                          <button
                            onClick={() => setPayslipEmp(emp)}
                            title="Cetak Slip Gaji"
                            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-all cursor-pointer border border-transparent hover:border-slate-700"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          
                          {/* Edit salary components */}
                          <button
                            onClick={() => handleOpenEdit(emp)}
                            className="px-2 py-1 rounded text-[10px] font-bold bg-slate-950 hover:bg-blue-500/10 border border-slate-800 hover:border-blue-500/30 text-slate-300 hover:text-blue-450 transition-all cursor-pointer flex items-center gap-1"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Edit Gaji</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION PANEL */}
        {totalPages > 1 && (
          <div className="bg-slate-950/60 p-3 border-t border-slate-850 flex items-center justify-between text-xs text-slate-400 font-semibold">
            <span>
              Menampilkan {Math.min(totalItems, (currentPage - 1) * itemsPerPage + 1)} - {Math.min(totalItems, currentPage * itemsPerPage)} dari {totalItems} Karyawan
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => prev - 1)}
                className="p-1 border border-slate-800 rounded bg-slate-900 hover:bg-slate-850 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-slate-300"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 font-bold text-slate-200">
                Hal {currentPage} / {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => prev + 1)}
                className="p-1 border border-slate-800 rounded bg-slate-900 hover:bg-slate-850 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-slate-300"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 6. EDIT PAYROLL COMPONENTS MODAL */}
      {editingEmp && (
        <div className="fixed inset-0 bg-slate-955/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="absolute inset-0" onClick={() => setEditingEmp(null)} />
          
          <div className="relative bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-800 overflow-hidden z-10 animate-scale-in">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-850 flex items-center justify-between bg-slate-950/40">
              <div>
                <span className="text-[10px] bg-blue-500/10 text-blue-400 font-bold border border-blue-500/20 px-2 py-0.5 rounded-full">
                  Komponen Remunerasi
                </span>
                <h3 className="text-sm font-bold text-white mt-1">Sesuaikan Gaji &amp; Tunjangan Karyawan</h3>
              </div>
              <button 
                onClick={() => setEditingEmp(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <XCircleIcon />
              </button>
            </div>

            {/* Form */}
            <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Profile card summary */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-850">
                <div className="font-bold text-white text-xs">{editingEmp.name}</div>
                <div className="text-[10px] text-slate-400 font-medium mt-0.5">{editingEmp.position} &bull; {editingEmp.department}</div>
              </div>

              {saveSuccess ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-emerald-400 animate-pulse text-xs font-bold">
                  <CheckCircle className="w-12 h-12 text-emerald-500" />
                  <span>Komponen Slip Gaji Berhasil Diupdate!</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Upah Pokok & Tunjangan Tetap */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold block uppercase mb-1">Upah Pokok (IDR)</label>
                      <input
                        type="number"
                        step="100000"
                        value={formWage}
                        onChange={(e) => setFormWage(Math.max(0, parseInt(e.target.value, 10) || 0))}
                        className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-bold font-mono focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold block uppercase mb-1">Tunjangan Tetap (IDR)</label>
                      <input
                        type="number"
                        step="50000"
                        value={formFixedAllowance}
                        onChange={(e) => setFormFixedAllowance(Math.max(0, parseInt(e.target.value, 10) || 0))}
                        className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-bold font-mono focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Tunjangan Tidak Tetap & Uang Makan */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold block uppercase mb-1">Tunj. Tidak Tetap (IDR)</label>
                      <input
                        type="number"
                        step="50000"
                        value={formVariableAllowance}
                        onChange={(e) => setFormVariableAllowance(Math.max(0, parseInt(e.target.value, 10) || 0))}
                        className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-bold font-mono focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold block uppercase mb-1">Uang Makan (IDR)</label>
                      <input
                        type="number"
                        step="50000"
                        value={formMealAllowance}
                        onChange={(e) => setFormMealAllowance(Math.max(0, parseInt(e.target.value, 10) || 0))}
                        className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-bold font-mono focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Lembur & Insentif */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold block uppercase mb-1">Lembur (IDR)</label>
                      <input
                        type="number"
                        step="10000"
                        value={formOvertime}
                        onChange={(e) => setFormOvertime(Math.max(0, parseInt(e.target.value, 10) || 0))}
                        className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-bold font-mono focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold block uppercase mb-1">Insentif Khusus (IDR)</label>
                      <input
                        type="number"
                        step="10000"
                        value={formIncentive}
                        onChange={(e) => setFormIncentive(Math.max(0, parseInt(e.target.value, 10) || 0))}
                        className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-bold font-mono focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Kompensasi Kontrak & Potongan BPJS */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 border-b border-slate-850/60 pb-3">
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold block uppercase mb-1">Kompensasi Kontrak (IDR)</label>
                      <input
                        type="number"
                        step="10000"
                        value={formContractCompensation}
                        onChange={(e) => setFormContractCompensation(Math.max(0, parseInt(e.target.value, 10) || 0))}
                        className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-bold font-mono focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] text-slate-500 font-bold block uppercase">Potongan BPJS (IDR)</label>
                        <div className="flex items-center gap-1">
                          <input
                            type="checkbox"
                            id="toggle-bpjs-deduction"
                            checked={!formDisableBpjs}
                            onChange={(e) => setFormDisableBpjs(!e.target.checked)}
                            className="rounded border-slate-800 bg-slate-950 text-blue-500 focus:ring-0 focus:ring-offset-0 w-3 h-3 cursor-pointer"
                          />
                          <label htmlFor="toggle-bpjs-deduction" className="text-[9px] text-slate-400 font-semibold cursor-pointer">
                            Aktif
                          </label>
                        </div>
                      </div>
                      <input
                        type="number"
                        step="10000"
                        disabled={formDisableBpjs}
                        value={formDisableBpjs ? 0 : formBpjsDeduction}
                        onChange={(e) => setFormBpjsDeduction(Math.max(0, parseInt(e.target.value, 10) || 0))}
                        className={`w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-bold font-mono focus:outline-none focus:border-blue-500 ${formDisableBpjs ? 'opacity-40 cursor-not-allowed' : ''}`}
                      />
                      <p className="text-[9px] text-slate-500 mt-1 leading-tight">
                        {formDisableBpjs ? '*Potongan BPJS dinonaktifkan' : `*Regulasi: BPJS TK 3% + Kes 1% = ${formatIDR(Math.round(formWage * 0.03) + Math.round(Math.min(12000000, formWage) * 0.01))} (dari Pokok)`}
                      </p>
                    </div>
                  </div>

                  {/* TAX / PPH SECTION */}
                  <div className="space-y-3.5 bg-slate-950/40 p-4 rounded-xl border border-slate-850">
                    <div className="flex items-center justify-between border-b border-slate-850/60 pb-2">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-300">
                        <FileText className="w-4 h-4 text-rose-500" />
                        <span>Metode Pemotongan Pajak Penghasilan (PPh)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          id="toggle-tax-deduction"
                          checked={!formDisableTax}
                          onChange={(e) => setFormDisableTax(!e.target.checked)}
                          className="rounded border-slate-800 bg-slate-950 text-rose-500 focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5 cursor-pointer"
                        />
                        <label htmlFor="toggle-tax-deduction" className="text-[10px] text-slate-300 font-bold cursor-pointer">
                          Aktifkan PPh
                        </label>
                      </div>
                    </div>

                    {!formDisableTax ? (
                      <>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => { setFormTaxMethod('final'); setFormTaxRate(0.5); }}
                            className={`p-2 rounded-lg text-[10.5px] font-bold border transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                              formTaxMethod === 'final'
                                ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                                : 'bg-slate-900 text-slate-400 border-transparent hover:bg-slate-850 hover:text-slate-300'
                            }`}
                          >
                            <span>PPh Final (Flat Rate)</span>
                            <span className="text-[8.5px] font-medium opacity-75">Tarif Pajak Flat Bersih</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => { setFormTaxMethod('pph21'); setFormTaxRate(0); }}
                            className={`p-2 rounded-lg text-[10.5px] font-bold border transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                              formTaxMethod === 'pph21'
                                ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                                : 'bg-slate-900 text-slate-400 border-transparent hover:bg-slate-850 hover:text-slate-300'
                            }`}
                          >
                            <span>PPh Pasal 21</span>
                            <span className="text-[8.5px] font-medium opacity-75">Tarif Progresif (UU HPP)</span>
                          </button>
                        </div>

                        {formTaxMethod === 'final' ? (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2.5">
                              <label className="text-[9.5px] text-slate-500 font-bold block uppercase">Tarif Flat PPh Final (%)</label>
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  max="30"
                                  value={formTaxRate}
                                  onChange={(e) => setFormTaxRate(Math.max(0, parseFloat(e.target.value) || 0))}
                                  className="w-16 bg-slate-950 border border-slate-850 rounded px-2 py-0.5 text-xs text-slate-200 font-bold font-mono focus:outline-none focus:border-rose-500"
                                />
                                <span className="text-xs text-slate-400">%</span>
                              </div>
                            </div>
                            <p className="text-[9.5px] text-slate-500 leading-normal">
                              *Metode PPh Final menghitung pajak sebagai persentase flat langsung dari total pendapatan kotor (gross) bulanan karyawan.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            <div className="bg-slate-950/80 p-2.5 border border-slate-850 rounded-lg text-[9.5px] text-slate-400 leading-relaxed">
                              <strong>ℹ️ Skema PPh 21 Progresif:</strong> Dihitung dengan mengurangi biaya jabatan (5% s.d Rp 500k/bln) &amp; BPJS (3% Pokok) untuk menghitung Neto, dikurangi PTKP standard TK/0 (Rp 54 Juta/thn) untuk memperoleh PKP, kemudian dikenakan tarif berlapis UU HPP (5% dst).
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-[10.5px] text-slate-400 italic text-center py-2 bg-slate-950/60 rounded-lg">
                        Pemotongan PPh dinonaktifkan untuk karyawan ini.
                      </p>
                    )}
                  </div>

                  {/* Calculated Simulation Rate */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 flex flex-col gap-2.5">
                    <div className="flex justify-between text-xs border-b border-slate-900 pb-1.5">
                      <span className="text-slate-500">Estimasi Bruto:</span>
                      <strong className="text-slate-300 font-mono">
                        {formatIDR(formWage + formFixedAllowance + formVariableAllowance + formMealAllowance + formOvertime + formIncentive + formContractCompensation)}
                      </strong>
                    </div>

                    <div className="flex justify-between text-xs border-b border-slate-900 pb-1.5">
                      <span className="text-slate-500">Potongan BPJS (Karyawan):</span>
                      <strong className="text-rose-450 font-mono">
                        -{formatIDR(formDisableBpjs ? 0 : formBpjsDeduction)}
                      </strong>
                    </div>

                    <div className="flex justify-between text-xs border-b border-slate-900 pb-1.5">
                      <span className="text-slate-500">Potongan Pajak (PPh):</span>
                      <strong className="text-rose-450 font-mono">
                        -{formatIDR(
                          formDisableTax 
                            ? 0 
                            : (formTaxMethod === 'final' 
                                ? Math.round((formWage + formFixedAllowance + formVariableAllowance + formMealAllowance + formOvertime + formIncentive + formContractCompensation) * (formTaxRate / 100))
                                : Math.round(
                                    Math.max(0, (((formWage + formFixedAllowance + formVariableAllowance + formMealAllowance + formOvertime + formIncentive + formContractCompensation) - Math.min(500000, (formWage + formFixedAllowance + formVariableAllowance + formMealAllowance + formOvertime + formIncentive + formContractCompensation) * 0.05) - (formWage * 0.03)) * 12 - 54000000) * 0.05) / 12
                                  )
                              )
                        )}
                      </strong>
                    </div>

                    <div className="flex justify-between text-sm pt-0.5">
                      <span className="text-slate-300 font-bold">Gaji Bersih (Take Home Pay):</span>
                      <strong className="text-emerald-400 font-mono font-black">
                        {formatIDR(
                          (formWage + formFixedAllowance + formVariableAllowance + formMealAllowance + formOvertime + formIncentive + formContractCompensation) - 
                          (formDisableBpjs ? 0 : formBpjsDeduction) - 
                          (formDisableTax 
                            ? 0 
                            : (formTaxMethod === 'final' 
                                ? Math.round((formWage + formFixedAllowance + formVariableAllowance + formMealAllowance + formOvertime + formIncentive + formContractCompensation) * (formTaxRate / 100))
                                : Math.round(
                                    Math.max(0, (((formWage + formFixedAllowance + formVariableAllowance + formMealAllowance + formOvertime + formIncentive + formContractCompensation) - Math.min(500000, (formWage + formFixedAllowance + formVariableAllowance + formMealAllowance + formOvertime + formIncentive + formContractCompensation) * 0.05) - (formWage * 0.03)) * 12 - 54000000) * 0.05) / 12
                                  )
                              )
                          )
                        )}
                      </strong>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-850 flex items-center justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={() => setEditingEmp(null)}
                      className="px-4 py-2 border border-slate-800 hover:bg-slate-850 text-slate-400 hover:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={handleSaveSalary}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 border border-blue-500 hover:border-blue-450 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md shadow-blue-950/20 disabled:opacity-50"
                    >
                      {isSaving ? 'Menyimpan...' : 'Simpan Komponen Gaji'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 7. SLIP GAJI (PAYSLIP) DISPLAY & PRINT DIALOG */}
      {payslipEmp && (
        <div className="fixed inset-0 bg-slate-955/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="absolute inset-0" onClick={() => setPayslipEmp(null)} />
          
          <div className="relative bg-white text-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-10 animate-scale-in">
            
            {/* Header Control panel (Non-printable) */}
            <div className="px-5 py-3.5 bg-slate-950 text-white flex items-center justify-between no-print">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold font-mono">SLIP GAJI BULANAN &bull; ONE FOR ALL</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintPayslip}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 border border-emerald-500 text-[11px] font-bold text-white flex items-center gap-1 cursor-pointer transition-all shadow"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak Slip (PDF)</span>
                </button>
                <button
                  onClick={() => setPayslipEmp(null)}
                  className="p-1.5 hover:bg-slate-850 rounded-lg text-slate-400 hover:text-white transition-colors"
                >
                  <XCircleIcon />
                </button>
              </div>
            </div>

            {/* Printable Area */}
            <div className="p-8 space-y-6 printable-payslip bg-white" id="payslip-print-section">
              {/* Slip Header */}
              <div className="flex justify-between items-start border-b-2 border-slate-800 pb-4">
                <div>
                  <h3 className="text-base font-extrabold tracking-tight uppercase text-slate-900">
                    One For All
                  </h3>
                  <p className="text-[10px] text-slate-500 font-medium leading-relaxed max-w-sm mt-0.5">
                    Jl. Sultra Site, Sulawesi Tenggara. Sistem Manajemen HRD &amp; Payroll Terintegrasi.
                  </p>
                </div>
                <div className="text-right">
                  <h4 className="text-lg font-black tracking-tight text-blue-600 uppercase">SLIP GAJI KARYAWAN</h4>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">Periode: Juli 2026</p>
                  <p className="text-[10px] text-slate-400 font-mono">No. Dokumen: OFA/PAY/2026-07/{payslipEmp.globalNo}</p>
                </div>
              </div>

              {/* Employee Information metadata */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-700 leading-relaxed">
                <div className="space-y-1">
                  <div>
                    <span className="text-slate-400 text-[10px] block uppercase font-bold">Nama Karyawan</span>
                    <strong className="text-slate-900 text-sm">{payslipEmp.name}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block uppercase font-bold">NIK / KTP</span>
                    <strong className="text-slate-800 font-mono">{payslipEmp.nik || '-'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block uppercase font-bold">Bagian / Departemen</span>
                    <strong className="text-slate-800">{payslipEmp.department}</strong>
                  </div>
                </div>

                <div className="space-y-1">
                  <div>
                    <span className="text-slate-400 text-[10px] block uppercase font-bold">Jabatan Kerja</span>
                    <strong className="text-slate-900 text-sm">{payslipEmp.position}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block uppercase font-bold">Hubungan Kerja</span>
                    <strong className="text-slate-850 font-bold">{payslipEmp.status}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block uppercase font-bold">Status Hubungan</span>
                    <strong className="text-slate-800">{payslipEmp.isLocal ? 'Lokal Sultra' : 'Non-Lokal'}</strong>
                  </div>
                </div>
              </div>

              {/* Earnings & Deductions breakdown table */}
              <div className="grid grid-cols-2 gap-6 text-xs text-slate-800">
                {/* 1. PENERIMAAN (EARNINGS) */}
                <div className="space-y-3">
                  <div className="border-b border-slate-800 pb-1 flex justify-between font-bold">
                    <span>A. PENERIMAAN GAJI</span>
                    <span className="text-[10px] text-slate-400 font-mono">JUMLAH (IDR)</span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Gaji/Upah Pokok</span>
                      <span className="font-mono">{payslipEmp.basicWage.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Tunjangan Tetap</span>
                      <span className="font-mono">{payslipEmp.fixedAllowance.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Tunj. Tidak Tetap</span>
                      <span className="font-mono">{payslipEmp.variableAllowance.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Tunjangan Uang Makan</span>
                      <span className="font-mono">{payslipEmp.mealAllowance.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Lembur</span>
                      <span className="font-mono">{payslipEmp.overtimePay.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Insentif Khusus</span>
                      <span className="font-mono">{payslipEmp.incentive.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between border-b border-dashed border-slate-300 pb-1">
                      <span className="text-slate-600">Kompensasi Kontrak</span>
                      <span className="font-mono">{payslipEmp.contractCompensation.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between font-bold text-slate-900 text-xs pt-0.5">
                      <span>Subtotal Bruto (Kotor)</span>
                      <span className="font-mono">{payslipEmp.grossSalary.toLocaleString('id-ID')}</span>
                    </div>
                  </div>
                </div>

                {/* 2. POTONGAN (DEDUCTIONS) */}
                <div className="space-y-3">
                  <div className="border-b border-slate-800 pb-1 flex justify-between font-bold">
                    <span>B. POTONGAN WAJIB</span>
                    <span className="text-[10px] text-slate-400 font-mono">JUMLAH (IDR)</span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-600">PPh Pajak Terutang</span>
                      <span className="font-mono text-rose-600">-{payslipEmp.pphTax.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between text-slate-500 text-[10px]">
                      <span>Metode: {payslipEmp.taxMethod === 'final' ? `PPh Final ${payslipEmp.taxRate}%` : 'PPh 21 Progresif'}</span>
                    </div>
                    <div className="flex justify-between border-b border-dashed border-slate-300 pb-1 mt-1">
                      <span className="text-slate-600">Potongan BPJS</span>
                      <span className="font-mono text-rose-600">-{payslipEmp.bpjsDeduction.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between font-bold text-rose-600 text-xs pt-0.5">
                      <span>Total Potongan</span>
                      <span className="font-mono">-{ (payslipEmp.pphTax + payslipEmp.bpjsDeduction).toLocaleString('id-ID') }</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Net Salary summary box */}
              <div className="bg-slate-900 text-white p-4 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">C. TOTAL GAJI BERSIH (TAKE HOME PAY)</span>
                  <p className="text-[10px] text-slate-400 mt-0.5">Terbilang: #{terbilangRupiah(payslipEmp.netSalary)}#</p>
                </div>
                <div className="text-right">
                  <strong className="text-xl font-mono text-emerald-400 font-black">
                    {formatIDR(payslipEmp.netSalary)}
                  </strong>
                </div>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-4 pt-8 text-xs text-center text-slate-800">
                <div className="space-y-12">
                  <p className="font-medium text-slate-500">Penerima Gaji (Karyawan),</p>
                  <strong className="block border-t border-slate-400 pt-1.5 w-48 mx-auto text-slate-800">{payslipEmp.name}</strong>
                </div>
                <div className="space-y-12">
                  <p className="font-medium text-slate-500">Disetujui oleh (HRD Manager),</p>
                  <strong className="block border-t border-slate-400 pt-1.5 w-48 mx-auto text-slate-800">ONE FOR ALL PAYROLL DEPT</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Simple Icon fallback
function XCircleIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
    </svg>
  );
}

// Simple Terbilang helper in Indonesian
function terbilangRupiah(num: number): string {
  const units = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'];
  
  function rec(n: number): string {
    if (n < 12) return units[n];
    if (n < 20) return rec(n - 10) + ' Belas';
    if (n < 100) return rec(Math.floor(n / 10)) + ' Puluh ' + rec(n % 10);
    if (n < 200) return 'Seratus ' + rec(n - 100);
    if (n < 1000) return rec(Math.floor(n / 100)) + ' Ratus ' + rec(n % 100);
    if (n < 2000) return 'Seribu ' + rec(n - 1000);
    if (n < 1000000) return rec(Math.floor(n / 1000)) + ' Ribu ' + rec(n % 1000);
    if (n < 100000000) return rec(Math.floor(n / 1000000)) + ' Juta ' + rec(n % 1000000);
    return 'Miliar';
  }
  
  return (rec(num).replace(/\s+/g, ' ') + ' Rupiah').trim();
}
