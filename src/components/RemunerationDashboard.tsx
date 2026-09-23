import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Coins, 
  FileSpreadsheet, 
  Search, 
  Users, 
  Calculator, 
  TrendingUp, 
  Download, 
  Printer, 
  Sliders, 
  CheckCircle, 
  AlertCircle, 
  HelpCircle, 
  UserCheck, 
  DollarSign, 
  Layers, 
  Info,
  ChevronRight,
  ArrowRightLeft,
  Sparkles,
  Send,
  Bot,
  Trash2,
  AlertTriangle,
  Zap
} from 'lucide-react';
import { Employee } from '../types';

// Coefficient factors listed at the top of the image (1.05 geometric growth)
export const REMUNERATION_COEFFICIENTS = [
  1.0,          // Step 1
  1.05,         // Step 2
  1.1025,       // Step 3
  1.157625,     // Step 4
  1.21550625,   // Step 5
  1.276281563,  // Step 6
  1.340095641,  // Step 7
  1.407100423,  // Step 8
  1.477455444,  // Step 9
  1.551328216,  // Step 10
  1.628894627,  // Step 11
  1.710339358,  // Step 12
  1.795856326,  // Step 13
  1.885649142,  // Step 14
  1.979931599,  // Step 15
  2.078928179,  // Step 16
  2.182874588,  // Step 17
  2.292018318,  // Step 18
  2.406619234,  // Step 19
  2.526950195   // Step 20
];

export interface RemunerationRow {
  level: string;
  posisi: string;
  grade: number;
  salaries: number[]; // Exact values for steps 1 to 20
}

// Exact precomputed scale table matching the image attachment
export const REMUNERATION_SCALE_DATA: RemunerationRow[] = [
  {
    level: 'I',
    posisi: 'SM/KTT',
    grade: 15,
    salaries: [25073000, 26327000, 27643000, 29025000, 30477000, 32000000, 33600000, 35280000, 37044000, 38897000, 40841000, 42883000, 45028000, 47279000, 49643000, 52125000, 54731000, 57468000, 60341000, 63358000]
  },
  {
    level: 'I',
    posisi: 'SM/KTT',
    grade: 14,
    salaries: [22387000, 23506000, 24681000, 25916000, 27211000, 28572000, 30000000, 31500000, 33075000, 34729000, 36466000, 38289000, 40203000, 42213000, 44324000, 46540000, 48867000, 51311000, 53876000, 56570000]
  },
  {
    level: 'I',
    posisi: 'SM/KTT',
    grade: 13,
    salaries: [20352000, 21369000, 22438000, 23560000, 24738000, 25974000, 27273000, 28637000, 30069000, 31572000, 33151000, 34808000, 36548000, 38376000, 40295000, 42309000, 44425000, 46646000, 48978000, 51427000]
  },
  {
    level: 'II',
    posisi: 'Manajer',
    grade: 12,
    salaries: [18502000, 19427000, 20398000, 21418000, 22489000, 23613000, 24794000, 26033000, 27335000, 28702000, 30137000, 31644000, 33226000, 34887000, 36632000, 38463000, 40386000, 42405000, 44528000, 46752000]
  },
  {
    level: 'II',
    posisi: 'Manajer',
    grade: 11,
    salaries: [16519000, 17345000, 18213000, 19123000, 20079000, 21083000, 22137000, 23244000, 24406000, 25627000, 26908000, 28253000, 29666000, 31149000, 32707000, 34342000, 36059000, 37862000, 39755000, 41743000]
  },
  {
    level: 'II',
    posisi: 'Manajer',
    grade: 10,
    salaries: [14750000, 15487000, 16261000, 17074000, 17928000, 18824000, 19766000, 20754000, 21791000, 22881000, 24025000, 25226000, 26488000, 27812000, 29203000, 30663000, 32196000, 33805000, 35496000, 37270000]
  },
  {
    level: 'II',
    posisi: 'Manajer',
    grade: 9,
    salaries: [13169000, 13828000, 14519000, 15245000, 16007000, 16808000, 17648000, 18530000, 19457000, 20430000, 21451000, 22524000, 23650000, 24832000, 26074000, 27377000, 28746000, 30184000, 31693000, 33277000]
  },
  {
    level: 'III',
    posisi: 'SPV/Pengawas',
    grade: 8,
    salaries: [11452000, 12024000, 12625000, 13257000, 13919000, 14615000, 15346000, 16113000, 16919000, 17765000, 18653000, 19586000, 20565000, 21593000, 22673000, 23806000, 24997000, 26247000, 27559000, 28937000]
  },
  {
    level: 'III',
    posisi: 'Staf Kasatker',
    grade: 7,
    salaries: [10506000, 11031000, 11583000, 12162000, 12770000, 13409000, 14079000, 14783000, 15522000, 16298000, 17113000, 17969000, 18867000, 19810000, 20801000, 21841000, 22933000, 24079000, 25283000, 26548000]
  },
  {
    level: 'III',
    posisi: 'Spesialis Senior',
    grade: 6,
    salaries: [9136000, 9593000, 10072000, 10576000, 11105000, 11660000, 12243000, 12855000, 13497000, 14172000, 14881000, 15625000, 16406000, 17226000, 18088000, 18992000, 19942000, 20939000, 21986000, 23085000]
  },
  {
    level: 'III',
    posisi: 'Dll yg disetarakan',
    grade: 5,
    salaries: [7944000, 8341000, 8758000, 9196000, 9656000, 10139000, 10646000, 11178000, 11737000, 12324000, 12940000, 13587000, 14266000, 14980000, 15729000, 16515000, 17341000, 18208000, 19118000, 20074000]
  },
  {
    level: 'IV',
    posisi: 'Spesialis/Juru',
    grade: 4,
    salaries: [4294000, 4509000, 4735000, 4971000, 5220000, 5481000, 5755000, 6042000, 6345000, 6662000, 6995000, 7345000, 7712000, 8097000, 8502000, 8927000, 9374000, 9842000, 10334000, 10851000]
  },
  {
    level: 'IV',
    posisi: 'Spesialis/Juru',
    grade: 3,
    salaries: [3734000, 3921000, 4117000, 4323000, 4539000, 4766000, 5004000, 5254000, 5517000, 5793000, 6083000, 6387000, 6706000, 7041000, 7393000, 7763000, 8151000, 8559000, 8986000, 9436000]
  },
  {
    level: 'IV',
    posisi: 'Spesialis/Juru',
    grade: 2,
    salaries: [3247000, 3410000, 3580000, 3759000, 3947000, 4144000, 4352000, 4569000, 4798000, 5037000, 5289000, 5554000, 5831000, 6123000, 6429000, 6750000, 7088000, 7442000, 7814000, 8205000]
  },
  {
    level: 'IV',
    posisi: 'Spesialis/Juru',
    grade: 1,
    salaries: [2824000, 2965000, 3113000, 3269000, 3432000, 3604000, 3784000, 3973000, 4172000, 4380000, 4599000, 4829000, 5071000, 5324000, 5590000, 5870000, 6163000, 6472000, 6795000, 7135000]
  }
];

const parseWageStr = (wageVal: any): number => {
  if (wageVal === null || wageVal === undefined) return 0;
  if (typeof wageVal === 'number') return wageVal;
  const str = String(wageVal);
  const clean = str.replace(/[^0-9.-]+/g, '');
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? 0 : parsed;
};

interface Props {
  employees: Employee[];
  onUpdateEmployee?: (id: string, data: Partial<Employee>) => Promise<void>;
  onUploadSuccess?: () => void;
}

