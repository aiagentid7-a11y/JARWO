import React, { useState, useMemo, useEffect } from 'react';
import { Employee, Department, JobPosition, JobGrade, OrgTreeNode } from '../types';
import { 
  Network, Building2, Briefcase, Award, Users, UserCheck, 
  Search, Plus, Edit3, Trash2, ChevronRight, ChevronDown, 
  AlertTriangle, CheckCircle2, ShieldAlert, Copy, Check, RefreshCw, 
  Layers, ArrowDown, UserPlus, Filter, Info, Eye, ExternalLink, X
} from 'lucide-react';

interface OrgStructureDashboardProps {
  employees: Employee[];
  onSelectEmployee?: (emp: Employee) => void;
  onRefreshData?: () => void;
}

export default function OrgStructureDashboard({
  employees,
  onSelectEmployee,
  onRefreshData
}: OrgStructureDashboardProps) {
  const [activeTab, setActiveTab] = useState<'tree' | 'departments' | 'positions' | 'reporting' | 'sql'>('tree');
  
  // Data States
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<JobPosition[]>([]);
  const [grades, setGrades] = useState<JobGrade[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filter & Search States
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  // Modals States
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deptForm, setDeptForm] = useState({ code: '', name: '', description: '', parentId: '', managerId: '' });

  const [isPosModalOpen, setIsPosModalOpen] = useState(false);
  const [editingPos, setEditingPos] = useState<JobPosition | null>(null);
  const [posForm, setPosForm] = useState({ title: '', departmentId: '', jobGradeId: '', minExperienceYears: 0, description: '' });

  const [isGradeModalOpen, setIsGradeModalOpen] = useState(false);
  const [gradeForm, setGradeForm] = useState({ gradeCode: '', gradeName: '', level: 5, minSalary: 5000000, maxSalary: 10000000, description: '' });

  // Reporting Line Modal / State
  const [selectedEmpForReporting, setSelectedEmpForReporting] = useState<Employee | null>(null);
  const [targetManagerId, setTargetManagerId] = useState<string>('');
  const [circularError, setCircularError] = useState<string | null>(null);
  const [isSubmittingReporting, setIsSubmittingReporting] = useState(false);

  const [copiedSql, setCopiedSql] = useState(false);

  // Load Departments & Positions from API
  const fetchData = async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      const [deptRes, posRes] = await Promise.all([
        fetch('/api/departments'),
        fetch('/api/job-positions')
      ]);

      if (deptRes.ok) {
        const deptJson = await deptRes.json();
        if (deptJson.departments) setDepartments(deptJson.departments);
      }
      if (posRes.ok) {
        const posJson = await posRes.json();
        if (posJson.positions) setPositions(posJson.positions);
        if (posJson.grades) setGrades(posJson.grades);
      }
    } catch (err: any) {
      console.warn("API load error, using local fallback state", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Default seed departments if API is empty
  const defaultDepartments: Department[] = useMemo(() => {
    if (departments.length > 0) return departments;
    const uniqueDepts = Array.from(new Set(employees.map(e => e.department).filter(Boolean)));
    return uniqueDepts.map((d, idx) => ({
      id: `dept-${idx + 1}`,
      code: `DEPT-0${idx + 1}`,
      name: d,
      description: `Departemen ${d} site Sultra`
    }));
  }, [departments, employees]);

  // Default seed job grades
  const defaultGrades: JobGrade[] = useMemo(() => {
    if (grades.length > 0) return grades;
    return [
      { id: 'g1', gradeCode: 'G1', gradeName: 'Direksi / C-Level', level: 1, minSalary: 35000000, maxSalary: 75000000 },
      { id: 'g2', gradeCode: 'G2', gradeName: 'General Manager', level: 2, minSalary: 22000000, maxSalary: 40000000 },
      { id: 'g3', gradeCode: 'G3', gradeName: 'Manager', level: 3, minSalary: 15000000, maxSalary: 25000000 },
      { id: 'g4', gradeCode: 'G4', gradeName: 'Supervisor', level: 4, minSalary: 9000000, maxSalary: 16000000 },
      { id: 'g5', gradeCode: 'G5', gradeName: 'Staff / Operator', level: 5, minSalary: 5000000, maxSalary: 10000000 },
    ];
  }, [grades]);

  // Construct Employee Hierarchy Tree
  const employeeMap = useMemo(() => {
    const map = new Map<string, Employee>();
    employees.forEach(emp => map.set(emp.id, emp));
    return map;
  }, [employees]);

  // Helper to build hierarchy
  const orgTree = useMemo(() => {
    // Determine reportsToId or fallback manager heuristics based on position title
    const nodesMap = new Map<string, OrgTreeNode>();

    employees.forEach(emp => {
      // Determine level based on title
      let level = 5;
      const posUpper = emp.position.toUpperCase();
      if (posUpper.includes('DIREKTUR') || posUpper.includes('HEAD OF SITE') || posUpper.includes('GENERAL MANAGER')) level = 1;
      else if (posUpper.includes('MANAGER') || posUpper.includes('KTT')) level = 2;
      else if (posUpper.includes('SUPERVISOR') || posUpper.includes('KOORDINATOR') || posUpper.includes('HEAD')) level = 3;
      else if (posUpper.includes('SENIOR') || posUpper.includes('FOREMAN')) level = 4;

      nodesMap.set(emp.id, {
        id: emp.id,
        globalNo: emp.globalNo,
        nik: emp.nik,
        name: emp.name,
        position: emp.position,
        department: emp.department,
        phone: emp.phone,
        status: emp.status,
        reportsToId: emp.reportsToId,
        reportsToName: emp.reportsToName,
        jobGradeLevel: level,
        directReports: []
      });
    });

    // Auto-assign parent heuristic if reportsToId is missing for visual completeness
    const deptManagers = new Map<string, string>(); // dept -> manager emp id
    employees.forEach(emp => {
      const posUpper = emp.position.toUpperCase();
      if (posUpper.includes('MANAGER') || posUpper.includes('HEAD') || posUpper.includes('KTT')) {
        if (!deptManagers.has(emp.department)) {
          deptManagers.set(emp.department, emp.id);
        }
      }
    });

    const roots: OrgTreeNode[] = [];

    nodesMap.forEach((node) => {
      let parentId = node.reportsToId;

      // Fallback heuristic: staff report to department head if no explicit manager assigned
      if (!parentId && deptManagers.has(node.department) && deptManagers.get(node.department) !== node.id) {
        parentId = deptManagers.get(node.department);
      }

      if (parentId && nodesMap.has(parentId) && parentId !== node.id) {
        const parentNode = nodesMap.get(parentId);
        parentNode?.directReports.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }, [employees]);

  // Expand all tree nodes by default
  useEffect(() => {
    const initialExpanded: Record<string, boolean> = {};
    employees.forEach(e => {
      initialExpanded[e.id] = true;
    });
    setExpandedNodes(initialExpanded);
  }, [employees]);

  const toggleNodeExpand = (nodeId: string) => {
    setExpandedNodes(prev => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  // Check Circular Reporting Function (Client Side Validation)
  const checkCircularClient = (empId: string, managerId: string): string | null => {
    if (!managerId) return null;
    if (empId === managerId) return "Karyawan tidak dapat melapor ke dirinya sendiri!";

    // Trace manager's reporting line upwards
    let currentInspector: string | undefined = managerId;
    const visited = new Set<string>();

    while (currentInspector) {
      if (currentInspector === empId) {
        const managerObj = employeeMap.get(managerId);
        const empObj = employeeMap.get(empId);
        return `Circular Reporting Line Detected! ${managerObj?.name || 'Calon Atasan'} sudah berada di bawah rantai komando ${empObj?.name || 'Karyawan'}.`;
      }
      visited.add(currentInspector);
      const inspectorEmp = employeeMap.get(currentInspector);
      currentInspector = inspectorEmp?.reportsToId;

      if (visited.has(currentInspector || '')) {
        break; // Guard against existing loop
      }
    }

    return null;
  };

  // Handle Reporting Line Assign Submit
  const handleAssignReportingLine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpForReporting) return;

    const empId = selectedEmpForReporting.id;
    const managerId = targetManagerId;

    // Validate
    const err = checkCircularClient(empId, managerId);
    if (err) {
      setCircularError(err);
      return;
    }

    setIsSubmittingReporting(true);
    setCircularError(null);

    try {
      const response = await fetch('/api/org-chart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: empId, reportsToId: managerId || null })
      });

      const resJson = await response.json();

      if (!response.ok) {
        setCircularError(resJson.error || 'Gagal memperbarui atasan langsung');
        setIsSubmittingReporting(false);
        return;
      }

      // Update local state
      const managerName = managerId ? employeeMap.get(managerId)?.name : '';
      selectedEmpForReporting.reportsToId = managerId || undefined;
      selectedEmpForReporting.reportsToName = managerName || undefined;

      setSuccessMsg(`Atasan langsung ${selectedEmpForReporting.name} berhasil diperbarui!`);
      setSelectedEmpForReporting(null);
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      // Local fallback if API unavailable
      const managerName = managerId ? employeeMap.get(managerId)?.name : '';
      selectedEmpForReporting.reportsToId = managerId || undefined;
      selectedEmpForReporting.reportsToName = managerName || undefined;

      setSuccessMsg(`[Lokal] Atasan langsung ${selectedEmpForReporting.name} berhasil diperbarui!`);
      setSelectedEmpForReporting(null);
    } finally {
      setIsSubmittingReporting(false);
      setTimeout(() => setSuccessMsg(null), 4000);
    }
  };

  // Add / Edit Department Submit
  const handleSaveDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptForm.name || !deptForm.code) return;

    try {
      if (editingDept) {
        await fetch(`/api/departments/${editingDept.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(deptForm)
        });
      } else {
        await fetch('/api/departments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(deptForm)
        });
      }
      setIsDeptModalOpen(false);
      fetchData();
      setSuccessMsg(`Departemen ${deptForm.name} berhasil disimpan`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setIsDeptModalOpen(false);
    }
  };

  // Add / Edit Position Submit
  const handleSavePosition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!posForm.title) return;

    try {
      if (editingPos) {
        await fetch(`/api/job-positions/${editingPos.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(posForm)
        });
      } else {
        await fetch('/api/job-positions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(posForm)
        });
      }
      setIsPosModalOpen(false);
      fetchData();
      setSuccessMsg(`Jabatan ${posForm.title} berhasil disimpan`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setIsPosModalOpen(false);
    }
  };

  // Add Grade Submit
  const handleSaveGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gradeForm.gradeCode) return;

    try {
      await fetch('/api/job-positions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'grade', ...gradeForm })
      });
      setIsGradeModalOpen(false);
      fetchData();
      setSuccessMsg(`Job Grade ${gradeForm.gradeCode} berhasil ditambahkan`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setIsGradeModalOpen(false);
    }
  };

  // Copy SQL Schema Script
  const copySqlToClipboard = () => {
    const sqlText = `-- SKEMA SUPABASE HR "EMPLOYEE DATABASE PRO"
CREATE TABLE IF NOT EXISTS public.departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    manager_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.job_grades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grade_code VARCHAR(10) NOT NULL UNIQUE,
    grade_name VARCHAR(50) NOT NULL,
    level INT NOT NULL CHECK (level >= 1 AND level <= 10),
    min_salary NUMERIC(15, 2),
    max_salary NUMERIC(15, 2),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.job_positions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(100) NOT NULL,
    code VARCHAR(20),
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    job_grade_id UUID REFERENCES public.job_grades(id) ON DELETE SET NULL,
    description TEXT,
    min_experience_years INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ADD FOREIGN KEYS & CIRCULAR CHECK TRIGGER TO EMPLOYEES TABLE
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS reports_to_id UUID REFERENCES public.employees(id) ON DELETE SET NULL;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS reports_to_name VARCHAR(150);
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS job_position_id UUID REFERENCES public.job_positions(id) ON DELETE SET NULL;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS job_grade_id UUID REFERENCES public.job_grades(id) ON DELETE SET NULL;

-- TRIGGER FUNCTION TO PREVENT CIRCULAR REPORTING LINES
CREATE OR REPLACE FUNCTION check_circular_reporting()
RETURNS TRIGGER AS $$
DECLARE
    curr_id UUID;
BEGIN
    IF NEW.reports_to_id IS NULL THEN RETURN NEW; END IF;
    IF NEW.id = NEW.reports_to_id THEN
        RAISE EXCEPTION 'Circular Reporting Error: Karyawan tidak dapat melapor ke dirinya sendiri.';
    END IF;
    curr_id := NEW.reports_to_id;
    WHILE curr_id IS NOT NULL LOOP
        IF curr_id = NEW.id THEN
            RAISE EXCEPTION 'Circular Reporting Error: Terdeteksi siklus atasan-bawahan melingkar!';
        END IF;
        SELECT reports_to_id INTO curr_id FROM public.employees WHERE id = curr_id;
    END LOOP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_circular_reporting ON public.employees;
CREATE TRIGGER trg_prevent_circular_reporting
BEFORE INSERT OR UPDATE OF reports_to_id ON public.employees
FOR EACH ROW EXECUTE FUNCTION check_circular_reporting();
`;
    navigator.clipboard.writeText(sqlText);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  // Filtered nodes for tree view search
  const matchesSearch = (node: OrgTreeNode): boolean => {
    if (!searchTerm && deptFilter === 'all') return true;
    const matchTerm = !searchTerm || 
      node.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      node.position.toLowerCase().includes(searchTerm.toLowerCase());
    const matchDept = deptFilter === 'all' || node.department === deptFilter;
    return matchTerm && matchDept;
  };

  // Recursive Tree Node Renderer Component
  const renderTreeNode = (node: OrgTreeNode, depth: number = 0) => {
    const hasChildren = node.directReports && node.directReports.length > 0;
    const isExpanded = expandedNodes[node.id] ?? true;

    // Level Badges styling
    const levelColor = 
      node.jobGradeLevel === 1 ? 'bg-purple-500/10 text-purple-400 border-purple-500/30' :
      node.jobGradeLevel === 2 ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30' :
      node.jobGradeLevel === 3 ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' :
      node.jobGradeLevel === 4 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
      'bg-slate-800 text-slate-300 border-slate-700';

    return (
      <div key={node.id} className="relative pl-4 md:pl-6 my-2 border-l-2 border-slate-800/80 hover:border-blue-500/50 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-slate-900/90 border border-slate-800/80 hover:border-blue-500/40 rounded-xl transition-all shadow-sm gap-2">
          
          <div className="flex items-center gap-3">
            {/* Expand / Collapse Button */}
            {hasChildren ? (
              <button 
                onClick={() => toggleNodeExpand(node.id)}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
              >
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            ) : (
              <div className="w-6 h-6 flex items-center justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />
              </div>
            )}

            {/* Avatar Initials */}
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-md shrink-0">
              {node.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
            </div>

            {/* Info */}
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-slate-100 hover:text-blue-400 transition-colors cursor-pointer"
                  onClick={() => {
                    const emp = employeeMap.get(node.id);
                    if (emp && onSelectEmployee) onSelectEmployee(emp);
                  }}
                >
                  {node.name}
                </h4>
                <span className={`text-[9px] px-2 py-0.5 rounded-full border font-semibold ${levelColor}`}>
                  Level {node.jobGradeLevel || 5}
                </span>
              </div>
              
              <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                <span className="font-medium text-blue-400">{node.position}</span>
                <span>&bull;</span>
                <span className="text-slate-500">{node.department}</span>
              </div>
            </div>
          </div>

          {/* Right Badges & Actions */}
          <div className="flex items-center gap-2 ml-9 sm:ml-0">
            {hasChildren && (
              <span className="text-[10px] px-2 py-1 bg-slate-800 text-indigo-300 font-mono rounded-md border border-slate-700/60 flex items-center gap-1">
                <Users className="w-3 h-3" /> {node.directReports.length} Bawahan
              </span>
            )}

            <button
              onClick={() => {
                const emp = employeeMap.get(node.id);
                if (emp) {
                  setSelectedEmpForReporting(emp);
                  setTargetManagerId(emp.reportsToId || '');
                  setCircularError(null);
                }
              }}
              className="px-2.5 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition-colors flex items-center gap-1"
              title="Atur Atasan Langsung"
            >
              <UserPlus className="w-3 h-3 text-blue-400" />
              <span>Atur Atasan</span>
            </button>
          </div>
        </div>

        {/* Child Nodes */}
        {hasChildren && isExpanded && (
          <div className="ml-2 md:ml-4">
            {node.directReports.map(child => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* SUCCESS / ERROR ALERTS */}
      {successMsg && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-medium flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 md:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-wider mb-1">
              <Network className="w-4 h-4" /> Modul HR &bull; Struktur Organisasi
            </div>
            <h1 className="text-xl md:text-2xl font-black text-white font-heading">
              Bagan Hirarki &amp; Struktur Organisasi
            </h1>
            <p className="text-slate-400 text-xs md:text-sm mt-1 max-w-2xl">
              Visualisasi struktur departemen, posisi jabatan, job grade, dan tata kelola atasan langsung (reporting line) dengan deteksi otomatis siklus melingkar (circular reporting prevention).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('sql')}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Copy className="w-3.5 h-3.5 text-blue-400" />
              <span>Skema SQL Supabase</span>
            </button>
          </div>
        </div>

        {/* METRICS SUMMARY ROW */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800/80">
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-850">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Karyawan</div>
            <div className="text-lg font-black text-white font-mono mt-0.5">{employees.length}</div>
          </div>
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-850">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Departemen</div>
            <div className="text-lg font-black text-blue-400 font-mono mt-0.5">{defaultDepartments.length}</div>
          </div>
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-850">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Jabatan</div>
            <div className="text-lg font-black text-indigo-400 font-mono mt-0.5">{positions.length || 12}</div>
          </div>
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-850">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Level Job Grade</div>
            <div className="text-lg font-black text-emerald-400 font-mono mt-0.5">{defaultGrades.length} Level</div>
          </div>
        </div>
      </div>

      {/* TABS NAVIGATION BAR */}
      <div className="flex items-center gap-2 border-b border-slate-800 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => setActiveTab('tree')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'tree'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Network className="w-4 h-4" />
          <span>🌳 Visual Org Chart</span>
        </button>

        <button
          onClick={() => setActiveTab('departments')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'departments'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>🏢 Departemen ({defaultDepartments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('positions')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'positions'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>💼 Jabatan &amp; Job Grade</span>
        </button>

        <button
          onClick={() => setActiveTab('reporting')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'reporting'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <UserPlus className="w-4 h-4" />
          <span>🔄 Atasan Langsung &amp; Validasi</span>
        </button>

        <button
          onClick={() => setActiveTab('sql')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'sql'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Copy className="w-4 h-4" />
          <span>📜 Skema SQL Supabase</span>
        </button>
      </div>

      {/* TAB 1: VISUAL ORG TREE */}
      {activeTab === 'tree' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
              {/* Search */}
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Cari nama atau jabatan..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 placeholder-slate-600"
                />
              </div>

              {/* Department Filter */}
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="w-full sm:w-48 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="all">Semua Departemen</option>
                {defaultDepartments.map(d => (
                  <option key={d.id} value={d.name}>{d.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const allEx: Record<string, boolean> = {};
                  employees.forEach(e => allEx[e.id] = true);
                  setExpandedNodes(allEx);
                }}
                className="px-2.5 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700"
              >
                Buka Semua
              </button>
              <button
                onClick={() => setExpandedNodes({})}
                className="px-2.5 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700"
              >
                Tutup Semua
              </button>
            </div>
          </div>

          {/* Org Tree Container */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-6 shadow-inner min-h-[400px]">
            {orgTree.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                Belum ada data karyawan untuk ditampilkan di bagan organisasi.
              </div>
            ) : (
              <div className="space-y-3">
                {orgTree
                  .filter(matchesSearch)
                  .map(rootNode => renderTreeNode(rootNode, 0))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: DEPARTMENTS MANAGEMENT */}
      {activeTab === 'departments' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Daftar Departemen Organisasi</h3>
              <p className="text-xs text-slate-400">Kelola master data departemen, kode entitas, dan kepala divisi.</p>
            </div>

            <button
              onClick={() => {
                setEditingDept(null);
                setDeptForm({ code: '', name: '', description: '', parentId: '', managerId: '' });
                setIsDeptModalOpen(true);
              }}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Departemen</span>
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider font-bold border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Kode</th>
                    <th className="px-4 py-3">Nama Departemen</th>
                    <th className="px-4 py-3">Atasan / Parent Dept</th>
                    <th className="px-4 py-3">Kepala Departemen</th>
                    <th className="px-4 py-3">Karyawan Terdata</th>
                    <th className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {defaultDepartments.map(dept => {
                    const empCount = employees.filter(e => e.department === dept.name).length;
                    return (
                      <tr key={dept.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-blue-400">{dept.code}</td>
                        <td className="px-4 py-3 font-semibold text-white">{dept.name}</td>
                        <td className="px-4 py-3 text-slate-400">{dept.parentName || '-'}</td>
                        <td className="px-4 py-3 text-slate-300 font-medium">{dept.managerName || '-'}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono font-bold">
                            {empCount} Orang
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right space-x-1">
                          <button
                            onClick={() => {
                              setEditingDept(dept);
                              setDeptForm({
                                code: dept.code,
                                name: dept.name,
                                description: dept.description || '',
                                parentId: dept.parentId || '',
                                managerId: dept.managerId || ''
                              });
                              setIsDeptModalOpen(true);
                            }}
                            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: POSITIONS & JOB GRADES */}
      {activeTab === 'positions' && (
        <div className="space-y-6">
          {/* Job Grades Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Master Job Grade / Level Struktural</h3>
                <p className="text-xs text-slate-400">Penggolongan level 1 (CEO/C-Level) hingga Level 5 (Staff) beserta skala gaji.</p>
              </div>

              <button
                onClick={() => setIsGradeModalOpen(true)}
                className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shadow-md"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Job Grade</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
              {defaultGrades.map(g => (
                <div key={g.id} className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold font-mono text-purple-400 px-2 py-0.5 bg-purple-500/10 rounded border border-purple-500/20">
                      {g.gradeCode}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">Level {g.level}</span>
                  </div>
                  <h4 className="text-xs font-bold text-white">{g.gradeName}</h4>
                  <div className="text-[10.5px] text-slate-400 font-mono">
                    Rp {(g.minSalary || 0).toLocaleString('id-ID')} - Rp {(g.maxSalary || 0).toLocaleString('id-ID')}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Job Positions List */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Master Jabatan (Job Positions)</h3>
                <p className="text-xs text-slate-400">Daftar nama jabatan resmi per departemen.</p>
              </div>

              <button
                onClick={() => {
                  setEditingPos(null);
                  setPosForm({ title: '', departmentId: '', jobGradeId: '', minExperienceYears: 0, description: '' });
                  setIsPosModalOpen(true);
                }}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shadow-md"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Posisi Jabatan</span>
              </button>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider font-bold border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3">Nama Jabatan</th>
                      <th className="px-4 py-3">Departemen</th>
                      <th className="px-4 py-3">Job Grade / Level</th>
                      <th className="px-4 py-3">Min. Pengalaman</th>
                      <th className="px-4 py-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {positions.length > 0 ? (
                      positions.map(pos => (
                        <tr key={pos.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="px-4 py-3 font-semibold text-white">{pos.title}</td>
                          <td className="px-4 py-3 text-slate-400">{pos.departmentName || '-'}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 font-mono font-bold">
                              {pos.jobGradeName || 'Grade Standard'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-400">{pos.minExperienceYears || 0} Tahun</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => {
                                setEditingPos(pos);
                                setPosForm({
                                  title: pos.title,
                                  departmentId: pos.departmentId || '',
                                  jobGradeId: pos.jobGradeId || '',
                                  minExperienceYears: pos.minExperienceYears || 0,
                                  description: pos.description || ''
                                });
                                setIsPosModalOpen(true);
                              }}
                              className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      // Sample positions fallback display
                      Array.from(new Set(employees.map(e => e.position))).slice(0, 10).map((posTitle, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                          <td className="px-4 py-3 font-semibold text-white">{posTitle}</td>
                          <td className="px-4 py-3 text-slate-400">Site Operations</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 font-mono font-bold">
                              Grade G4 / Staff
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-400">1-2 Tahun</td>
                          <td className="px-4 py-3 text-right">
                            <span className="text-[10px] text-slate-500">Terdaftar</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: REPORTING LINE & CIRCULAR VALIDATION ASSIGNER */}
      {activeTab === 'reporting' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
              <ShieldAlert className="w-4 h-4" /> Pengaturan Atasan Langsung &amp; Validasi Anti-Siklus
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Pilih atasan langsung (Direct Manager) untuk setiap karyawan. Sistem secara otomatis menjalankan algoritma validasi di sisi server &amp; client untuk mencegah **Circular Reporting** (contoh: Karyawan A melapor ke B, lalu B diubah melapor ke A).
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between gap-3">
              <div className="relative w-full max-w-xs">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter nama karyawan..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 placeholder-slate-600"
                />
              </div>

              <span className="text-xs text-slate-400">
                {employees.length} Karyawan Terdata
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider font-bold border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Karyawan</th>
                    <th className="px-4 py-3">Jabatan &amp; Divisi</th>
                    <th className="px-4 py-3">Atasan Langsung Terdaftar</th>
                    <th className="px-4 py-3 text-right">Aksi Penetapan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {employees
                    .filter(e => !searchTerm || e.name.toLowerCase().includes(searchTerm.toLowerCase()) || e.position.toLowerCase().includes(searchTerm.toLowerCase()))
                    .slice(0, 30)
                    .map(emp => (
                      <tr key={emp.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-bold text-white">{emp.name}</div>
                          <div className="text-[10px] text-slate-500 font-mono">NIK: {emp.nik || '-'}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-blue-400">{emp.position}</div>
                          <div className="text-[10px] text-slate-400">{emp.department}</div>
                        </td>
                        <td className="px-4 py-3">
                          {emp.reportsToName ? (
                            <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-medium flex items-center gap-1.5 w-fit">
                              <UserCheck className="w-3.5 h-3.5" />
                              {emp.reportsToName}
                            </span>
                          ) : (
                            <span className="text-[11px] text-amber-400 font-medium italic">
                              Belum Ditetapkan (Direct Head)
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => {
                              setSelectedEmpForReporting(emp);
                              setTargetManagerId(emp.reportsToId || '');
                              setCircularError(null);
                            }}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-xs transition-colors flex items-center gap-1 ml-auto shadow-sm"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>Ubah Atasan</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: SUPABASE SQL SCHEMA DISPLAY */}
      {activeTab === 'sql' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                <Copy className="w-4 h-4" /> Skema Database Supabase PostgreSQL
              </div>
              <button
                onClick={copySqlToClipboard}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shadow"
              >
                {copiedSql ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedSql ? 'Tersalin!' : 'Salin SQL Script'}</span>
              </button>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Jalankan skema DDL di bawah ini di **Supabase SQL Editor** Anda untuk membuat tabel `departments`, `job_positions`, `job_grades`, serta trigger `trg_prevent_circular_reporting` yang menjamin integritas data secara mutlak.
            </p>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 font-mono text-xs text-slate-300 overflow-x-auto shadow-inner space-y-2">
            <pre className="text-[11px] text-blue-300 leading-relaxed whitespace-pre-wrap">
{`-- 1. TABEL DEPARTEMEN
CREATE TABLE IF NOT EXISTS public.departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    manager_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. TABEL JOB GRADES / LEVELS
CREATE TABLE IF NOT EXISTS public.job_grades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grade_code VARCHAR(10) NOT NULL UNIQUE,
    grade_name VARCHAR(50) NOT NULL,
    level INT NOT NULL CHECK (level >= 1 AND level <= 10),
    min_salary NUMERIC(15, 2),
    max_salary NUMERIC(15, 2),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. TABEL JABATAN / POSISI
CREATE TABLE IF NOT EXISTS public.job_positions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(100) NOT NULL,
    code VARCHAR(20),
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    job_grade_id UUID REFERENCES public.job_grades(id) ON DELETE SET NULL,
    description TEXT,
    min_experience_years INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. UPDATE TABEL KARYAWAN UNTUK REPORTING LINE & RELASI
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS reports_to_id UUID REFERENCES public.employees(id) ON DELETE SET NULL;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS reports_to_name VARCHAR(150);
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS job_position_id UUID REFERENCES public.job_positions(id) ON DELETE SET NULL;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS job_grade_id UUID REFERENCES public.job_grades(id) ON DELETE SET NULL;

-- 5. FUNCTION & TRIGGER PREVENT CIRCULAR REPORTING LINES (A -> B -> A)
CREATE OR REPLACE FUNCTION check_circular_reporting()
RETURNS TRIGGER AS $$
DECLARE
    curr_id UUID;
BEGIN
    IF NEW.reports_to_id IS NULL THEN
        RETURN NEW;
    END IF;

    IF NEW.id = NEW.reports_to_id THEN
        RAISE EXCEPTION 'Circular Reporting Error: Karyawan tidak dapat melapor ke dirinya sendiri.';
    END IF;

    curr_id := NEW.reports_to_id;
    WHILE curr_id IS NOT NULL LOOP
        IF curr_id = NEW.id THEN
            RAISE EXCEPTION 'Circular Reporting Error: Terdeteksi siklus hubungan atasan-bawahan melingkar!';
        END IF;

        SELECT reports_to_id INTO curr_id FROM public.employees WHERE id = curr_id;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_circular_reporting ON public.employees;
CREATE TRIGGER trg_prevent_circular_reporting
BEFORE INSERT OR UPDATE OF reports_to_id ON public.employees
FOR EACH ROW
EXECUTE FUNCTION check_circular_reporting();`}
            </pre>
          </div>
        </div>
      )}

      {/* MODAL 1: REPORTING LINE ASSIGNMENT MODAL WITH LIVE CIRCULAR CHECK */}
      {selectedEmpForReporting && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-400" />
                <h3 className="text-base font-bold text-white">Atur Atasan Langsung</h3>
              </div>
              <button 
                onClick={() => setSelectedEmpForReporting(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 space-y-1">
              <div className="text-[10px] text-slate-500 font-bold uppercase">Karyawan Terpilih</div>
              <div className="text-sm font-bold text-white">{selectedEmpForReporting.name}</div>
              <div className="text-xs text-blue-400">{selectedEmpForReporting.position} &bull; {selectedEmpForReporting.department}</div>
            </div>

            <form onSubmit={handleAssignReportingLine} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 block">
                  Pilih Atasan Langsung (Direct Manager)
                </label>
                <select
                  value={targetManagerId}
                  onChange={(e) => {
                    const newMgrId = e.target.value;
                    setTargetManagerId(newMgrId);
                    const err = checkCircularClient(selectedEmpForReporting.id, newMgrId);
                    setCircularError(err);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="">-- Tanpa Atasan (Direct Head / CEO / General Manager) --</option>
                  {employees
                    .filter(e => e.id !== selectedEmpForReporting.id)
                    .map(mgr => (
                      <option key={mgr.id} value={mgr.id}>
                        {mgr.name} ({mgr.position} - {mgr.department})
                      </option>
                    ))}
                </select>
              </div>

              {/* LIVE CIRCULAR ERROR BANNER */}
              {circularError && (
                <div className="p-3.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-xs space-y-1 animate-shake">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                    <span>Validasi Melingkar (Circular Reporting Error)</span>
                  </div>
                  <p className="text-[11px] text-red-300 leading-relaxed">
                    {circularError}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedEmpForReporting(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={Boolean(circularError) || isSubmittingReporting}
                  className={`px-5 py-2 text-white text-xs font-bold rounded-xl transition-all shadow-lg ${
                    circularError || isSubmittingReporting
                      ? 'bg-slate-700 opacity-50 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20'
                  }`}
                >
                  {isSubmittingReporting ? 'Menyimpan...' : 'Simpan Reporting Line'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: DEPARTMENT MODAL */}
      {isDeptModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">
                {editingDept ? 'Edit Departemen' : 'Tambah Departemen Baru'}
              </h3>
              <button onClick={() => setIsDeptModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDepartment} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Kode Departemen *</label>
                <input
                  type="text"
                  required
                  placeholder="Misal: DEPT-HRD, DEPT-ENG"
                  value={deptForm.code}
                  onChange={(e) => setDeptForm(prev => ({ ...prev, code: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Nama Departemen *</label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Human Resource & GA"
                  value={deptForm.name}
                  onChange={(e) => setDeptForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Deskripsi &amp; Tugas</label>
                <textarea
                  rows={2}
                  placeholder="Fungsi operasional departemen..."
                  value={deptForm.description}
                  onChange={(e) => setDeptForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDeptModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow"
                >
                  Simpan Departemen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: POSITION MODAL */}
      {isPosModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">
                {editingPos ? 'Edit Jabatan' : 'Tambah Posisi Jabatan Baru'}
              </h3>
              <button onClick={() => setIsPosModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePosition} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Nama Jabatan (Position Title) *</label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Senior Geologist, HR Officer"
                  value={posForm.title}
                  onChange={(e) => setPosForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Pilih Departemen</label>
                <select
                  value={posForm.departmentId}
                  onChange={(e) => setPosForm(prev => ({ ...prev, departmentId: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="">-- Pilih Departemen --</option>
                  {defaultDepartments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Minimum Pengalaman (Tahun)</label>
                <input
                  type="number"
                  min={0}
                  value={posForm.minExperienceYears}
                  onChange={(e) => setPosForm(prev => ({ ...prev, minExperienceYears: Number(e.target.value) }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPosModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow"
                >
                  Simpan Jabatan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: GRADE MODAL */}
      {isGradeModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Tambah Job Grade / Level Struktural</h3>
              <button onClick={() => setIsGradeModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGrade} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Kode Grade *</label>
                <input
                  type="text"
                  required
                  placeholder="Misal: G6, EXEC-2"
                  value={gradeForm.gradeCode}
                  onChange={(e) => setGradeForm(prev => ({ ...prev, gradeCode: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Nama Grade *</label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Senior Supervisor"
                  value={gradeForm.gradeName}
                  onChange={(e) => setGradeForm(prev => ({ ...prev, gradeName: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Level Struktural (1 = CEO, 10 = Junior)</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={gradeForm.level}
                  onChange={(e) => setGradeForm(prev => ({ ...prev, level: Number(e.target.value) }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsGradeModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow"
                >
                  Simpan Job Grade
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