export default function RemunerationDashboard({ employees, onUpdateEmployee, onUploadSuccess }: Props) {
  const [activeSubTab, setActiveSubTab] = useState<'scale' | 'mapping' | 'simulator' | 'copilot'>('scale');
  
  // AI Copilot States
  const [copilotMessages, setCopilotMessages] = useState<{ id: string; role: 'user' | 'assistant'; content: string; timestamp: Date }[]>([
    {
      id: 'remun-welcome',
      role: 'assistant',
      content: 'Halo! Saya adalah **AI Remuneration Co-pilot (Gemini 3.5)**. Saya memiliki akses analisis komparatif atas seluruh database upah karyawan One For All.\n\nSaya siap membantu Anda:\n1. 🔍 **Audit Upah**: Menganalisis kepatuhan gaji berjalan dengan matriks regulasi resmi.\n2. 📈 **Rencana Kenaikan**: Mensimulasikan dampak anggaran kenaikan berkala karyawan.\n3. 🎯 **Rekomendasi Grade**: Memberikan usulan Grade & Step penyesuaian berbasis kinerja (KPI) secara presisi.\n\nSilakan gunakan panel **Rekomendasi AI Otomatis** di sebelah kiri untuk melakukan evaluasi performa individu, atau ketikkan pertanyaan Anda di kolom chat!',
      timestamp: new Date()
    }
  ]);
  const [copilotInput, setCopilotInput] = useState('');
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [recEmployeeId, setRecEmployeeId] = useState<string>('');
  const [isApplyingRec, setIsApplyingRec] = useState<boolean>(false);
  const [recAlert, setRecAlert] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const copilotChatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll the local chat
  useEffect(() => {
    if (copilotChatEndRef.current) {
      copilotChatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [copilotMessages, activeSubTab]);

  // AI Smart recommendation algorithm
  const aiRecommendation = useMemo(() => {
    if (!recEmployeeId) return null;
    const emp = employees.find(e => e.id === recEmployeeId);
    if (!emp) return null;

    const currentWageNum = parseWageStr(emp.wage);
    const posLower = (emp.position || '').toLowerCase();
    
    // 1. Determine recommended grade
    let grade = 6; // Default fallback
    let level = 'IV';
    let label = 'Spesialis / Juru Lapangan';

    if (posLower.includes('director') || posLower.includes('dirut') || posLower.includes('ktt') || posLower.includes('site manager') || posLower.includes('sm')) {
      grade = posLower.includes('director') || posLower.includes('dirut') ? 15 : (posLower.includes('ktt') ? 14 : 13);
      level = 'I';
      label = 'Direksi / Kepala Teknik Tambang (KTT)';
    } else if (posLower.includes('manager') || posLower.includes('manajer') || posLower.includes('kabag') || posLower.includes('superintendent')) {
      grade = posLower.includes('senior') ? 12 : (posLower.includes('superintendent') ? 11 : 10);
      level = 'II';
      label = 'Manajer / Kepala Bagian';
    } else if (posLower.includes('supervisor') || posLower.includes('spv') || posLower.includes('pengawas') || posLower.includes('foreman') || posLower.includes('staf ahli') || posLower.includes('senior staff')) {
      grade = posLower.includes('senior') ? 8 : (posLower.includes('supervisor') || posLower.includes('spv') ? 7 : 6);
      level = 'III';
      label = 'Supervisor / Staf Ahli';
    } else {
      grade = posLower.includes('surveyor') || posLower.includes('operator') || posLower.includes('driver') || posLower.includes('mekanik') ? 4 : 3;
      level = 'IV';
      label = 'Spesialis / Juru Lapangan';
    }

    // Find the scale row for the grade
    const scaleRow = REMUNERATION_SCALE_DATA.find(r => r.grade === grade) || REMUNERATION_SCALE_DATA[REMUNERATION_SCALE_DATA.length - 1];
    
    // 2. Recommend step based on current wage
    let recommendedStep = 1;
    let minDiff = Infinity;
    
    // Find the closest step to current wage
    scaleRow.salaries.forEach((sal, idx) => {
      const diff = Math.abs(sal - currentWageNum);
      if (diff < minDiff) {
        minDiff = diff;
        recommendedStep = idx + 1;
      }
    });

    // 3. Adjust step based on KPI
    const kpiScore = emp.kpiScore || 80;
    let kpiBonus = 0;
    if (kpiScore >= 90) {
      kpiBonus = 2; // Performance bonus: bump 2 steps
    } else if (kpiScore >= 80) {
      kpiBonus = 1; // Performance bonus: bump 1 step
    } else if (kpiScore < 70) {
      kpiBonus = -1; // Performance penalty: reduce 1 step
    }

    recommendedStep = Math.max(1, Math.min(20, recommendedStep + kpiBonus));
    const recommendedWage = scaleRow.salaries[recommendedStep - 1];
    const diff = recommendedWage - currentWageNum;
    const percentChange = currentWageNum > 0 ? (diff / currentWageNum) * 100 : 0;

    // 4. Generate dynamic narrative justification
    let justification = '';
    const ratingStr = emp.kpiRating || 'Baik';
    
    if (kpiScore >= 90) {
      justification = `Karyawan memiliki performa luar biasa dengan nilai KPI ${kpiScore} (${ratingStr}). Berdasarkan posisinya sebagai ${emp.position} di departemen ${emp.department}, ia ditempatkan pada level struktural ${level} (${label}) di Grade ${grade}. Langkah penyesuaian ke Step ${recommendedStep} sangat dianjurkan untuk mengapresiasi kontribusi tinggi serta menjaga daya saing upah di lokasi pertambangan One For All.`;
    } else if (kpiScore >= 80) {
      justification = `Karyawan menunjukkan kinerja yang solid dengan nilai KPI ${kpiScore} (${ratingStr}). Sebagai ${emp.position} (Level ${level}), kami merekomendasikan Grade ${grade} Step ${recommendedStep} untuk menyelaraskan upahnya dengan Skala Gaji resmi, sekaligus menyisipkan insentif progresif 1 tingkat berkala atas kestabilan kinerjanya.`;
    } else if (kpiScore >= 70) {
      justification = `Karyawan menunjukkan pencapaian target yang memadai (KPI: ${kpiScore}). Penempatan di Grade ${grade} Step ${recommendedStep} diusulkan murni untuk mengintegrasikan upah berjalan ke dalam sistem struktur skala remunerasi standar One For All tanpa bonus kenaikan berkala khusus.`;
    } else {
      justification = `Performa karyawan memerlukan pembinaan (KPI: ${kpiScore}). Oleh karena itu, kompensasi diusulkan pada Step ${recommendedStep} guna mematuhi standarisasi matriks upah tanpa memberikan stimulus kenaikan langkah berkala sebelum perbaikan kinerja terlihat nyata.`;
    }

    return {
      employee: emp,
      grade,
      step: recommendedStep,
      currentWage: currentWageNum,
      recommendedWage,
      difference: diff,
      percentChange,
      justification,
      level,
      label
    };
  }, [recEmployeeId, employees]);
  
  // Filtering states for the scale table
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [stepRange, setStepRange] = useState<'1-10' | '11-20' | 'all'>('all');
  const [hoveredStepIdx, setHoveredStepIdx] = useState<number | null>(null);
  
  // Mapping state
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [targetGrade, setTargetGrade] = useState<number>(10);
  const [targetStep, setTargetStep] = useState<number>(1);
  const [searchEmployeeQuery, setSearchEmployeeQuery] = useState<string>('');
  const [isApplying, setIsApplying] = useState<boolean>(false);
  const [mapAlert, setMapAlert] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Simulator state
  const [simLevel, setSimLevel] = useState<string>('II');
  const [simGrade, setSimGrade] = useState<number>(10);
  const [simStep, setSimStep] = useState<number>(5);
  const [customBaseWage, setCustomBaseWage] = useState<number>(14750000);
  const [calcMode, setCalcMode] = useState<'official' | 'custom'>('official');

  // Find selected employee for mapping
  const selectedEmp = useMemo(() => {
    return employees.find(e => e.id === selectedEmployeeId);
  }, [employees, selectedEmployeeId]);

  // Handle setting default grade based on selected employee position/level
  const handleSelectEmployee = (id: string) => {
    setSelectedEmployeeId(id);
    const emp = employees.find(e => e.id === id);
    if (emp) {
      // Try to parse existing grade/step if defined in salaryGrade (e.g. "Grade 10 - Step 5" or "10/5")
      let matchedGrade = 10;
      let matchedStep = 1;
      
      const gradeStr = emp.salaryGrade || '';
      const matchNumbers = gradeStr.match(/\d+/g);
      if (matchNumbers && matchNumbers.length >= 2) {
        matchedGrade = parseInt(matchNumbers[0]);
        matchedStep = parseInt(matchNumbers[1]);
      } else if (matchNumbers && matchNumbers.length === 1) {
        matchedGrade = parseInt(matchNumbers[0]);
      } else {
        // Fallback guess based on position level
        const posLower = (emp.position || '').toLowerCase();
        if (posLower.includes('director') || posLower.includes('ktt') || posLower.includes('site manager') || posLower.includes('sm')) {
          matchedGrade = 14;
        } else if (posLower.includes('manager') || posLower.includes('manajer') || posLower.includes('kabag')) {
          matchedGrade = 11;
        } else if (posLower.includes('supervisor') || posLower.includes('spv') || posLower.includes('pengawas') || posLower.includes('foreman')) {
          matchedGrade = 8;
        } else if (posLower.includes('staff') || posLower.includes('staf') || posLower.includes('admin')) {
          matchedGrade = 6;
        } else {
          matchedGrade = 3;
        }
      }
      
      setTargetGrade(matchedGrade);
      setTargetStep(matchedStep);
    }
  };

  // List of employees filtered by search query
  const filteredEmployees = useMemo(() => {
    const query = (searchEmployeeQuery || '').toLowerCase();
    return employees.filter(emp => 
      (emp.name || '').toLowerCase().includes(query) ||
      (emp.id || '').toLowerCase().includes(query) ||
      (emp.position || '').toLowerCase().includes(query) ||
      (emp.department || '').toLowerCase().includes(query)
    );
  }, [employees, searchEmployeeQuery]);

  // Compute stats on current employee salaries vs scale
  const remunerationStats = useMemo(() => {
    let totalCurrentWage = 0;
    let mappedCount = 0;
    let totalMappedScaleSalary = 0;
    const levelDistribution: Record<string, number> = { 'I': 0, 'II': 0, 'III': 0, 'IV': 0 };
    const gradeDistribution: Record<number, number> = {};

    employees.forEach(emp => {
      const currentWage = parseWageStr(emp.wage);
      totalCurrentWage += currentWage;

      // Check if employee matches a specific scale grade & step
      const gradeStr = emp.salaryGrade || '';
      const matchNumbers = gradeStr.match(/\d+/g);
      if (matchNumbers && matchNumbers.length >= 2) {
        const grade = parseInt(matchNumbers[0]);
        const step = parseInt(matchNumbers[1]);
        const scaleRow = REMUNERATION_SCALE_DATA.find(r => r.grade === grade);
        if (scaleRow && step >= 1 && step <= 20) {
          const scaleSalary = scaleRow.salaries[step - 1];
          totalMappedScaleSalary += scaleSalary;
          mappedCount++;
          levelDistribution[scaleRow.level] = (levelDistribution[scaleRow.level] || 0) + 1;
          gradeDistribution[grade] = (gradeDistribution[grade] || 0) + 1;
        }
      }
    });

    return {
      totalEmployees: employees.length,
      totalCurrentWage,
      mappedCount,
      totalMappedScaleSalary,
      levelDistribution,
      gradeDistribution
    };
  }, [employees]);

  // Filtered rows for the scale display table
  const displayedScaleRows = useMemo(() => {
    return REMUNERATION_SCALE_DATA.filter(row => {
      if (levelFilter === 'all') return true;
      return row.level === levelFilter;
    });
  }, [levelFilter]);

  // Get step indices to display based on stepRange filter
  const stepIndices = useMemo(() => {
    if (stepRange === '1-10') {
      return Array.from({ length: 10 }, (_, i) => i);
    } else if (stepRange === '11-20') {
      return Array.from({ length: 10 }, (_, i) => i + 10);
    } else {
      return Array.from({ length: 20 }, (_, i) => i);
    }
  }, [stepRange]);

  // Apply mapped Grade & Step to selected Employee
  const handleApplyRemuneration = async () => {
    if (!selectedEmployeeId || !onUpdateEmployee) return;
    setIsApplying(true);
    setMapAlert(null);

    const scaleRow = REMUNERATION_SCALE_DATA.find(r => r.grade === targetGrade);
    if (!scaleRow) {
      setMapAlert({ type: 'error', text: 'Grade tidak valid.' });
      setIsApplying(false);
      return;
    }

    const calculatedSalary = scaleRow.salaries[targetStep - 1];
    
    try {
      await onUpdateEmployee(selectedEmployeeId, {
        salaryGrade: `Grade ${targetGrade} - Step ${targetStep}`,
        wage: calculatedSalary.toString(), // Save calculated basic wage
      });

      setMapAlert({
        type: 'success',
        text: `Gaji Karyawan ${selectedEmp?.name} berhasil disesuaikan menjadi Rp ${calculatedSalary.toLocaleString('id-ID')} berdasarkan Skala Ruang Gaji (Grade ${targetGrade} / Step ${targetStep})`
      });

      // Clear alert after 5 seconds
      setTimeout(() => {
        setMapAlert(null);
      }, 7000);
    } catch (err: any) {
      setMapAlert({ type: 'error', text: `Gagal menyimpan: ${err.message || err}` });
    } finally {
      setIsApplying(false);
    }
  };

  // Calculate salary for custom simulation
  const computedSimulatedSalary = useMemo(() => {
    if (calcMode === 'official') {
      const scaleRow = REMUNERATION_SCALE_DATA.find(r => r.grade === simGrade);
      if (scaleRow && simStep >= 1 && simStep <= 20) {
        return scaleRow.salaries[simStep - 1];
      }
      return 0;
    } else {
      // Custom factor base math
      let wageAccumulator = customBaseWage;
      for (let s = 2; s <= simStep; s++) {
        wageAccumulator = Math.round((wageAccumulator * 1.05) / 1000) * 1000;
      }
      return wageAccumulator;
    }
  }, [calcMode, simGrade, simStep, customBaseWage]);

  // Export scale table as CSV
  const handleExportScaleCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Level,Posisi,Grade,' + Array.from({ length: 20 }, (_, i) => `Step ${i + 1}`).join(',') + '\n';
    
    REMUNERATION_SCALE_DATA.forEach(row => {
      const salaryCols = row.salaries.join(',');
      csvContent += `"${row.level}","${row.posisi}",${row.grade},${salaryCols}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'skala_ruang_gaji_pt_billy_indonesia.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleApplyAiRecommendation = async () => {
    if (!aiRecommendation || !onUpdateEmployee) return;
    setIsApplyingRec(true);
    setRecAlert(null);

    try {
      await onUpdateEmployee(aiRecommendation.employee.id, {
        salaryGrade: `Grade ${aiRecommendation.grade} - Step ${aiRecommendation.step}`,
        wage: aiRecommendation.recommendedWage.toString()
      });

      setRecAlert({
        type: 'success',
        text: `Sukses! Berhasil menerapkan rekomendasi AI untuk ${aiRecommendation.employee.name}. Gaji diatur ke Grade ${aiRecommendation.grade} - Step ${aiRecommendation.step} (${aiRecommendation.level}) dengan nominal Rp ${aiRecommendation.recommendedWage.toLocaleString('id-ID')}`
      });

      if (onUploadSuccess) {
        onUploadSuccess();
      }

      // Clear alert after 8s
      setTimeout(() => setRecAlert(null), 8000);
    } catch (err: any) {
      setRecAlert({
        type: 'error',
        text: `Gagal menerapkan rekomendasi: ${err.message || err}`
      });
    } finally {
      setIsApplyingRec(false);
    }
  };

  const handleSendCopilotMessage = async (presetText?: string) => {
    const text = presetText || copilotInput.trim();
    if (!text) return;

    // Add user message
    const userMsg = {
      id: `msg_${Date.now()}_u`,
      role: 'user' as const,
      content: text,
      timestamp: new Date()
    };

    setCopilotMessages(prev => [...prev, userMsg]);
    if (!presetText) setCopilotInput('');
    setCopilotLoading(true);

    try {
      const historyToSend = copilotMessages
        .filter(m => m.id !== 'remun-welcome')
        .map(m => ({
          role: m.role,
          content: m.content
        }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, chatHistory: historyToSend })
      });

      const data = await response.json();
      
      if (response.ok && data.reply) {
        setCopilotMessages(prev => [...prev, {
          id: `msg_${Date.now()}_a`,
          role: 'assistant' as const,
          content: data.reply,
          timestamp: new Date()
        }]);
      } else {
        throw new Error(data.error || 'Terjadi kesalahan pada server AI.');
      }
    } catch (err: any) {
      setCopilotMessages(prev => [...prev, {
        id: `msg_${Date.now()}_err`,
        role: 'assistant' as const,
        content: `Gagal menghubungi AI Co-pilot: ${err.message || err}. Pastikan server aktif dan kunci API terpasang.`,
        timestamp: new Date()
      }]);
    } finally {
      setCopilotLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER BAR */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden shadow-sm">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-widest font-mono">
              <Coins className="w-4 h-4" />
              <span>Sistem Remunerasi Kerja &amp; Struktur Upah</span>
            </div>
            <h1 className="text-xl md:text-2xl font-black text-white font-heading tracking-tight">
              Regulasi Skala Gaji Pokok (Ruang Gaji)
            </h1>
            <p className="text-slate-400 text-xs md:text-sm font-medium">
              Lampiran Keputusan Direksi PT Billy Indonesia Nomor: 002/Dirut/VIII/2022
            </p>
          </div>
          
          {/* Action Button */}
          <div className="flex flex-wrap gap-2 shrink-0">
            <button
              onClick={() => window.print()}
              className="px-3.5 py-2 bg-slate-950/60 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-bold text-slate-300 hover:text-white transition-all flex items-center gap-2 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Skala</span>
            </button>
            <button
              onClick={handleExportScaleCSV}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-indigo-600/10"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Ekspor CSV</span>
            </button>
          </div>
        </div>

        {/* DECISION SUMMARY ALERT */}
        <div className="mt-5 p-4 bg-indigo-950/20 border border-indigo-900/30 rounded-xl flex items-start gap-3">
          <Info className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-300 leading-relaxed space-y-1">
            <p>
              <strong className="text-white">Ketentuan Sistem Skala Upah:</strong> Kenaikan berkala tiap step (Ruang Gaji 1 - 20) menggunakan koefisien faktor kelipatan geometris sebesar <strong className="text-indigo-300">5.0% (faktor 1.05)</strong> dari step sebelumnya, dibulatkan ke ribuan terdekat. Model ini menjamin kepastian upah yang adil, kompetitif, dan sesuai dengan bobot tanggung jawab level posisi jabatan di site.
            </p>
            <div className="flex flex-wrap gap-4 pt-1 font-mono text-[10px] text-slate-400">
              <span>&bull; Level I: SM/KTT (Grade 13-15)</span>
              <span>&bull; Level II: Manajer (Grade 9-12)</span>
              <span>&bull; Level III: SPV &amp; Staf Ahli (Grade 5-8)</span>
              <span>&bull; Level IV: Spesialis / Juru Lapangan (Grade 1-4)</span>
            </div>
          </div>
        </div>
      </div>

      {/* QUICK ANALYTICS BENTO BOXES */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Box 1: Total Spending */}
        <div className="bg-slate-900 border border-slate-800/65 rounded-2xl p-4.5 relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Anggaran Gaji Pokok</span>
            <div className="p-1.5 bg-emerald-500/10 rounded-lg text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 space-y-1">
            <div className="text-xl font-extrabold text-white font-mono tracking-tight">
              Rp {remunerationStats.totalCurrentWage.toLocaleString('id-ID')}
            </div>
            <p className="text-[10px] text-slate-500 font-medium">
              Akumulasi upah dasar bulanan untuk seluruh karyawan
            </p>
          </div>
        </div>

        {/* Box 2: Mapped Employees */}
        <div className="bg-slate-900 border border-slate-800/65 rounded-2xl p-4.5 relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Kesesuaian Skala Gaji</span>
            <div className="p-1.5 bg-indigo-500/10 rounded-lg text-indigo-400">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 space-y-1">
            <div className="text-xl font-extrabold text-white font-mono tracking-tight">
              {remunerationStats.mappedCount} / {remunerationStats.totalEmployees} Karyawan
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
              <span className="h-1.5 flex-1 bg-slate-800 rounded-full overflow-hidden">
                <span 
                  className="h-full bg-indigo-500 block" 
                  style={{ width: `${(remunerationStats.mappedCount / (remunerationStats.totalEmployees || 1)) * 100}%` }}
                />
              </span>
              <span className="font-bold font-mono">
                {Math.round((remunerationStats.mappedCount / (remunerationStats.totalEmployees || 1)) * 100)}%
              </span>
            </div>
          </div>
        </div>

        {/* Box 3: Total Budget Under Scale */}
        <div className="bg-slate-900 border border-slate-800/65 rounded-2xl p-4.5 relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Anggaran Sesuai Skala</span>
            <div className="p-1.5 bg-blue-500/10 rounded-lg text-blue-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 space-y-1">
            <div className="text-xl font-extrabold text-white font-mono tracking-tight">
              Rp {remunerationStats.totalMappedScaleSalary.toLocaleString('id-ID')}
            </div>
            <p className="text-[10px] text-slate-500 font-medium">
              Untuk {remunerationStats.mappedCount} karyawan terpetakan
            </p>
          </div>
        </div>

        {/* Box 4: Average Basic Wage */}
        <div className="bg-slate-900 border border-slate-800/65 rounded-2xl p-4.5 relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Rata-Rata Gaji Pokok</span>
            <div className="p-1.5 bg-amber-500/10 rounded-lg text-amber-400">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 space-y-1">
            <div className="text-xl font-extrabold text-white font-mono tracking-tight">
              Rp {Math.round(remunerationStats.totalCurrentWage / (remunerationStats.totalEmployees || 1)).toLocaleString('id-ID')}
            </div>
            <p className="text-[10px] text-slate-500 font-medium">
              Rata-rata upah dasar per kepala karyawan
            </p>
          </div>
        </div>
      </div>

      {/* SUB TABS NAVIGATION */}
      <div className="flex border-b border-slate-800/60 gap-1.5 bg-slate-950/40 p-1 rounded-xl">
        <button
          onClick={() => setActiveSubTab('scale')}
          className={`px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'scale' 
              ? 'bg-slate-900 text-white border border-slate-800 shadow-sm' 
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>Matriks Ruang Gaji Resmi</span>
        </button>

        <button
          onClick={() => setActiveSubTab('mapping')}
          className={`px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'mapping' 
              ? 'bg-slate-900 text-white border border-slate-800 shadow-sm' 
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>Pemetaan Gaji Karyawan</span>
        </button>

        <button
          onClick={() => setActiveSubTab('simulator')}
          className={`px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'simulator' 
              ? 'bg-slate-900 text-white border border-slate-800 shadow-sm' 
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
          }`}
        >
          <Calculator className="w-3.5 h-3.5" />
          <span>Kalkulator &amp; Simulator Koefisien</span>
        </button>

        <button
          onClick={() => setActiveSubTab('copilot')}
          className={`px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'copilot' 
              ? 'bg-slate-900 text-white border border-slate-800 shadow-sm' 
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>AI Remuneration Co-pilot</span>
        </button>
      </div>

      {/* SUB TAB CONTENTS */}
      
      {/* 1. OFFICIALLY SCALE MATRIX TAB */}
      {activeSubTab === 'scale' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-sm font-black text-white uppercase tracking-wider font-heading">Matriks Angka Struktur &amp; Skala Gaji Pokok</h3>
              <p className="text-xs text-slate-400">Pilih jangkauan kolom Step atau filter Level untuk mereduksi kompleksitas analisis remunerasi berjalan.</p>
            </div>

            {/* Scale Filters */}
            <div className="flex flex-wrap gap-2.5 items-center">
              <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-850 px-3 py-2 rounded-xl text-xs">
                <span className="text-slate-500 font-bold">Level Jabatan:</span>
                <select 
                  value={levelFilter}
                  onChange={(e) => setLevelFilter(e.target.value)}
                  className="bg-transparent border-none text-white focus:outline-none cursor-pointer font-extrabold pr-2"
                >
                  <option value="all" className="bg-slate-900">Semua Level (I - IV)</option>
                  <option value="I" className="bg-slate-900">Level I (Direksi / KTT)</option>
                  <option value="II" className="bg-slate-900">Level II (Manajer)</option>
                  <option value="III" className="bg-slate-900">Level III (SPV / Kasatker)</option>
                  <option value="IV" className="bg-slate-900">Level IV (Spesialis / Juru)</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-850 px-3 py-2 rounded-xl text-xs">
                <span className="text-slate-500 font-bold">Jangkauan Step:</span>
                <select 
                  value={stepRange}
                  onChange={(e) => setStepRange(e.target.value as any)}
                  className="bg-transparent border-none text-white focus:outline-none cursor-pointer font-extrabold pr-2"
                >
                  <option value="all" className="bg-slate-900">Tampilkan Semua (Step 1 - 20)</option>
                  <option value="1-10" className="bg-slate-900">Set Pertama (Step 1 - 10)</option>
                  <option value="11-20" className="bg-slate-900">Set Kedua (Step 11 - 20)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Level Legend Cards - Beautiful visual bento structure */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-950/40 p-4 rounded-xl border border-slate-850">
            <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-900/40 border border-slate-850/60">
              <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-500/15 text-rose-400 border border-rose-500/20">I</span>
              <div className="min-w-0">
                <div className="text-[10px] font-bold text-slate-300">Level I (Direksi)</div>
                <div className="text-[9px] text-slate-500 truncate">Direktur, KTT &amp; Site Manager (Grade 13-15)</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-900/40 border border-slate-850/60">
              <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-500/15 text-amber-400 border border-amber-500/20">II</span>
              <div className="min-w-0">
                <div className="text-[10px] font-bold text-slate-300">Level II (Manajerial)</div>
                <div className="text-[9px] text-slate-500 truncate">Manajer, Superintendent (Grade 9-12)</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-900/40 border border-slate-850/60">
              <span className="px-2 py-0.5 rounded text-[10px] font-black bg-teal-500/15 text-teal-400 border border-teal-500/20">III</span>
              <div className="min-w-0">
                <div className="text-[10px] font-bold text-slate-300">Level III (Staf Ahli / SPV)</div>
                <div className="text-[9px] text-slate-500 truncate">Supervisor, Kasatker, Ahli (Grade 5-8)</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-900/40 border border-slate-850/60">
              <span className="px-2 py-0.5 rounded text-[10px] font-black bg-sky-500/15 text-sky-400 border border-sky-500/20">IV</span>
              <div className="min-w-0">
                <div className="text-[10px] font-bold text-slate-300">Level IV (Spesialis)</div>
                <div className="text-[9px] text-slate-500 truncate">Operator, Driver, Mekanik (Grade 1-4)</div>
              </div>
            </div>
          </div>

          {/* TABLE CONTAINER WITH NO-SQUEEZE DYNAMIC WIDTH */}
          <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950/20 scrollbar-thin" id="salary-scale-table-container">
            <table 
              className="text-left border-collapse table-fixed select-none"
              style={{ width: stepRange === 'all' ? '2655px' : '1505px' }}
            >
              <thead>
                <tr className="bg-slate-950/90 border-b border-slate-800 font-mono text-[10px] text-slate-400 uppercase">
                  {/* Sticky column headers */}
                  <th className="p-3.5 w-[70px] min-w-[70px] max-w-[70px] text-center sticky left-0 bg-slate-950 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)] border-b border-slate-800">
                    Level
                  </th>
                  <th className="p-3.5 w-[210px] min-w-[210px] max-w-[210px] text-left sticky left-[70px] bg-slate-950 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)] border-b border-slate-800">
                    Posisi Struktur Jabatan
                  </th>
                  <th className="p-3.5 w-[75px] min-w-[75px] max-w-[75px] text-center sticky left-[280px] bg-slate-950 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)] border-r border-slate-800/80 border-b border-slate-800">
                    Grade
                  </th>
                  
                  {/* Step headers */}
                  {stepIndices.map(idx => {
                    const isColHovered = idx === hoveredStepIdx;
                    return (
                      <th 
                        key={idx} 
                        onMouseEnter={() => setHoveredStepIdx(idx)}
                        onMouseLeave={() => setHoveredStepIdx(null)}
                        className={`p-3 text-center w-[115px] min-w-[115px] max-w-[115px] border-r border-slate-800/80 border-b border-slate-800 transition-all duration-150 ${
                          isColHovered ? 'bg-indigo-950/60 text-indigo-300' : ''
                        }`}
                      >
                        <div className="font-bold text-[10.5px] tracking-tight">Step {idx + 1}</div>
                        <div className={`inline-block px-1.5 py-0.5 mt-1 text-[8.5px] font-mono font-bold rounded transition-all ${
                          isColHovered 
                            ? 'bg-indigo-500/20 text-indigo-200 border border-indigo-400/30' 
                            : 'bg-slate-900 text-indigo-400 border border-slate-800'
                        }`}>
                          x{REMUNERATION_COEFFICIENTS[idx].toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 6 })}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850/50">
                {displayedScaleRows.map((row, rIdx) => {
                  const bgClass = rIdx % 2 === 0 ? 'bg-slate-900' : 'bg-slate-950';
                  return (
                    <tr 
                      key={rIdx} 
                      className={`group/row ${bgClass} hover:bg-indigo-950/10 transition-all text-xs text-slate-300`}
                    >
                      {/* Sticky level column */}
                      <td className={`p-3 text-center font-bold text-white ${bgClass} group-hover/row:bg-indigo-950/20 sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)] transition-all duration-150 border-b border-slate-850/40 w-[70px] min-w-[70px] max-w-[70px]`}>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                          row.level === 'I' ? 'bg-rose-500/15 text-rose-400 border border-rose-500/20' :
                          row.level === 'II' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' :
                          row.level === 'III' ? 'bg-teal-500/15 text-teal-400 border border-teal-500/20' :
                          'bg-sky-500/15 text-sky-400 border border-sky-500/20'
                        }`}>
                          {row.level}
                        </span>
                      </td>

                      {/* Sticky position column */}
                      <td className={`p-3 font-bold text-slate-200 truncate ${bgClass} group-hover/row:bg-indigo-950/20 sticky left-[70px] z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)] transition-all duration-150 border-b border-slate-850/40 w-[210px] min-w-[210px] max-w-[210px]`}>
                        {row.posisi}
                      </td>

                      {/* Sticky grade column */}
                      <td className={`p-3 text-center font-mono font-bold text-indigo-300 border-r border-slate-800/80 ${bgClass} group-hover/row:bg-indigo-950/20 sticky left-[280px] z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)] transition-all duration-150 border-b border-slate-850/40 w-[75px] min-w-[75px] max-w-[75px]`}>
                        {row.grade}
                      </td>

                      {/* Salaries columns */}
                      {stepIndices.map(stepIdx => {
                        const salary = row.salaries[stepIdx];
                        const isColHovered = stepIdx === hoveredStepIdx;
                        return (
                          <td 
                            key={stepIdx} 
                            onMouseEnter={() => setHoveredStepIdx(stepIdx)}
                            onMouseLeave={() => setHoveredStepIdx(null)}
                            className={`p-3 w-[115px] min-w-[115px] max-w-[115px] text-right font-mono text-xs border-r border-slate-850/40 border-b border-slate-850/40 font-medium transition-all duration-150 ${
                              isColHovered 
                                ? 'bg-indigo-600/15 text-white font-extrabold' 
                                : rIdx % 2 === 0 
                                  ? 'bg-slate-900/10 text-slate-300' 
                                  : 'bg-slate-950/10 text-slate-300'
                            }`}
                          >
                            <span className={`text-[10px] mr-1 select-none ${isColHovered ? 'text-indigo-400 font-bold' : 'text-slate-500'}`}>Rp</span>
                            <span className={isColHovered ? 'text-white font-extrabold text-[12.5px]' : 'text-slate-100'}>
                              {salary.toLocaleString('id-ID')}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-4 bg-slate-950/40 rounded-xl border border-slate-850 flex items-start gap-2.5 text-xs text-slate-400 leading-relaxed">
            <Info className="w-4.5 h-4.5 text-indigo-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p>
                <strong>Interaksi Matriks:</strong> Arahkan kursor Anda ke kolom langkah (Step) mana pun untuk menyorot seluruh kolom secara vertikal dan melihat koefisien pengali yang aktif secara real-time.
              </p>
              <p>
                Gunakan tab <strong className="text-white">"Pemetaan Gaji Karyawan"</strong> jika Anda ingin menyelaraskan grade/step karyawan tertentu dengan matriks upah resmi di atas secara cepat.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 2. EMPLOYEE SALARY MAPPING SYSTEM */}
      {activeSubTab === 'mapping' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Mapping panel 1: Employee selector list */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 lg:col-span-1">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Pilih Karyawan One For All</h3>
              <p className="text-xs text-slate-400">Ketik nama untuk mencari karyawan yang ingin dipetakan upahnya.</p>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={searchEmployeeQuery}
                onChange={(e) => setSearchEmployeeQuery(e.target.value)}
                placeholder="Cari nama, NIK, posisi..."
                className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            {/* Employees scrolling list */}
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {filteredEmployees.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs italic">
                  Karyawan tidak ditemukan
                </div>
              ) : (
                filteredEmployees.map(emp => {
                  const isSelected = emp.id === selectedEmployeeId;
                  const currentWageNum = parseWageStr(emp.wage);
                  return (
                    <button
                      key={emp.id}
                      onClick={() => handleSelectEmployee(emp.id)}
                      className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                        isSelected 
                          ? 'bg-indigo-600/10 border-indigo-500 text-white shadow-sm' 
                          : 'bg-slate-950/40 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:bg-slate-950/80'
                      }`}
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className={`text-xs font-bold truncate ${isSelected ? 'text-indigo-400' : 'text-white'}`}>
                          {emp.name}
                        </div>
                        <div className="text-[10px] text-slate-500 font-medium truncate">
                          {emp.id} &bull; {emp.position}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400 font-bold flex items-center gap-1.5 mt-1">
                          <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800/80">
                            {emp.salaryGrade || 'Gaji Kustom / Non-Skala'}
                          </span>
                          <span>Rp {currentWageNum.toLocaleString('id-ID')}</span>
                        </div>
                      </div>
                      <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${isSelected ? 'text-indigo-400 translate-x-0.5' : 'text-slate-600'}`} />
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Mapping panel 2: Main mapping actions */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 lg:col-span-2">
            {!selectedEmployeeId ? (
              <div className="h-full flex flex-col items-center justify-center py-20 text-center text-slate-500 space-y-3">
                <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800/80 text-slate-600">
                  <UserCheck className="w-8 h-8" />
                </div>
                <div className="space-y-1 max-w-sm">
                  <h4 className="text-xs font-bold text-slate-400 uppercase">Belum Ada Karyawan Terpilih</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Silakan klik pada salah satu nama karyawan di kolom sebelah kiri untuk mulai menyesuaikan tingkat gaji pokok resmi sesuai dengan matriks Direksi One For All.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* Employee info header */}
                <div className="p-4 bg-slate-950/60 border border-slate-850 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">Karyawan Terpilih</div>
                    <h4 className="text-sm font-black text-white leading-tight">{selectedEmp?.name}</h4>
                    <p className="text-xs text-slate-400 font-medium">
                      Posisi: <span className="text-slate-200">{selectedEmp?.position}</span> ({selectedEmp?.status}) &bull; Dept: <span className="text-slate-200">{selectedEmp?.department}</span>
                    </p>
                  </div>
                  
                  {/* Current Basic Wage display */}
                  <div className="text-left sm:text-right font-mono space-y-0.5 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 shrink-0">
                    <span className="text-[10px] text-slate-500 block uppercase font-sans font-bold">Gaji Pokok Berjalan</span>
                    <span className="text-xs text-slate-400">Rp </span>
                    <span className="text-sm font-extrabold text-white">
                      {parseWageStr(selectedEmp?.wage).toLocaleString('id-ID')}
                    </span>
                    <span className="text-[10px] text-amber-400 font-sans block mt-0.5">
                      {selectedEmp?.salaryGrade || 'Format Bebas / Non-Skala'}
                    </span>
                  </div>
                </div>

                {/* ALERTS */}
                {mapAlert && (
                  <div className={`p-4 border rounded-xl flex items-start gap-3 text-xs leading-relaxed ${
                    mapAlert.type === 'success' 
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                      : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                  }`}>
                    {mapAlert.type === 'success' ? <CheckCircle className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
                    <div>{mapAlert.text}</div>
                  </div>
                )}

                {/* GRADE & STEP ASSIGNER */}
                <div className="space-y-4.5">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-indigo-400" />
                    <span>Konfigurasi Struktur Upah Baru</span>
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Grade Selector */}
                    <div className="space-y-1.5">
                      <label className="block text-[11px] text-slate-400 font-bold">Grade Skala (Level &amp; Golongan)</label>
                      <select
                        value={targetGrade}
                        onChange={(e) => setTargetGrade(parseInt(e.target.value))}
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                      >
                        <optgroup label="Level I: SM/KTT" className="bg-slate-900 text-rose-400">
                          <option value="15">Grade 15 (SM/KTT - Rp 25.073.000)</option>
                          <option value="14">Grade 14 (SM/KTT - Rp 22.387.000)</option>
                          <option value="13">Grade 13 (SM/KTT - Rp 20.352.000)</option>
                        </optgroup>
                        <optgroup label="Level II: Manajer" className="bg-slate-900 text-amber-400">
                          <option value="12">Grade 12 (Manajer - Rp 18.502.000)</option>
                          <option value="11">Grade 11 (Manajer - Rp 16.519.000)</option>
                          <option value="10">Grade 10 (Manajer - Rp 14.750.000)</option>
                          <option value="9">Grade 9 (Manajer - Rp 13.169.000)</option>
                        </optgroup>
                        <optgroup label="Level III: SPV &amp; Staf" className="bg-slate-900 text-teal-400">
                          <option value="8">Grade 8 (SPV/Pengawas - Rp 11.452.000)</option>
                          <option value="7">Grade 7 (Staf Kasatker - Rp 10.506.000)</option>
                          <option value="6">Grade 6 (Spesialis Senior - Rp 9.136.000)</option>
                          <option value="5">Grade 5 (Dll yg disetarakan - Rp 7.944.000)</option>
                        </optgroup>
                        <optgroup label="Level IV: Lapangan / Juru" className="bg-slate-900 text-sky-400">
                          <option value="4">Grade 4 (Spesialis/Juru - Rp 4.294.000)</option>
                          <option value="3">Grade 3 (Spesialis/Juru - Rp 3.734.000)</option>
                          <option value="2">Grade 2 (Spesialis/Juru - Rp 3.247.000)</option>
                          <option value="1">Grade 1 (Spesialis/Juru - Rp 2.824.000)</option>
                        </optgroup>
                      </select>
                      <p className="text-[10px] text-slate-500">Grade menentukan dasar gaji terendah (Step 1) dari struktur jabatan.</p>
                    </div>

                    {/* Step Selector */}
                    <div className="space-y-1.5">
                      <label className="block text-[11px] text-slate-400 font-bold">Step Masa Kerja (Ruang Gaji 1 - 20)</label>
                      <select
                        value={targetStep}
                        onChange={(e) => setTargetStep(parseInt(e.target.value))}
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                      >
                        {Array.from({ length: 20 }, (_, idx) => {
                          const multiplier = REMUNERATION_COEFFICIENTS[idx];
                          return (
                            <option key={idx + 1} value={idx + 1} className="bg-slate-900">
                              Step {idx + 1} &mdash; Rasio Koefisien: x{multiplier.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 6 })}
                            </option>
                          );
                        })}
                      </select>
                      <p className="text-[10px] text-slate-500">Step mewakili masa kerja &amp; evaluasi kinerja tahunan (Kenaikan 5% per tingkat).</p>
                    </div>

                  </div>
                </div>

                {/* CALCULATED REMUNERATION PREVIEW CARD */}
                <div className="bg-gradient-to-br from-indigo-950/25 to-slate-900 border border-indigo-500/25 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider font-mono">
                    <Info className="w-4 h-4" />
                    <span>Perbandingan Gaji &amp; Efek Perubahan</span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-around gap-4 py-2">
                    {/* Before */}
                    <div className="text-center bg-slate-950/40 p-3.5 rounded-xl border border-slate-850 flex-1 space-y-1">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">UPAH SEKARANG</span>
                      <div className="text-sm font-mono font-bold text-slate-400">
                        Rp {parseWageStr(selectedEmp?.wage).toLocaleString('id-ID')}
                      </div>
                      <div className="text-[9.5px] text-slate-500 truncate">
                        {selectedEmp?.salaryGrade || 'Format Bebas / Non-Skala'}
                      </div>
                    </div>

                    {/* Arrow sign */}
                    <div className="flex items-center justify-center text-indigo-400">
                      <ArrowRightLeft className="w-5 h-5 shrink-0 rotate-90 sm:rotate-0" />
                    </div>

                    {/* After */}
                    <div className="text-center bg-indigo-950/20 p-3.5 rounded-xl border border-indigo-900/30 flex-1 space-y-1">
                      <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">UPAH BARU RESMI</span>
                      <div className="text-base font-mono font-black text-emerald-400">
                        Rp {(REMUNERATION_SCALE_DATA.find(r => r.grade === targetGrade)?.salaries[targetStep - 1] || 0).toLocaleString('id-ID')}
                      </div>
                      <div className="text-[9.5px] text-indigo-300 font-bold">
                        Grade {targetGrade} &bull; Step {targetStep}
                      </div>
                    </div>
                  </div>

                  {/* Wage impact description */}
                  {(() => {
                    const current = parseWageStr(selectedEmp?.wage);
                    const next = REMUNERATION_SCALE_DATA.find(r => r.grade === targetGrade)?.salaries[targetStep - 1] || 0;
                    const diff = next - current;
                    return (
                      <div className="text-[11px] text-center text-slate-300">
                        {diff === 0 ? (
                          <span>Gaji baru <strong className="text-white">sama persis</strong> dengan gaji berjalan karyawan.</span>
                        ) : diff > 0 ? (
                          <span>Karyawan akan menerima <strong className="text-emerald-400">kenaikan upah</strong> sebesar <strong className="text-white">Rp {diff.toLocaleString('id-ID')}</strong> (+{Math.round((diff / (current || 1)) * 100)}%) per bulan.</span>
                        ) : (
                          <span>Karyawan akan menerima <strong className="text-amber-400">penyesuaian minus</strong> sebesar <strong className="text-white">Rp {Math.abs(diff).toLocaleString('id-ID')}</strong> ({Math.round((diff / (current || 1)) * 100)}%) per bulan.</span>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Save button */}
                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleApplyRemuneration}
                    disabled={isApplying}
                    className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-xl text-xs font-extrabold transition-all cursor-pointer shadow-md shadow-indigo-600/10 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isApplying ? 'Sedang Menyimpan...' : 'Terapkan Skala Gaji Pokok Baru'}
                  </button>
                </div>

              </div>
            )}
          </div>

        </div>
      )}

      {/* 3. SIMULATOR & CUSTOM CALCULATOR */}
      {activeSubTab === 'simulator' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* Simulation config column */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 md:col-span-5">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Parameter Simulasi Upah</h3>
              <p className="text-xs text-slate-400">Gunakan simulator ini untuk memodelkan upah dasar custom atau menguji angka matematis dari koefisien factor 1.05.</p>
            </div>

            {/* Mode choice */}
            <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl">
              <button
                onClick={() => { setCalcMode('official'); }}
                className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  calcMode === 'official' 
                    ? 'bg-slate-900 text-white border border-slate-800' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Rujukan SK 2022
              </button>
              <button
                onClick={() => { setCalcMode('custom'); }}
                className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  calcMode === 'custom' 
                    ? 'bg-slate-900 text-white border border-slate-800' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Formula Custom (1.05^n)
              </button>
            </div>

            {/* Config controls */}
            <div className="space-y-4">
              
              {calcMode === 'official' ? (
                <>
                  {/* Sim Grade */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] text-slate-400 font-bold">Grade Jabatan Resmi</label>
                    <select
                      value={simGrade}
                      onChange={(e) => setSimGrade(parseInt(e.target.value))}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-xs text-white focus:outline-none"
                    >
                      <option value="15">Grade 15 (SM/KTT - Rp 25.073.000)</option>
                      <option value="14">Grade 14 (SM/KTT - Rp 22.387.000)</option>
                      <option value="13">Grade 13 (SM/KTT - Rp 20.352.000)</option>
                      <option value="12">Grade 12 (Manajer - Rp 18.502.000)</option>
                      <option value="11">Grade 11 (Manajer - Rp 16.519.000)</option>
                      <option value="10">Grade 10 (Manajer - Rp 14.750.000)</option>
                      <option value="9">Grade 9 (Manajer - Rp 13.169.000)</option>
                      <option value="8">Grade 8 (SPV/Pengawas - Rp 11.452.000)</option>
                      <option value="7">Grade 7 (Staf Kasatker - Rp 10.506.000)</option>
                      <option value="6">Grade 6 (Spesialis Senior - Rp 9.136.000)</option>
                      <option value="5">Grade 5 (Dll yg disetarakan - Rp 7.944.000)</option>
                      <option value="4">Grade 4 (Spesialis/Juru - Rp 4.294.000)</option>
                      <option value="3">Grade 3 (Spesialis/Juru - Rp 3.734.000)</option>
                      <option value="2">Grade 2 (Spesialis/Juru - Rp 3.247.000)</option>
                      <option value="1">Grade 1 (Spesialis/Juru - Rp 2.824.000)</option>
                    </select>
                  </div>
                </>
              ) : (
                <>
                  {/* Custom Base Wage */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] text-slate-400 font-bold">Gaji Pokok Dasar (Step 1) Custom (Rp)</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-500">Rp</span>
                      <input
                        type="number"
                        value={customBaseWage}
                        onChange={(e) => setCustomBaseWage(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500">Ketikkan nilai upah dasar kustom untuk step 1.</p>
                  </div>
                </>
              )}

              {/* Sim Step */}
              <div className="space-y-1.5">
                <label className="block text-[11px] text-slate-400 font-bold flex justify-between">
                  <span>Step Kehadiran / Masa Kerja (1 - 20)</span>
                  <span className="text-indigo-400 font-mono">Step {simStep}</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={simStep}
                  onChange={(e) => setSimStep(parseInt(e.target.value))}
                  className="w-full accent-indigo-500 bg-slate-950 cursor-pointer h-1.5 rounded-lg"
                />
                <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                  <span>Step 1</span>
                  <span>Step 5</span>
                  <span>Step 10</span>
                  <span>Step 15</span>
                  <span>Step 20</span>
                </div>
              </div>

            </div>
          </div>

          {/* Simulation outputs column */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:col-span-7 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Hasil Proyeksi Kalkulasi Upah</h3>
                <p className="text-xs text-slate-400">Hasil matematis berdasarkan parameter yang Anda tetapkan.</p>
              </div>

              {/* PROJECTED SALARY SHIELD */}
              <div className="bg-gradient-to-r from-slate-950 to-indigo-950/20 border border-slate-800 rounded-2xl p-6 text-center space-y-3">
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest font-mono">NOMINAL GAJI PROYEKSI</span>
                <div className="text-3xl font-black text-white font-mono tracking-tight">
                  <span className="text-lg text-slate-500 font-sans font-normal mr-1">Rp</span>
                  {computedSimulatedSalary.toLocaleString('id-ID')}
                </div>
                
                {/* factor multiplier badge */}
                <div className="inline-block px-3 py-1 rounded-full bg-slate-900 text-[10px] text-indigo-300 font-mono font-bold border border-slate-800">
                  Step {simStep} &bull; Koef Factor: x{REMUNERATION_COEFFICIENTS[simStep - 1].toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 6 })}
                </div>
              </div>

              {/* Mathematical deduction */}
              <div className="p-4 bg-slate-950/40 border border-slate-850 rounded-xl space-y-2">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">Formula Penurunan Nilai</h4>
                <div className="text-xs text-slate-300 space-y-1 font-mono text-[10.5px]">
                  {calcMode === 'official' ? (
                    <>
                      <div>&bull; Rujukan Grade: <span className="text-indigo-400">Grade {simGrade}</span></div>
                      <div>&bull; Gaji Dasar (Step 1): <span className="text-white">Rp {REMUNERATION_SCALE_DATA.find(r => r.grade === simGrade)?.salaries[0].toLocaleString('id-ID')}</span></div>
                      <div>&bull; Formula Step {simStep}: <span className="text-white">Rp {REMUNERATION_SCALE_DATA.find(r => r.grade === simGrade)?.salaries[0].toLocaleString('id-ID')} * {REMUNERATION_COEFFICIENTS[simStep - 1].toFixed(6)}</span></div>
                      <div className="pt-1.5 border-t border-slate-850 text-emerald-400 font-bold font-sans text-xs">
                        Hasil Akhir Tabel: Rp {computedSimulatedSalary.toLocaleString('id-ID')}
                      </div>
                    </>
                  ) : (
                    <>
                      <div>&bull; Gaji Pokok Dasar Custom (Step 1): <span className="text-indigo-400">Rp {customBaseWage.toLocaleString('id-ID')}</span></div>
                      <div>&bull; Rasio Kenaikan Geometris: <span className="text-white">5% per step (kelipatan 1.05)</span></div>
                      <div>&bull; Rumus Geometris: <span className="text-white">Rp {customBaseWage.toLocaleString('id-ID')} * 1.05 ^ ({simStep} - 1)</span></div>
                      <div className="pt-1.5 border-t border-slate-850 text-emerald-400 font-bold font-sans text-xs">
                        Proyeksi Custom (Ribuan Terdekat): Rp {computedSimulatedSalary.toLocaleString('id-ID')}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Quick tips about decision */}
            <div className="p-4 bg-indigo-950/15 border border-indigo-900/20 rounded-xl text-xs text-slate-400 flex items-start gap-2.5">
              <HelpCircle className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <p>
                <strong>Cara Kerja Koefisien:</strong> Nilai upah dasar Step 1 dinaikkan dengan dikali faktor 1.05 untuk step berikutnya. Misalnya, Step 2 = Step 1 * 1.05, Step 3 = Step 2 * 1.05 (dibulatkan ke ribuan terdekat), dan seterusnya. Hal ini menjaga konsistensi peningkat berkala masa kerja yang mulus dan proporsional.
              </p>
            </div>
          </div>

        </div>
      )}

      {/* 4. AI REMUNERATION CO-PILOT TAB */}
      {activeSubTab === 'copilot' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT PANEL: AI SMART RECOMMENDER (5 cols) */}
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider font-mono">
                  <Zap className="w-4 h-4 text-amber-400 animate-pulse" />
                  <span>AI Smart Recommender</span>
                </div>
                <h3 className="text-base font-black text-white font-heading tracking-tight">
                  Analisis &amp; Penyesuaian Gaji Otomatis
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Pilih karyawan untuk memicu mesin rekomendasi kami yang berbasis kompetensi, keselarasan struktural, dan penilaian KPI.
                </p>
              </div>

              {/* Employee Selection Dropdown */}
              <div className="space-y-1.5">
                <label className="block text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                  Pilih Karyawan Target
                </label>
                <div className="relative">
                  <select
                    value={recEmployeeId}
                    onChange={(e) => setRecEmployeeId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-xs text-white focus:outline-none font-bold appearance-none cursor-pointer"
                  >
                    <option value="" className="bg-slate-900">-- Pilih Karyawan --</option>
                    {employees
                      .map(e => (
                        <option key={e.id} value={e.id} className="bg-slate-900">
                          {e.name} ({e.position} - {e.department})
                        </option>
                      ))}
                  </select>
                  <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-500">
                    <ChevronRight className="w-4 h-4 transform rotate-90" />
                  </div>
                </div>
              </div>

              {/* Alert Notification */}
              {recAlert && (
                <div className={`p-4 rounded-xl text-xs flex items-start gap-3 border ${
                  recAlert.type === 'success' 
                    ? 'bg-emerald-950/20 border-emerald-900/30 text-emerald-400' 
                    : 'bg-rose-950/20 border-rose-900/30 text-rose-400'
                }`}>
                  {recAlert.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
                  <span>{recAlert.text}</span>
                </div>
              )}

              {/* Recommendation results cards */}
              {aiRecommendation ? (
                <div className="space-y-4 animate-fade-in">
                  
                  {/* Basic facts badge */}
                  <div className="bg-slate-950/50 border border-slate-850 rounded-xl p-4 space-y-3">
                    <div className="flex justify-between items-center pb-2.5 border-b border-slate-850 text-xs">
                      <span className="text-slate-400 font-bold">Karyawan</span>
                      <span className="text-white font-extrabold">{aiRecommendation.employee.name}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">Departemen / Posisi</span>
                      <span className="text-slate-300 font-medium font-mono text-[11px]">
                        {aiRecommendation.employee.department} &bull; {aiRecommendation.employee.position}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">Penilaian Kerja (KPI)</span>
                      <span className={`font-black ${
                        (aiRecommendation.employee.kpiScore || 0) >= 90 ? 'text-emerald-400' :
                        (aiRecommendation.employee.kpiScore || 0) >= 80 ? 'text-indigo-400' : 'text-amber-400'
                      }`}>
                        {aiRecommendation.employee.kpiScore || 80} ({aiRecommendation.employee.kpiRating || 'Baik'})
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">Skala Gaji Pokok Saat Ini</span>
                      <span className="text-slate-400 font-mono text-[11px] bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                        {aiRecommendation.employee.salaryGrade || 'Format Bebas / Non-Skala'}
                      </span>
                    </div>
                  </div>

                  {/* Recommendation core values */}
                  <div className="bg-gradient-to-br from-indigo-950/20 to-slate-950 border border-indigo-900/30 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4.5 h-4.5 text-amber-400 animate-pulse" />
                      <span className="text-xs font-bold text-white uppercase tracking-wider">Usulan Remunerasi AI</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-900/40 p-3 rounded-xl border border-slate-850 text-center">
                        <span className="text-[9.5px] text-slate-500 font-bold uppercase block mb-1">Rekomendasi Grade</span>
                        <span className="text-lg font-black text-white font-mono">Grade {aiRecommendation.grade}</span>
                      </div>
                      <div className="bg-slate-900/40 p-3 rounded-xl border border-slate-850 text-center">
                        <span className="text-[9.5px] text-slate-500 font-bold uppercase block mb-1">Rekomendasi Step</span>
                        <span className="text-lg font-black text-indigo-400 font-mono">Step {aiRecommendation.step}</span>
                      </div>
                    </div>

                    <div className="bg-slate-950 p-4.5 rounded-xl border border-slate-850 space-y-1.5 text-center">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">NOMINAL GAJI REKOMENDASI (RESMI)</span>
                      <div className="text-2xl font-black text-emerald-400 font-mono">
                        Rp {aiRecommendation.recommendedWage.toLocaleString('id-ID')}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Level {aiRecommendation.level} &bull; {aiRecommendation.label}
                      </div>
                    </div>

                    {/* Cost difference comparison */}
                    <div className="flex items-center justify-between text-xs p-3 bg-slate-900/30 rounded-xl border border-slate-850/60">
                      <div className="space-y-0.5">
                        <span className="text-slate-500 text-[10px] uppercase font-bold block">Selisih Anggaran</span>
                        <span className="font-mono text-slate-300">
                          {aiRecommendation.difference >= 0 ? '+' : ''}Rp {aiRecommendation.difference.toLocaleString('id-ID')}
                        </span>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-[10.5px] font-mono font-black ${
                        aiRecommendation.difference >= 0 ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/30' : 'bg-rose-950/40 text-rose-400 border border-rose-900/30'
                      }`}>
                        {aiRecommendation.difference >= 0 ? '+' : ''}{aiRecommendation.percentChange.toFixed(1)}%
                      </span>
                    </div>

                    {/* Justification Text */}
                    <div className="p-3.5 bg-slate-950/40 border border-slate-850 rounded-xl space-y-1">
                      <span className="text-[9.5px] text-slate-500 font-bold uppercase tracking-wider block">JUSTIFIKASI REKOMENDASI AI</span>
                      <p className="text-[11px] text-slate-300 leading-relaxed font-sans font-medium">
                        {aiRecommendation.justification}
                      </p>
                    </div>

                  </div>
                </div>
              ) : (
                <div className="bg-slate-950/40 border border-slate-850 border-dashed rounded-2xl p-10 text-center flex flex-col items-center justify-center gap-3">
                  <div className="p-3 bg-slate-900 rounded-full border border-slate-800 text-slate-500">
                    <Users className="w-6 h-6" />
                  </div>
                  <div className="text-xs text-slate-400 max-w-xs leading-relaxed">
                    Pilih nama karyawan pada opsi di atas untuk mengaktifkan audit kecocokan remunerasi cerdas secara real-time.
                  </div>
                </div>
              )}
            </div>

            {/* Recommendations Action Button */}
            {aiRecommendation && (
              <button
                onClick={handleApplyAiRecommendation}
                disabled={isApplyingRec}
                className="w-full mt-6 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-800 text-white disabled:text-slate-500 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2.5 cursor-pointer shadow-lg shadow-indigo-600/10 active:scale-[0.98]"
              >
                {isApplyingRec ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4 text-emerald-300" />
                )}
                <span>TERAPKAN REKOMENDASI AI KE PROFIL</span>
              </button>
            )}

          </div>

          {/* RIGHT PANEL: INTERACTIVE AI COPILOT CHAT (7 cols) */}
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl h-[620px] flex flex-col overflow-hidden">
            
            {/* Header */}
            <div className="bg-slate-950 px-5 py-4 border-b border-slate-850 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-600/15 rounded-xl text-indigo-400 border border-indigo-500/20">
                  <Bot className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white font-heading">AI Remuneration Chat Assistant</h4>
                  <p className="text-[10px] text-slate-400">Model: Gemini 3.5 Flash &bull; Khusus Manajemen Remunerasi</p>
                </div>
              </div>

              <button
                onClick={() => setCopilotMessages([
                  {
                    id: 'remun-welcome',
                    role: 'assistant',
                    content: 'Halo! Saya adalah **AI Remuneration Co-pilot (Gemini 3.5)**. Saya memiliki akses analisis komparatif atas seluruh database upah karyawan One For All.\n\nSaya siap membantu Anda:\n1. 🔍 **Audit Upah**: Menganalisis kepatuhan gaji berjalan dengan matriks regulasi resmi.\n2. 📈 **Rencana Kenaikan**: Mensimulasikan dampak anggaran kenaikan berkala karyawan.\n3. 🎯 **Rekomendasi Grade**: Memberikan usulan Grade & Step penyesuaian berbasis kinerja (KPI) secara presisi.\n\nSilakan gunakan panel **Rekomendasi AI Otomatis** di sebelah kiri untuk melakukan evaluasi performa individu, atau ketikkan pertanyaan Anda di kolom chat!',
                    timestamp: new Date()
                  }
                ])}
                className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-900 rounded-lg transition-colors cursor-pointer"
                title="Hapus Percakapan"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Message Area */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {copilotMessages.map(msg => {
                const isUser = msg.role === 'user';
                return (
                  <div key={msg.id} className={`flex gap-3 max-w-[85%] ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}>
                    
                    {/* Avatar */}
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                      isUser 
                        ? 'bg-slate-800 border-slate-700 text-slate-300' 
                        : 'bg-indigo-600/20 border-indigo-500/30 text-indigo-400'
                    }`}>
                      {isUser ? <Users className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>

                    {/* Message Bubble */}
                    <div className={`p-4 rounded-2xl text-xs space-y-1.5 leading-relaxed font-sans ${
                      isUser 
                        ? 'bg-indigo-600 text-white rounded-tr-none' 
                        : 'bg-slate-950 border border-slate-850 text-slate-200 rounded-tl-none'
                    }`}>
                      {/* Formatted body */}
                      <p className="whitespace-pre-line font-medium">
                        {msg.content}
                      </p>
                      
                      <span className="block text-[8.5px] text-slate-500 font-mono text-right">
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                  </div>
                );
              })}

              {copilotLoading && (
                <div className="flex gap-3 max-w-[80%] mr-auto items-center">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600/15 border border-indigo-500/20 text-indigo-400 flex items-center justify-center animate-pulse">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="bg-slate-950 border border-slate-850 p-4 rounded-2xl rounded-tl-none text-xs text-slate-400 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" />
                    <span className="ml-1 font-mono text-[10px]">AI sedang menganalisis upah...</span>
                  </div>
                </div>
              )}
              <div ref={copilotChatEndRef} />
            </div>

            {/* Preset Suggestions Row */}
            <div className="px-5 py-3 border-t border-slate-850 bg-slate-950/20 flex flex-wrap gap-2 items-center">
              <span className="text-[9.5px] text-slate-500 font-black uppercase font-mono mr-1">Pertanyaan Cepat:</span>
              {[
                "Audit kepatuhan gaji berjalan",
                "Rekomendasi upah KPI tertinggi",
                "Simulasi kenaikan seluruh staf +1 Step",
                "Daftar gaji di luar batas skala"
              ].map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendCopilotMessage(suggestion)}
                  disabled={copilotLoading}
                  className="px-2.5 py-1 text-[10.5px] font-bold text-indigo-300 hover:text-white bg-indigo-950/40 hover:bg-indigo-600/30 border border-indigo-900/35 hover:border-indigo-500/40 rounded-lg transition-all cursor-pointer truncate max-w-xs"
                >
                  {suggestion}
                </button>
              ))}
            </div>

            {/* Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendCopilotMessage();
              }}
              className="p-4 bg-slate-950 border-t border-slate-850 flex gap-3.5"
            >
              <input
                type="text"
                value={copilotInput}
                onChange={(e) => setCopilotInput(e.target.value)}
                disabled={copilotLoading}
                placeholder="Tuliskan pertanyaan seputar remunerasi, gaji pokok, atau rekomendasi..."
                className="flex-1 bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-xs text-white focus:outline-none placeholder-slate-500 font-medium"
              />
              <button
                type="submit"
                disabled={copilotLoading || !copilotInput.trim()}
                className="px-4.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-850 text-white disabled:text-slate-600 rounded-xl flex items-center justify-center transition-all cursor-pointer shadow-md shadow-indigo-600/10 active:scale-[0.95]"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>

          </div>

        </div>
      )}

    </div>
  );
}
