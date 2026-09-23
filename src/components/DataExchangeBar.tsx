import React, { useState, useRef, useEffect } from 'react';
import { 
  Download, Upload, FileSpreadsheet, X, AlertCircle, CheckCircle2, 
  HelpCircle, UploadCloud, RefreshCw, FileDown, FileText,
  Cloud, LogOut, Search, FolderOpen, FileUp, Check, Info, Trash2,
  ShieldCheck, SlidersHorizontal
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { 
  initAuth, 
  googleSignIn as signIn, 
  logout as signOut, 
  getAccessToken,
  listFiles, 
  downloadFile, 
  uploadFile,
  getFileMetadata
} from '../lib/googleAuth';
import { User } from 'firebase/auth';
import autoTable from 'jspdf-autotable';
import { Employee } from '../types';

// Map database fields to user-friendly Indonesian labels
const FIELD_LABELS: Record<string, string> = {
  name: 'Nama Tenaga Kerja',
  nik: '( N I K )',
  position: 'Jabatan',
  department: 'Departemen',
  status: 'STATUS',
  startDate: 'Mulai Kerja',
  birthDate: 'Tanggal Lahir',
  age: 'USIA',
  gender: 'Jenis Kelamin',
  phone: 'Nomor HP',
  address: 'ALAMAT',
  education: 'Pendidikan',
  certification: 'Sertfikasi',
  salaryGrade: 'Ruang Gaji',
  wage: 'Upah*',
  bpjsTk: 'No BPJS TK',
  bpjsKes: 'No BPJS KESEHATAN',
  isLocal: 'Lokal',
  isNonLocal: 'Non Lokal',
  contractEndDate: 'Akhir Kontrak',
  leaveRemaining: 'Sisa Cuti',
  leaveUsed: 'Cuti Terpakai',
  
  // KPI
  kpiScore: 'Skor KPI',
  kpiRating: 'Rating KPI',
  kpiPeriod: 'Periode KPI',

  // Sourcing
  recruitmentSource: 'Saluran Rekrutmen',
  recruitmentStage: 'Tahapan Rekrutmen',

  // Perjalanan Dinas
  businessTripStatus: 'Status Dinas',
  businessTripDestination: 'Tujuan SPPD',
  businessTripStartDate: 'Mulai Dinas',
  businessTripEndDate: 'Selesai Dinas',
  businessTripPurpose: 'Maksud Perjalanan',
  businessTripAllowance: 'Uang Saku',
  businessTripTransport: 'Transportasi',
  businessTripNotes: 'Catatan Dinas',

  // Payroll / Gaji
  basicWage: 'Gaji Pokok',
  fixedAllowance: 'Tunjangan Tetap',
  variableAllowance: 'Tunjangan Tidak Tetap',
  mealAllowance: 'Uang Makan',
  overtimePay: 'Kompensasi Lembur',
  incentive: 'Insentif Khusus',
  contractCompensation: 'Kompensasi Kontrak (PKWT)',
  bpjsDeduction: 'Potongan BPJS',
  pphTax: 'Potongan Pajak PPh',
  grossSalary: 'Gaji Kotor (Bruto)',
  netSalary: 'Gaji Bersih (Netto)',
  taxMethod: 'Metode Pajak',
  taxRate: 'Tarif Pajak (%)',

  // Absensi
  attendanceRate: 'Tingkat Kehadiran (%)',
  daysPresent: 'Hari Hadir',
  daysLate: 'Hari Terlambat',
  daysAbsent: 'Hari Alpa/Mangkir',
  daysPermit: 'Hari Izin/Sakit',

  // Cuti / Roster
  leaveExpiryDate: 'Masa Berlaku Cuti',
  rosterDecision: 'Keputusan Roster',
  postponedWeeks: 'Minggu Penundaan Roster',
  postponedNotes: 'Catatan Penundaan Roster',
  annualLeaveDuration: 'Durasi Cuti Tahunan',
  specialLeaveDuration: 'Durasi Cuti Khusus',
  specialLeaveReason: 'Alasan Cuti Khusus',

  // Domisili (already defined as Lokal and Non Lokal above)
};

interface ImportPreviewData {
  totalRows: number;
  addedCount: number;
  updatedCount: number;
  conflictCount: number;
  skippedCount: number;
  skippedLogs: { rowNum: string | number; reason: string }[];
  validRows: {
    data: any;
    statusType: 'add' | 'update' | 'conflict';
    conflictReason?: string;
    fieldDiffs?: { key: string; label: string; dbVal: any; fileVal: any }[];
    matchedEmp?: Employee;
    rowNum: string | number;
  }[];
}

interface DataExchangeBarProps {
  data: any[]; // The active dataset (filtered or full)
  fileName: string; // File name for export, e.g. "laporan_cuti"
  onUploadSuccess?: () => void; // Reload action after upload completes
  onClearAllEmployees?: () => Promise<void> | void; // Clear all data
  onResetDatabase?: () => Promise<void> | void; // Reset to initial seed
  title?: string; // Optional context title
  dashboardType?: string; // Optional dashboard context identifier, e.g. 'TK_JUNI', 'BPJS_KESEHATAN'
}

export default function DataExchangeBar({ 
  data, 
  fileName, 
  onUploadSuccess,
  onClearAllEmployees,
  onResetDatabase,
  title = "Ekspor / Impor Data",
  dashboardType = "GENERAL"
}: DataExchangeBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
    added?: number;
    updated?: number;
  }>({ type: null, message: '' });

  // Import Preview State
  const [importPreview, setImportPreview] = useState<ImportPreviewData | null>(null);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [previewFilter, setPreviewFilter] = useState<'all' | 'conflict' | 'add' | 'update'>('all');

  // Helper to detect conflicting field values between DB record and uploaded file
  const detectFieldConflicts = (dbEmp: Employee, incoming: any) => {
    const diffs: { key: string; label: string; dbVal: any; fileVal: any }[] = [];

    const compareKeys = [
      { key: 'name', label: 'Nama Karyawan (Dukcapil)' },
      { key: 'birthDate', label: 'Tanggal Lahir' },
      { key: 'bpjsTk', label: 'No. KPJ / BPJS Ketenagakerjaan' },
      { key: 'bpjsKes', label: 'No. BPJS Kesehatan' },
      { key: 'startDate', label: 'Mulai Kerja / Kontrak Awal' },
      { key: 'contractEndDate', label: 'Periode Kontrak Akhir (PKWT)' },
      { key: 'status', label: 'Status Kerja (PKWT/PKWTT)' },
      { key: 'department', label: 'Departemen' },
      { key: 'position', label: 'Jabatan' },
      { key: 'wage', label: 'Upah / Gaji' }
    ];

    compareKeys.forEach(({ key, label }) => {
      const dbVal = (dbEmp as any)[key];
      const fileVal = incoming[key];

      if (
        dbVal !== undefined && dbVal !== null && dbVal !== "" &&
        fileVal !== undefined && fileVal !== null && fileVal !== ""
      ) {
        let isDiff = false;
        if (typeof dbVal === 'string' && typeof fileVal === 'string') {
          const normDb = dbVal.trim().toLowerCase().replace(/[\s.,_-]/g, '');
          const normFile = fileVal.trim().toLowerCase().replace(/[\s.,_-]/g, '');
          if (normDb !== normFile) {
            isDiff = true;
          }
        } else if (Number(dbVal) !== Number(fileVal)) {
          isDiff = true;
        }

        if (isDiff) {
          diffs.push({ key, label, dbVal, fileVal });
        }
      }
    });

    return diffs;
  };

  // Helper to recalculate summary numbers when conflicts are resolved
  const updateImportPreviewState = (newValidRows: ImportPreviewData['validRows']) => {
    const addedCount = newValidRows.filter(r => r.statusType === 'add').length;
    const updatedCount = newValidRows.filter(r => r.statusType === 'update').length;
    const conflictCount = newValidRows.filter(r => r.statusType === 'conflict').length;
    const skippedCount = importPreview ? importPreview.skippedLogs.filter(l => !l.reason.includes('Konflik')).length : 0;

    setImportPreview(prev => {
      if (!prev) return null;
      return {
        ...prev,
        addedCount,
        updatedCount,
        conflictCount,
        skippedCount,
        validRows: newValidRows
      };
    });
  };

  // Resolve a single conflict row
  const handleResolveConflictRow = (
    rowIdx: number, 
    mode: 'file' | 'db' | 'dukcapil_smart' | 'bpjs_tk', 
    customSelections?: Record<string, 'file' | 'db'>
  ) => {
    if (!importPreview) return;
    const targetRow = importPreview.validRows[rowIdx];
    if (!targetRow || !targetRow.matchedEmp) return;

    const matchedEmp = targetRow.matchedEmp;
    const fileData = targetRow.data;

    let mergedData: any = {};

    if (mode === 'file' || mode === 'bpjs_tk') {
      mergedData = { 
        ...matchedEmp, 
        ...fileData, 
        id: matchedEmp.id,
        bpjsTk: fileData.bpjsTk || matchedEmp.bpjsTk,
        bpjsKes: fileData.bpjsKes || matchedEmp.bpjsKes,
        name: fileData.name || matchedEmp.name,
        nik: fileData.nik || matchedEmp.nik
      };
    } else if (mode === 'db') {
      mergedData = { ...fileData, ...matchedEmp, id: matchedEmp.id };
    } else if (mode === 'dukcapil_smart') {
      mergedData = {
        ...matchedEmp,
        ...fileData,
        id: matchedEmp.id,
        name: matchedEmp.name || fileData.name,
        nik: matchedEmp.nik || fileData.nik,
        birthDate: matchedEmp.birthDate || fileData.birthDate,
        gender: matchedEmp.gender || fileData.gender,
        startDate: fileData.startDate || matchedEmp.startDate,
        contractEndDate: fileData.contractEndDate !== undefined ? fileData.contractEndDate : matchedEmp.contractEndDate,
        status: fileData.status || matchedEmp.status,
        bpjsTk: fileData.bpjsTk || matchedEmp.bpjsTk,
        bpjsKes: fileData.bpjsKes || matchedEmp.bpjsKes,
        wage: fileData.wage || matchedEmp.wage
      };
    } else if (customSelections) {
      mergedData = { ...matchedEmp, id: matchedEmp.id };
      Object.entries(customSelections).forEach(([key, choice]) => {
        mergedData[key] = choice === 'file' ? fileData[key] : matchedEmp[key as keyof Employee];
      });
    }

    const updatedValidRows = [...importPreview.validRows];
    updatedValidRows[rowIdx] = {
      ...targetRow,
      data: mergedData,
      statusType: 'update',
      conflictReason: undefined,
      fieldDiffs: undefined
    };

    updateImportPreviewState(updatedValidRows);
  };

  // Resolve all conflicts at once (Bulk Approval)
  const handleResolveAllConflicts = (mode: 'file' | 'db' | 'dukcapil_smart' | 'bpjs_tk') => {
    if (!importPreview) return;
    const updatedValidRows = importPreview.validRows.map(row => {
      if (row.statusType !== 'conflict' || !row.matchedEmp) return row;

      const matchedEmp = row.matchedEmp;
      const fileData = row.data;
      let mergedData: any = {};

      if (mode === 'file' || mode === 'bpjs_tk') {
        mergedData = { 
          ...matchedEmp, 
          ...fileData, 
          id: matchedEmp.id,
          bpjsTk: fileData.bpjsTk || matchedEmp.bpjsTk,
          bpjsKes: fileData.bpjsKes || matchedEmp.bpjsKes,
          name: fileData.name || matchedEmp.name,
          nik: fileData.nik || matchedEmp.nik
        };
      } else if (mode === 'db') {
        mergedData = { ...fileData, ...matchedEmp, id: matchedEmp.id };
      } else {
        mergedData = {
          ...matchedEmp,
          ...fileData,
          id: matchedEmp.id,
          name: matchedEmp.name || fileData.name,
          nik: matchedEmp.nik || fileData.nik,
          birthDate: matchedEmp.birthDate || fileData.birthDate,
          gender: matchedEmp.gender || fileData.gender,
          startDate: fileData.startDate || matchedEmp.startDate,
          contractEndDate: fileData.contractEndDate !== undefined ? fileData.contractEndDate : matchedEmp.contractEndDate,
          status: fileData.status || matchedEmp.status,
          bpjsTk: fileData.bpjsTk || matchedEmp.bpjsTk,
          bpjsKes: fileData.bpjsKes || matchedEmp.bpjsKes,
          wage: fileData.wage || matchedEmp.wage
        };
      }

      return {
        ...row,
        data: mergedData,
        statusType: 'update' as const,
        conflictReason: undefined,
        fieldDiffs: undefined
      };
    });

    updateImportPreviewState(updatedValidRows);
  };

  // State variables for Solution .dat attendance parsing preview
  const [parsedSummary, setParsedSummary] = useState<any[] | null>(null);
  const [fileMeta, setFileMeta] = useState<{
    fileName: string;
    totalLogs: number;
    employeeCount: number;
    startDate: string;
    endDate: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- GOOGLE DRIVE INTEGRATION STATES & HANDLERS ---
  const [driveUser, setDriveUser] = useState<User | null>(null);

  // Synchronize Google Drive active authentication sessions using Firebase Auth
  useEffect(() => {
    const unsubscribe = initAuth(
      (user) => {
        setDriveUser(user);
      },
      () => {
        setDriveUser(null);
      }
    );
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const [activeTab, setActiveTab] = useState<'local' | 'drive'>('local');
  const [driveFiles, setDriveFiles] = useState<any[]>([]);
  const [isDriveLoading, setIsDriveLoading] = useState(false);
  const [driveSearch, setDriveSearch] = useState('');
  const [directUrlInput, setDirectUrlInput] = useState('');
  const [driveExportName, setDriveExportName] = useState(fileName);
  const [driveExporting, setDriveExporting] = useState(false);
  const [driveError, setDriveError] = useState<string | null>(null);

  // Sync export name when fileName changes
  useEffect(() => {
    setDriveExportName(fileName);
  }, [fileName]);

  // Load files from Google Drive
  const loadDriveFiles = async () => {
    if (!driveUser) return;
    setIsDriveLoading(true);
    setDriveError(null);
    try {
      const files = await listFiles(driveSearch);
      setDriveFiles(files);
    } catch (err: any) {
      console.error(err);
      setDriveError(err.message || "Gagal memuat berkas dari Google Drive. Pastikan koneksi internet stabil.");
    } finally {
      setIsDriveLoading(false);
    }
  };

  // Trigger loading when tab changes or user signs in
  useEffect(() => {
    if (driveUser && activeTab === 'drive') {
      loadDriveFiles();
    }
  }, [driveUser, activeTab]);

  const handleDriveSignIn = async () => {
    setDriveError(null);
    try {
      const result = await signIn();
      if (result) {
        setDriveUser(result.user);
      }
    } catch (err: any) {
      console.error(err);
      setDriveError(err.message || "Gagal menghubungkan ke Google Drive.");
    }
  };

  const handleDriveSignOut = async () => {
    try {
      await signOut();
      setDriveUser(null);
      setDriveFiles([]);
    } catch (err) {
      console.error(err);
    }
  };

  const handleImportDriveFile = async (driveFile: any) => {
    if (!driveFile.id || !driveFile.name) return;
    
    const confirmImport = window.confirm(`Apakah Anda yakin ingin mengimpor data dari berkas "${driveFile.name}" di Google Drive?`);
    if (!confirmImport) return;

    setIsUploading(true);
    setUploadStatus({ type: null, message: `Mengunduh berkas "${driveFile.name}" dari Google Drive...` });
    try {
      const arrayBuffer = await downloadFile(driveFile.id, driveFile.mimeType);
      setUploadStatus({ type: null, message: `Memproses dan mengimpor berkas...` });
      
      let fileName = driveFile.name;
      const lowerName = fileName.toLowerCase();
      const hasExt = lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls') || lowerName.endsWith('.csv') || lowerName.endsWith('.json') || lowerName.endsWith('.dat');
      if (!hasExt && (driveFile.mimeType === 'application/vnd.google-apps.spreadsheet' || driveFile.mimeType?.includes('sheet') || driveFile.mimeType?.includes('excel'))) {
        fileName = `${fileName}.xlsx`;
      }

      await processBuffer(arrayBuffer, fileName);
    } catch (err: any) {
      setUploadStatus({
        type: 'error',
        message: `Gagal mengimpor dari Drive: ${err.message}`
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Extract file ID from Google Drive / Sheets URL
  const extractGoogleFileId = (url: string): string | null => {
    if (!url) return null;
    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      return match[1];
    }
    const matchIdParam = url.match(/[?&]id=([a-zA-Z0-9-_]+)/);
    if (matchIdParam && matchIdParam[1]) {
      return matchIdParam[1];
    }
    if (/^[a-zA-Z0-9-_]{25,}$/.test(url.trim())) {
      return url.trim();
    }
    return null;
  };

  const handleImportDirectUrl = async () => {
    const trimmedUrl = directUrlInput.trim();
    if (!trimmedUrl) {
      alert("Silakan masukkan tautan Google Sheets terlebih dahulu.");
      return;
    }

    const fileId = extractGoogleFileId(trimmedUrl);
    if (!fileId) {
      alert("Format tautan tidak valid. Pastikan Anda memasukkan tautan Google Sheets yang benar.");
      return;
    }

    setIsUploading(true);
    setUploadStatus({ type: null, message: `Mengambil informasi berkas dari Google Drive...` });
    setDriveError(null);
    try {
      const meta = await getFileMetadata(fileId);
      const confirmImport = window.confirm(`Apakah Anda yakin ingin mengimpor data dari berkas "${meta.name || 'Google Sheet'}"?`);
      if (!confirmImport) {
        setIsUploading(false);
        setUploadStatus({ type: null, message: '' });
        return;
      }

      setUploadStatus({ type: null, message: `Mengunduh berkas "${meta.name || 'Google Sheet'}"...` });
      // google sheets mimeType is typically 'application/vnd.google-apps.spreadsheet'
      const arrayBuffer = await downloadFile(fileId, meta.mimeType);
      
      setUploadStatus({ type: null, message: `Memproses dan mengimpor data...` });
      let fileName = meta.name || 'google_sheets.xlsx';
      const lowerName = fileName.toLowerCase();
      const hasExt = lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls') || lowerName.endsWith('.csv') || lowerName.endsWith('.json') || lowerName.endsWith('.dat');
      if (!hasExt && (meta.mimeType === 'application/vnd.google-apps.spreadsheet' || meta.mimeType?.includes('sheet') || meta.mimeType?.includes('excel'))) {
        fileName = `${fileName}.xlsx`;
      }
      await processBuffer(arrayBuffer, fileName);
      setDirectUrlInput('');
    } catch (err: any) {
      console.error(err);
      setUploadStatus({
        type: 'error',
        message: `Gagal mengimpor dari tautan Drive: ${err.message || 'Error tidak diketahui'}`
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleExportToDrive = async () => {
    if (!driveExportName.trim()) {
      alert("Nama berkas tidak boleh kosong.");
      return;
    }
    const workbook = generateExcelWorkbook();
    if (!workbook) {
      alert("Tidak ada data untuk diekspor.");
      return;
    }

    setDriveExporting(true);
    setDriveError(null);
    try {
      const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      const uploadName = driveExportName.endsWith('.xlsx') ? driveExportName : `${driveExportName}.xlsx`;
      
      setUploadStatus({ type: null, message: `Mengunggah "${uploadName}" ke Google Drive...` });
      await uploadFile(blob, uploadName, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      
      setUploadStatus({
        type: 'success',
        message: `Berhasil mengekspor "${uploadName}" ke Google Drive Anda!`,
        added: 0,
        updated: 0
      });
      
      // Refresh files list
      loadDriveFiles();
    } catch (err: any) {
      console.error(err);
      setDriveError(`Gagal mengekspor berkas: ${err.message}`);
    } finally {
      setDriveExporting(false);
    }
  };
  // --------------------------------------------------

  // Handler to sync parsed .dat attendance records with the server database
  const handleSaveParsedSummary = async () => {
    if (!parsedSummary || parsedSummary.length === 0) return;
    setIsUploading(true);
    setUploadStatus({ type: null, message: 'Menyimpan rekapitulasi absensi...' });

    try {
      // Map rows with valid matching NIK to the bulk update structure
      const updatePayload = parsedSummary
        .filter(row => row.nik)
        .map(row => ({
          name: row.name,
          nik: row.nik,
          daysPresent: row.daysPresent,
          daysLate: row.daysLate,
          daysAbsent: row.daysAbsent,
          daysPermit: row.daysPermit,
          attendanceRate: row.attendanceRate,
          workShift: row.workShift
        }));

      if (updatePayload.length === 0) {
        throw new Error("Tidak ada data karyawan terdaftar yang cocok untuk disinkronkan.");
      }

      const response = await fetch('/api/employees/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload)
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.error || "Gagal menyimpan data absensi ke server.");
      }

      setUploadStatus({
        type: 'success',
        message: `Sinkronisasi Absensi Berhasil! Berhasil memperbarui data kehadiran ${resData.updatedCount} karyawan dari berkas ${fileMeta?.fileName || 'Solution DAT'}.`,
        added: 0,
        updated: resData.updatedCount
      });

      setParsedSummary(null);
      setFileMeta(null);

      if (onUploadSuccess) {
        onUploadSuccess();
      }
    } catch (err: any) {
      setUploadStatus({
        type: 'error',
        message: err.message || "Gagal mengimpor data absensi."
      });
    } finally {
      setIsUploading(false);
    }
  };

  // --- 1. DOWNLOAD (UNDUH) HELPERS ---

  // Helper function to resolve exact keys to export based on target filename context
  const getKeysToExport = (targetFileName: string, allKeys: string[]): string[] => {
    const fileClean = targetFileName.toLowerCase();
    
    if (fileClean.includes('gaji') || fileClean.includes('payroll')) {
      return [
        'name', 'nik', 'position', 'department', 'basicWage', 'fixedAllowance', 
        'variableAllowance', 'mealAllowance', 'overtimePay', 'incentive', 
        'contractCompensation', 'bpjsDeduction', 'pphTax', 'grossSalary', 'netSalary', 
        'taxMethod', 'taxRate'
      ];
    }
    
    if (fileClean.includes('absensi') || fileClean.includes('attendance')) {
      return [
        'name', 'nik', 'position', 'department', 'attendanceRate', 
        'daysPresent', 'daysLate', 'daysAbsent', 'daysPermit'
      ];
    }
    
    if (fileClean.includes('bpjs')) {
      return [
        'name', 'nik', 'position', 'department', 'bpjsTk', 'bpjsKes'
      ];
    }
    
    if (fileClean.includes('kontrak') || fileClean.includes('pkwt')) {
      return [
        'name', 'nik', 'position', 'department', 'status', 'startDate', 'contractEndDate'
      ];
    }
    
    if (fileClean.includes('cuti_tahunan')) {
      return [
        'name', 'nik', 'position', 'department', 'leaveRemaining', 'leaveUsed', 
        'leaveExpiryDate', 'annualLeaveDuration', 'specialLeaveDuration', 'specialLeaveReason'
      ];
    }
    
    if (fileClean.includes('roster')) {
      return [
        'name', 'nik', 'position', 'department', 'rosterDecision', 'postponedWeeks', 'postponedNotes'
      ];
    }
    
    if (fileClean.includes('kpi') || fileClean.includes('kinerja')) {
      return [
        'name', 'nik', 'position', 'department', 'kpiScore', 'kpiRating', 'kpiPeriod'
      ];
    }
    
    if (fileClean.includes('rekrutmen') || fileClean.includes('recruitment')) {
      return [
        'name', 'nik', 'position', 'department', 'recruitmentSource', 'recruitmentStage', 'startDate'
      ];
    }
    
    if (fileClean.includes('perjalanan_dinas') || fileClean.includes('sppd')) {
      return [
        'name', 'nik', 'position', 'department', 'businessTripStatus', 'businessTripDestination', 
        'businessTripStartDate', 'businessTripEndDate', 'businessTripPurpose', 
        'businessTripAllowance', 'businessTripTransport', 'businessTripNotes'
      ];
    }
    
    if (fileClean.includes('pribadi')) {
      return [
        'name', 'nik', 'position', 'department', 'birthDate', 'gender', 
        'address', 'phone', 'education', 'certification', 'isLocal', 'isNonLocal'
      ];
    }

    if (fileClean.includes('direktori') || fileClean.includes('karyawan')) {
      return [
        'name', 'nik', 'position', 'department', 'birthDate', 'age', 'gender', 
        'startDate', 'education', 'certification', 'salaryGrade', 'wage', 
        'bpjsTk', 'bpjsKes', 'status', 'address', 'phone', 'isLocal', 'isNonLocal'
      ];
    }
    
    // Default directories / analytics fallback
    const basicKeys = ['name', 'nik', 'position', 'department', 'status', 'startDate', 'phone', 'gender'];
    return basicKeys.filter(k => allKeys.includes(k));
  };

  // EXPORT CSV
  const handleExportCSV = () => {
    if (!data || data.length === 0) {
      alert("Tidak ada data untuk diunduh.");
      return;
    }

    const allKeys = Array.from(new Set(data.flatMap(item => {
      let obj = item;
      if (item.employee) {
        obj = { ...item.employee, ...item };
      }
      return Object.keys(obj);
    })));

    const keysToExport = getKeysToExport(fileName, allKeys);
    const headers = keysToExport.map(key => FIELD_LABELS[key] || key);

    const csvRows = [];
    csvRows.push(headers.join(','));

    for (const row of data) {
      let emp: any = row;
      if (row.employee) {
        emp = { ...row.employee, ...row };
      }

      const values = keysToExport.map(key => {
        let val = emp[key];
        if (key === 'isLocal') val = emp.isLocal ? '1' : '';
        else if (key === 'isNonLocal') val = !emp.isLocal ? '2' : '';
        else if (val === true) val = 'Ya';
        else if (val === false) val = 'Tidak';
        else if (val === undefined || val === null) val = '';

        const stringVal = String(val).replace(/"/g, '""');
        if (stringVal.includes(',') || stringVal.includes('"') || stringVal.includes('\n')) {
          return `"${stringVal}"`;
        }
        return stringVal;
      });
      csvRows.push(values.join(','));
    }

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + csvRows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute("download", `${fileName}_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // HELPER: Generate XLSX Workbook
  const generateExcelWorkbook = () => {
    if (!data || data.length === 0) {
      return null;
    }

    // Determine keys to export dynamically based on actual keys in dataset
    const allKeys = Array.from(new Set(data.flatMap(item => {
      let obj = item;
      if (item.employee) {
        obj = { ...item.employee, ...item };
      }
      return Object.keys(obj);
    })));

    const keysToExport = getKeysToExport(fileName, allKeys);

    // Map rows to friendly Indonesian column labels
    const excelRows = data.map((item) => {
      let emp = item;
      if (item.employee) {
        emp = { ...item.employee, ...item };
      }

      const rowObj: Record<string, any> = {};
      keysToExport.forEach(key => {
        const label = FIELD_LABELS[key] || key;
        let val = emp[key];
        
        if (key === 'isLocal') val = emp.isLocal ? '1' : '';
        else if (key === 'isNonLocal') val = !emp.isLocal ? '2' : '';
        else if (val === true) val = 'Ya';
        else if (val === false) val = 'Tidak';
        else if (val === null || val === undefined) val = '';

        rowObj[label] = val;
      });
      return rowObj;
    });

    const worksheet = XLSX.utils.json_to_sheet(excelRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan HRD");

    // Automatically calculate column widths
    const maxLens = keysToExport.map(key => (FIELD_LABELS[key] || key).length);
    excelRows.forEach(row => {
      keysToExport.forEach((key, colIdx) => {
        const label = FIELD_LABELS[key] || key;
        const valStr = String(row[label] || '');
        if (valStr.length > maxLens[colIdx]) {
          maxLens[colIdx] = valStr.length;
        }
      });
    });
    worksheet['!cols'] = maxLens.map(len => ({ wch: Math.min(Math.max(len + 3, 10), 50) }));

    return workbook;
  };

  // EXPORT EXCEL (.XLSX)
  const handleExportExcel = () => {
    const workbook = generateExcelWorkbook();
    if (!workbook) {
      alert("Tidak ada data untuk diunduh.");
      return;
    }
    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `${fileName}_${dateStr}.xlsx`);
  };

  // EXPORT PDF (Landscape, highly polished table report)
  const handleExportPDF = () => {
    if (!data || data.length === 0) {
      alert("Tidak ada data untuk diunduh.");
      return;
    }

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    // Draw professional slate-900 background header band
    doc.setFillColor(15, 23, 42); 
    doc.rect(0, 0, 297, 24, 'F');

    // Header Texts
    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('ONE FOR ALL', 14, 10);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(203, 213, 225); 
    doc.text('Site Project Sultra - Nickel Mining & Operations', 14, 15);
    doc.text('Sistem Informasi Administrasi & HRD Terintegrasi', 14, 19);

    // Right-aligned generation date in header
    const dateStr = new Date().toLocaleDateString('id-ID', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); 
    doc.text(`Tanggal Cetak: ${dateStr}`, 235, 15);

    // Document Title
    doc.setTextColor(15, 23, 42); 
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12);
    const formattedTitle = title.toUpperCase();
    doc.text(formattedTitle, 14, 34);

    // Metadata subtitle
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139); 
    doc.text(`Jumlah Baris Data: ${data.length} Record Terfilter`, 14, 39);

    // Extract columns
    const allKeys = Array.from(new Set(data.flatMap(item => {
      let obj = item;
      if (item.employee) {
        obj = { ...item.employee, ...item };
      }
      return Object.keys(obj);
    })));

    const keysToExport = getKeysToExport(fileName, allKeys);
    const tableHeaders = keysToExport.map(key => FIELD_LABELS[key] || key);
    
    const tableRows = data.map((item) => {
      let emp = item;
      if (item.employee) {
        emp = { ...item.employee, ...item };
      }

      return keysToExport.map(key => {
        let val = emp[key];
        if (key === 'isLocal') return emp.isLocal ? '1' : '';
        if (key === 'isNonLocal') return !emp.isLocal ? '2' : '';
        if (val === true) return 'Ya';
        if (val === false) return 'Tidak';
        if (val === null || val === undefined) return '-';
        
        const currencyFields = [
          'wage', 'basicWage', 'fixedAllowance', 'variableAllowance', 
          'mealAllowance', 'overtimePay', 'incentive', 'contractCompensation', 
          'bpjsDeduction', 'pphTax', 'grossSalary', 'netSalary', 'businessTripAllowance'
        ];
        if (currencyFields.includes(key) && typeof val === 'number') {
          return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
        }
        return String(val);
      });
    });

    autoTable(doc, {
      startY: 44,
      head: [tableHeaders],
      body: tableRows,
      theme: 'grid',
      styles: {
        fontSize: 7.5,
        cellPadding: 2,
        font: 'Helvetica',
        overflow: 'linebreak'
      },
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'left'
      },
      didDrawPage: () => {
        // Page footer
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        const str = `Halaman ${doc.getNumberOfPages()}`;
        doc.text(str, 265, 200);
        doc.text('One For All - Laporan Sistem Manajemen HRD Nickel Site Sultra', 14, 200);
      }
    });

    const downloadDate = new Date().toISOString().split('T')[0];
    doc.save(`${fileName}_${downloadDate}.pdf`);
  };

  // DOWNLOAD TEMPLATE CSV
  const handleDownloadTemplate = () => {
    const isPkwt = fileName.toLowerCase().includes('pkwt') || fileName.toLowerCase().includes('kontrak');
    const isBpjs = fileName.toLowerCase().includes('bpjs');

    if (isBpjs) {
      const headers = ['NO', 'NOMOR_IDENTITAS', 'KPJ', 'NO_BPJS_KESEHATAN', 'NAMA_TENAGA_KERJA', 'TGL_LAHIR', 'JENIS_KELAMIN', 'STATUS_KERJA', 'DEPARTEMEN'];
      const sampleRows = [
        ['1', '\'7401021508930002', '19012345678', '0009876543210', 'Budi Santoso', '1993-08-15', 'Laki-laki', 'PKWT', 'MINING OPERATIONS'],
        ['2', '\'32710102030001', '20012345679', '0009876543211', 'M. Ayi Djumarna, ST', '1985-04-12', 'Laki-laki', 'PKWTT', 'TEKNIK']
      ];

      const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(','), ...sampleRows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "template_rekonsiliasi_bpjs.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    if (isPkwt) {
      const headers = ['No.', 'NIK', 'Nama Tenaga Kerja', 'Periode Kontrak - Awal', 'Periode Kontrak - Akhir', 'Jabatan', 'Departemen'];
      const sampleRows = [
        ['1', '\'32710102030001', 'M. Ayi Djumarna, ST', '1-Apr-20', '30-Sep-27', 'Staff Teknik', 'Teknik'],
        ['2', '\'32710102030002', 'Sunaryo', '12-May-25', '31-Aug-26', 'Operator Excavator', 'Mining Operations'],
        ['3', '\'32710102030003', 'DEDE NURDIANSYAH', '7-Jun-26', '7-Dec-26', 'HR Officer', 'HRD'],
        ['4', '\'32710102030004', 'Wili Yulistiawan', 'karyawan tetap', 'karyawan tetap', 'Supervisor HR', 'HRD'],
        ['5', '\'32710102030005', 'Fachri Amrillah', '1-Jan-26', '31-Dec-26', 'Logistics Officer', 'Logistik']
      ];

      const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(','), ...sampleRows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "template_unggah_data_pkwt.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    const headers = [
      'No.',
      'NIK',
      'Nama Tenaga Kerja',
      'Jabatan',
      'Tanggal Lahir',
      'USIA',
      'Jenis Kelamin',
      'Mulai Kerja',
      'Pendidikan',
      'Sertfikasi',
      'Ruang Gaji',
      'Upah*',
      'No BPJS TK',
      'No BPJS KESEHATAN',
      'STATUS',
      'ALAMAT',
      'Nomor HP',
      'Lokal',
      'Non Lokal'
    ];
    
    const sampleRow = [
      '1',
      '\'7401021508930002',
      'Budi Santoso',
      'Operator Excavator',
      '1993-08-15',
      '33',
      'Laki-laki',
      '2023-01-10',
      'SMA',
      'Sertifikat SIO',
      'Grade 3',
      '5500000',
      '00012345678',
      '00098765432',
      'PKWT',
      'Kendari, Sultra',
      '081234567890',
      'Ya',
      'Tidak'
    ];

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(','), sampleRow.join(',')].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "template_import_karyawan.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // DOWNLOAD TEMPLATE EXCEL (.XLSX)
  const handleDownloadTemplateExcel = () => {
    const isPkwt = fileName.toLowerCase().includes('pkwt') || fileName.toLowerCase().includes('kontrak');
    const isBpjs = fileName.toLowerCase().includes('bpjs');

    if (isBpjs) {
      const headers = ['NO', 'NOMOR_IDENTITAS', 'KPJ', 'NO_BPJS_KESEHATAN', 'NAMA_TENAGA_KERJA', 'TGL_LAHIR', 'JENIS_KELAMIN', 'STATUS_KERJA', 'DEPARTEMEN'];
      const sampleRows = [
        [1, '7401021508930002', '19012345678', '0009876543210', 'Budi Santoso', '1993-08-15', 'Laki-laki', 'PKWT', 'MINING OPERATIONS'],
        [2, '32710102030001', '20012345679', '0009876543211', 'M. Ayi Djumarna, ST', '1985-04-12', 'Laki-laki', 'PKWTT', 'TEKNIK']
      ];

      const wsData = [headers, ...sampleRows];
      const worksheet = XLSX.utils.aoa_to_sheet(wsData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Data BPJS");

      worksheet['!cols'] = headers.map(h => ({ wch: Math.max(h.length + 4, 15) }));

      XLSX.writeFile(workbook, "template_rekonsiliasi_bpjs.xlsx");
      return;
    }

    if (isPkwt) {
      const wsData = [
        [],
        [],
        ['No.', 'NIK', 'Nama Tenaga Kerja', 'Periode kontrak', '', 'Jabatan', 'Departemen'],
        ['', '', '', 'Awal', 'Akhir', '', ''],
        [1, '32710102030001', 'M. Ayi Djumarna, ST', '1-Apr-20', '30-Sep-27', 'Staff Teknik', 'Teknik'],
        [2, '32710102030002', 'Sunaryo', '12-May-25', '31-Aug-26', 'Operator Excavator', 'Mining Operations'],
        ['', '', 'HRD', '', '', '', ''],
        [3, '32710102030003', 'DEDE NURDIANSYAH', '7-Jun-26', '7-Dec-26', 'HR Officer', 'HRD'],
        [4, '32710102030004', 'Wili Yulistiawan', 'karyawan tetap', 'karyawan tetap', 'Supervisor HR', 'HRD'],
        [5, '32710102030005', 'Fachri Amrillah', '1-Jan-26', '31-Dec-26', 'Logistics Officer', 'Logistik'],
        [6, '32710102030006', 'Kurnia Aji', '5-Jan-26', '31-Dec-26', 'Field Assistant', 'Site Operations']
      ];

      const worksheet = XLSX.utils.aoa_to_sheet(wsData);
      worksheet['!merges'] = [
        { s: { r: 2, c: 0 }, e: { r: 3, c: 0 } }, // No.
        { s: { r: 2, c: 1 }, e: { r: 3, c: 1 } }, // NIK
        { s: { r: 2, c: 2 }, e: { r: 3, c: 2 } }, // Nama Tenaga Kerja
        { s: { r: 2, c: 3 }, e: { r: 2, c: 4 } }, // Periode kontrak (Awal | Akhir)
        { s: { r: 2, c: 5 }, e: { r: 3, c: 5 } }, // Jabatan
        { s: { r: 2, c: 6 }, e: { r: 3, c: 6 } }, // Departemen
      ];
      worksheet['!cols'] = [
        { wch: 6 },
        { wch: 20 },
        { wch: 28 },
        { wch: 18 },
        { wch: 18 },
        { wch: 22 },
        { wch: 22 }
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Masa Kontrak");

      XLSX.writeFile(workbook, "template_unggah_data_pkwt.xlsx");
      return;
    }

    const headers = [
      'No.',
      'NIK',
      'Nama Tenaga Kerja',
      'Jabatan',
      'Tanggal Lahir',
      'USIA',
      'Jenis Kelamin',
      'Mulai Kerja',
      'Pendidikan',
      'Sertfikasi',
      'Ruang Gaji',
      'Upah*',
      'No BPJS TK',
      'No BPJS KESEHATAN',
      'STATUS',
      'ALAMAT',
      'Nomor HP',
      'Lokal',
      'Non Lokal'
    ];
    
    const sampleRow = [
      1,
      '7401021508930002',
      'Budi Santoso',
      'Operator Excavator',
      '1993-08-15',
      33,
      'Laki-laki',
      '2023-01-10',
      'SMA',
      'Sertifikat SIO',
      'Grade 3',
      5500000,
      '00012345678',
      '00098765432',
      'PKWT',
      'Kendari, Sultra',
      '081234567890',
      'Ya',
      'Tidak'
    ];

    const rowObj: Record<string, any> = {};
    headers.forEach((h, idx) => {
      rowObj[h] = sampleRow[idx];
    });

    const worksheet = XLSX.utils.json_to_sheet([rowObj]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template Impor");

    worksheet['!cols'] = headers.map(h => ({ wch: Math.max(h.length + 3, 12) }));

    XLSX.writeFile(workbook, "template_import_karyawan.xlsx");
  };


  // --- 2. UPLOAD (UNGGAH) HELPERS ---

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  // Process raw array buffer data (CSV, Excel, JSON or .dat)
  const processBuffer = async (dataBuffer: ArrayBuffer, name: string) => {
    let payload: any[] = [];
    const nameLower = name.toLowerCase();

    if (nameLower.endsWith('.json')) {
      const decoder = new TextDecoder('utf-8');
      const text = decoder.decode(new Uint8Array(dataBuffer));
      payload = JSON.parse(text);
      if (!Array.isArray(payload)) {
        throw new Error("File JSON harus berisi array objek karyawan.");
      }
    } else if (nameLower.endsWith('.dat')) {
      const decoder = new TextDecoder('utf-8');
      const text = decoder.decode(new Uint8Array(dataBuffer));
      const lines = text.split(/\r?\n/);
      
      const parsedLogs: { pin: number; date: string; time: string }[] = [];
      
      lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) return;
        const parts = trimmed.split(/\s+/);
        if (parts.length >= 3) {
          const pin = parseInt(parts[0], 10);
          const date = parts[1];
          const time = parts[2];
          
          if (!isNaN(pin) && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
            parsedLogs.push({ pin, date, time });
          }
        }
      });

      if (parsedLogs.length === 0) {
        throw new Error("Format berkas .dat tidak sesuai. Pastikan file berisi baris log absensi resmi dari mesin Solution dengan pola: [NomorAbsen] [YYYY-MM-DD] [HH:MM:SS]");
      }

      const empResponse = await fetch(`/api/employees?t=${Date.now()}`);
      if (!empResponse.ok) {
        throw new Error("Gagal menghubungkan ke database untuk mencocokkan karyawan.");
      }
      const empData = await empResponse.json();
      const allEmployees: Employee[] = empData.employees || [];

      const logsByPin: Record<number, Record<string, string[]>> = {};
      let minDate = parsedLogs[0].date;
      let maxDate = parsedLogs[0].date;

      parsedLogs.forEach(log => {
        if (log.date < minDate) minDate = log.date;
        if (log.date > maxDate) maxDate = log.date;

        if (!logsByPin[log.pin]) {
          logsByPin[log.pin] = {};
        }
        if (!logsByPin[log.pin][log.date]) {
          logsByPin[log.pin][log.date] = [];
        }
        logsByPin[log.pin][log.date].push(log.time);
      });

      const computedSummaries: any[] = [];
      
      Object.entries(logsByPin).forEach(([pinStr, dateMap]) => {
        const pin = parseInt(pinStr, 10);
        const employee = allEmployees.find(e => e.globalNo === pin);
        
        let presentDays = 0;
        let lateDays = 0;
        const workShift = employee?.workShift || 'Regular';
        const daysPermit = employee?.daysPermit !== undefined ? employee.daysPermit : 2;

        Object.entries(dateMap).forEach(([dateStr, times]) => {
          times.sort();
          const firstTap = times[0];

          let isLate = false;
          if (workShift === 'Shift 1') {
            isLate = firstTap > '07:15:00';
          } else if (workShift === 'Shift 2') {
            if (firstTap > '18:00:00') {
              isLate = firstTap > '19:15:00';
            } else {
              isLate = firstTap > '15:15:00';
            }
          } else {
            isLate = firstTap > '08:15:00';
          }

          if (isLate) {
            lateDays++;
          } else {
            presentDays++;
          }
        });

        const totalTaps = Object.values(dateMap).reduce((sum, t) => sum + t.length, 0);
        const totalTapped = presentDays + lateDays;
        
        const daysAbsent = Math.max(0, 24 - totalTapped - daysPermit);
        const totalCycle = presentDays + lateDays + daysAbsent + daysPermit;
        const attendanceRate = totalCycle > 0 
          ? Math.round(((presentDays + lateDays * 0.5) / totalCycle) * 100 * 10) / 10 
          : 100;

        computedSummaries.push({
          id: employee?.id || '',
          nik: employee?.nik || '',
          globalNo: pin,
          name: employee?.name || `Karyawan PIN #${pin}`,
          department: employee?.department || 'UNKNOWN',
          workShift,
          daysPresent: presentDays,
          daysLate: lateDays,
          daysAbsent,
          daysPermit,
          attendanceRate,
          rawLogCount: totalTaps
        });
      });

      computedSummaries.sort((a, b) => a.globalNo - b.globalNo);

      setFileMeta({
        fileName: name,
        totalLogs: parsedLogs.length,
        employeeCount: computedSummaries.length,
        startDate: minDate,
        endDate: maxDate
      });

      setParsedSummary(computedSummaries);
      setIsUploading(false);
      setUploadStatus({ type: null, message: '' });
      return;
    } else if (nameLower.endsWith('.xlsx') || nameLower.endsWith('.xls') || nameLower.endsWith('.csv') || nameLower.endsWith('.json')) {
      let rawItems: { data: any; rowNum: number | string }[] = [];
      let skippedLogs: { rowNum: number | string; reason: string }[] = [];
      let totalOriginalRows = 0;

      if (nameLower.endsWith('.json')) {
        const decoder = new TextDecoder('utf-8');
        const text = decoder.decode(new Uint8Array(dataBuffer));
        const parsedJson = JSON.parse(text);
        if (!Array.isArray(parsedJson)) {
          throw new Error("File JSON harus berisi array objek karyawan.");
        }
        totalOriginalRows = parsedJson.length;
        parsedJson.forEach((item: any, index: number) => {
          rawItems.push({ data: item, rowNum: index + 1 });
        });
      } else {
        const workbook = XLSX.read(new Uint8Array(dataBuffer), { type: 'array', cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rangeRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
        
        let headerRowIndex = -1;
        let isTwoRowHeader = false;

        for (let r = 0; r < Math.min(rangeRows.length, 25); r++) {
          const row = rangeRows[r];
          if (!row || row.length === 0) continue;
          
          const rowStr = row.map(cell => String(cell).toLowerCase().trim().replace(/_/g, ' '));
          const hasName = rowStr.some(c => c.includes('nama') || c.includes('tenaga kerja') || c.includes('karyawan') || c.includes('peserta'));
          const hasNik = rowStr.some(c => c.includes('nik') || c.includes('n i k') || c.includes('identitas') || c.includes('ktp') || c.includes('id'));
          const hasJabatan = rowStr.some(c => c.includes('jabatan') || c.includes('posisi'));
          const hasKontrak = rowStr.some(c => c.includes('kontrak') || c.includes('periode'));
          const hasBpjs = rowStr.some(c => c.includes('kpj') || c.includes('bpjs') || c.includes('peserta') || c.includes('jaminan') || c.includes('kesehatan') || c.includes('ketenagakerjaan'));

          if (hasName || hasNik || hasBpjs || (hasJabatan && hasKontrak)) {
            headerRowIndex = r;
            if (r + 1 < rangeRows.length && rangeRows[r + 1]) {
              const nextRowStr = rangeRows[r + 1].map(cell => String(cell).toLowerCase().trim());
              if (nextRowStr.some(c => c === 'awal' || c === 'akhir' || c.includes('mulai') || c.includes('selesai'))) {
                isTwoRowHeader = true;
              }
            }
            break;
          }
        }
        
        let isNestedTemplate = false;
        if (headerRowIndex !== -1 && !nameLower.endsWith('.csv')) {
          // Detect complex nested department layout (subheaders with merged/empty cell0/cell1 and single value in cell2)
          for (let r = headerRowIndex + 1; r < Math.min(rangeRows.length, headerRowIndex + 25); r++) {
            const row = rangeRows[r];
            if (!row) continue;
            const nonEmpty = row.filter(c => c !== null && c !== undefined && String(c).trim() !== "");
            const cell0 = row[0] !== undefined ? String(row[0]).trim() : "";
            const cell1 = row[1] !== undefined ? String(row[1]).trim() : "";
            const cell2 = row[2] !== undefined ? String(row[2]).trim() : "";
            if (cell0 === "" && cell1 === "" && cell2 !== "" && nonEmpty.length === 1) {
              if (cell2 !== "Nama Tenaga Kerja" && !cell2.startsWith("*")) {
                isNestedTemplate = true;
                break;
              }
            }
          }
        }
        
        if (headerRowIndex !== -1) {
          let headers: string[] = [];
          if (isTwoRowHeader) {
            const row1 = rangeRows[headerRowIndex] || [];
            const row2 = rangeRows[headerRowIndex + 1] || [];
            const maxCols = Math.max(row1.length, row2.length);
            let currentGroup = '';

            for (let col = 0; col < maxCols; col++) {
              const topCell = row1[col] !== undefined && row1[col] !== null ? String(row1[col]).trim() : '';
              const subCell = row2[col] !== undefined && row2[col] !== null ? String(row2[col]).trim() : '';

              if (topCell && topCell !== 'No.') {
                currentGroup = topCell;
              }

              if (topCell && subCell && topCell !== subCell) {
                headers.push(`${topCell} ${subCell}`);
              } else if (subCell) {
                if (currentGroup && (subCell.toLowerCase() === 'awal' || subCell.toLowerCase() === 'akhir')) {
                  headers.push(`${currentGroup} ${subCell}`);
                } else {
                  headers.push(subCell);
                }
              } else {
                headers.push(topCell);
              }
            }
          } else {
            headers = rangeRows[headerRowIndex].map(h => String(h).trim());
          }

          const dataStartIdx = headerRowIndex + (isTwoRowHeader ? 2 : 1);
          const rawDataRows = rangeRows.slice(dataStartIdx);
          totalOriginalRows = rawDataRows.length;
          
          if (isNestedTemplate) {
            // Complex department-grouped template layout
            let currentDept = "MANAGEMENT";
            rawDataRows.forEach((row, rowIndex) => {
              const rowNum = dataStartIdx + 1 + rowIndex;
              if (!row || row.length === 0) {
                skippedLogs.push({ rowNum, reason: "Baris kosong / tidak ada data" });
                return;
              }
              
              const nonEmpty = row.filter(c => c !== null && c !== undefined && String(c).trim() !== "");
              const rowJoined = row.map(c => String(c).trim()).join('');
              if (!rowJoined) {
                skippedLogs.push({ rowNum, reason: "Baris kosong / spacer" });
                return;
              }
              
              const cell0 = row[0] !== undefined ? String(row[0]).trim() : "";
              const cell1 = row[1] !== undefined ? String(row[1]).trim() : "";
              const cell2 = row[2] !== undefined ? String(row[2]).trim() : "";
              
              if (cell0 === "" && cell1 === "" && cell2 !== "" && nonEmpty.length === 1) {
                if (cell2 !== "Nama Tenaga Kerja" && !cell2.startsWith("*")) {
                  currentDept = cell2;
                  skippedLogs.push({ rowNum, reason: `Header Departemen: "${currentDept}"` });
                  return;
                }
              }
              
              if (cell0 === "" && cell1 === "" && rowJoined.includes("PKWT") && rowJoined.includes("PKWTT")) {
                skippedLogs.push({ rowNum, reason: "Baris legenda status (PKWT/PKWTT)" });
                return;
              }
              
              const globalNo = parseInt(String(row[0]), 10);
              const hasGlobalNo = !isNaN(globalNo);
              const hasName = cell2 !== "";
              
              if (hasGlobalNo || hasName) {
                const obj: Record<string, any> = {};
                obj['department'] = currentDept;
                
                headers.forEach((header, colIdx) => {
                  if (header) {
                    obj[header] = row[colIdx] !== undefined ? row[colIdx] : "";
                  }
                });
                
                let status = "PKWT";
                if (row[16] !== undefined && row[16] !== null && String(row[16]).trim() !== "") {
                  status = "PKWTT";
                }
                obj['status'] = status;
                
                rawItems.push({ data: obj, rowNum });
              } else {
                skippedLogs.push({ rowNum, reason: "Baris data tidak lengkap, tidak ada Nama atau ID" });
              }
            });
          } else {
            // Standard flat layout (regular Excel or CSV file)
            rawDataRows.forEach((row, rowIndex) => {
              const rowNum = dataStartIdx + 1 + rowIndex;
              if (!row || row.length === 0) {
                skippedLogs.push({ rowNum, reason: "Baris kosong / tidak ada data" });
                return;
              }
              
              const nonEmpty = row.filter(c => c !== null && c !== undefined && String(c).trim() !== "");
              if (nonEmpty.length === 0) {
                skippedLogs.push({ rowNum, reason: "Baris kosong / spacer" });
                return;
              }
              
              const obj: Record<string, any> = {};
              headers.forEach((header, colIdx) => {
                if (header) {
                  obj[header] = row[colIdx] !== undefined ? row[colIdx] : "";
                }
              });
              
              rawItems.push({ data: obj, rowNum });
            });
          }
        } else {
          const sheetData: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
          totalOriginalRows = sheetData.length;
          sheetData.forEach((row, rowIndex) => {
            rawItems.push({ data: row, rowNum: rowIndex + 2 });
          });
        }
      }

      if (totalOriginalRows === 0) {
        throw new Error("Berkas kosong atau tidak berisi data yang dapat dibaca.");
      }

      const reverseLabels: Record<string, string> = {
        'no': 'ignored_no',
        'no.': 'ignored_no',
        'nama karyawan': 'name',
        'nama_karyawan': 'name',
        'nama tenaga kerja': 'name',
        'nama_tenaga_kerja': 'name',
        'nama peserta': 'name',
        'nama_peserta': 'name',
        'nama lengkap': 'name',
        'nama_lengkap': 'name',
        'nama tk': 'name',
        'nama_tk': 'name',
        'nama': 'name',
        'nik': 'nik',
        '(nik)': 'nik',
        '( n i k )': 'nik',
        'n i k': 'nik',
        'no. nik': 'nik',
        'no nik': 'nik',
        'no_nik': 'nik',
        'no. ktp': 'nik',
        'no ktp': 'nik',
        'no_ktp': 'nik',
        'noktp': 'nik',
        'nik / no. ktp': 'nik',
        'nik/ktp': 'nik',
        'nomor induk kependudukan': 'nik',
        'nomor identitas': 'nik',
        'nomor_identitas': 'nik',
        'no identitas': 'nik',
        'no_identitas': 'nik',
        'no. identitas': 'nik',
        'no.identitas': 'nik',
        'nomor identitas karyawan': 'nik',
        'nomor_identitas_karyawan': 'nik',
        'nomor nik': 'nik',
        'id karyawan': 'nik',
        'no id': 'nik',
        'no. id': 'nik',
        'nip': 'nik',
        'kpj': 'bpjsTk',
        'no kpj': 'bpjsTk',
        'no. kpj': 'bpjsTk',
        'no_kpj': 'bpjsTk',
        'nokpj': 'bpjsTk',
        'nomor kpj': 'bpjsTk',
        'nomor_kpj': 'bpjsTk',
        'nomor kpj / bpjs tk': 'bpjsTk',
        'nomor_kpj / bpjs_tk': 'bpjsTk',
        'kpj/bpjs tk': 'bpjsTk',
        'bpjs tk': 'bpjsTk',
        'bpjs_tk': 'bpjsTk',
        'bpjstk': 'bpjsTk',
        'no bpjs tk': 'bpjsTk',
        'no. bpjs tk': 'bpjsTk',
        'no_bpjs_tk': 'bpjsTk',
        'nomor bpjs tk': 'bpjsTk',
        'nomor_bpjs_tk': 'bpjsTk',
        'bpjs ketenagakerjaan': 'bpjsTk',
        'bpjs_ketenagakerjaan': 'bpjsTk',
        'no bpjs ketenagakerjaan': 'bpjsTk',
        'no. bpjs ketenagakerjaan': 'bpjsTk',
        'no_bpjs_ketenagakerjaan': 'bpjsTk',
        'nomor bpjs ketenagakerjaan': 'bpjsTk',
        'nomor_bpjs_ketenagakerjaan': 'bpjsTk',
        'kartu peserta jamsostek': 'bpjsTk',
        'bpjs kes': 'bpjsKes',
        'bpjs_kes': 'bpjsKes',
        'bpjskes': 'bpjsKes',
        'bpjs kesehatan': 'bpjsKes',
        'bpjs_kesehatan': 'bpjsKes',
        'no bpjs kes': 'bpjsKes',
        'no. bpjs kes': 'bpjsKes',
        'no_bpjs_kes': 'bpjsKes',
        'no bpjs kesehatan': 'bpjsKes',
        'no. bpjs kesehatan': 'bpjsKes',
        'no_bpjs_kesehatan': 'bpjsKes',
        'nomor bpjs kesehatan': 'bpjsKes',
        'nomor_bpjs_kesehatan': 'bpjsKes',
        'nomor peserta': 'bpjsKes',
        'nomor_peserta': 'bpjsKes',
        'no peserta': 'bpjsKes',
        'no. peserta': 'bpjsKes',
        'no_peserta': 'bpjsKes',
        'nopes': 'bpjsKes',
        'no. kartu': 'bpjsKes',
        'no kartu': 'bpjsKes',
        'no_kartu': 'bpjsKes',
        'nokartu': 'bpjsKes',
        'nomor kartu': 'bpjsKes',
        'nomor_kartu': 'bpjsKes',
        'no. bpjs': 'bpjsKes',
        'no bpjs': 'bpjsKes',
        'no_bpjs': 'bpjsKes',
        'jabatan': 'position',
        'posisi': 'position',
        'departemen': 'department',
        'bagian': 'department',
        'divisi': 'department',
        'unit': 'department',
        'tanggal lahir': 'birthDate',
        'tanggal_lahir': 'birthDate',
        'tgl lahir': 'birthDate',
        'tgl_lahir': 'birthDate',
        'tgllahir': 'birthDate',
        'tgl. lahir': 'birthDate',
        'usia': 'age',
        'jenis kelamin': 'gender',
        'jenis_kelamin': 'gender',
        'jk': 'gender',
        'sex': 'gender',
        'mulai kerja': 'startDate',
        'periode kontrak': 'startDate',
        'periode kontrak awal': 'startDate',
        'periode kontrak akhir': 'contractEndDate',
        'periode kontrak - awal': 'startDate',
        'periode kontrak - akhir': 'contractEndDate',
        'awal': 'startDate',
        'akhir': 'contractEndDate',
        'mulai kontrak': 'startDate',
        'akhir kontrak': 'contractEndDate',
        'pendidikan': 'education',
        'sertfikasi': 'certification',
        'sertifikasi': 'certification',
        'ruang gaji': 'salaryGrade',
        'upah*': 'wage',
        'upah': 'wage',
        'upah dilaporkan': 'wage',
        'upah_dilaporkan': 'wage',
        'gaji': 'wage',
        'gaji pokok': 'basicWage',
        'status kerja': 'status',
        'status': 'status',
        'status kepesertaan': 'status',
        'status_kepesertaan': 'status',
        'status peserta': 'status',
        'status_peserta': 'status',
        'alamat': 'address',
        'nomor hp': 'phone',
        'no hp': 'phone',
        'telepon': 'phone',
        'lokal': 'isLocal',
        'non lokal': 'isNonLocal',
        'sisa cuti': 'leaveRemaining',
        'cuti terpakai': 'leaveUsed',
        'skor kpi': 'kpiScore',
        'rating kpi': 'kpiRating',
        'periode kpi': 'kpiPeriod',
        'saluran rekrutmen': 'recruitmentSource',
        'tahapan rekrutmen': 'recruitmentStage',
        'status dinas': 'businessTripStatus',
        'tujuan sppd': 'businessTripDestination',
        'mulai dinas': 'businessTripStartDate',
        'selesai dinas': 'businessTripEndDate',
        'maksud perjalanan': 'businessTripPurpose',
        'uang saku': 'businessTripAllowance',
        'transportasi': 'businessTripTransport',
        'catatan dinas': 'businessTripNotes',
        'tunjangan tetap': 'fixedAllowance',
        'tunjangan tidak tetap': 'variableAllowance',
        'uang makan': 'mealAllowance',
        'kompensasi lembur': 'overtimePay',
        'insentif khusus': 'incentive',
        'kompensasi kontrak (pkwt)': 'contractCompensation',
        'potongan bpjs': 'bpjsDeduction',
        'potongan pajak pph': 'pphTax',
        'gaji kotor (bruto)': 'grossSalary',
        'gaji bersih (netto)': 'netSalary',
        'metode pajak': 'taxMethod',
        'tarif pajak (%)': 'taxRate',
        'tingkat kehadiran (%)': 'attendanceRate',
        'hari hadir': 'daysPresent',
        'hari terlambat': 'daysLate',
        'hari alpa/mangkir': 'daysAbsent',
        'hari izin/sakit': 'daysPermit',
        'masa berlaku cuti': 'leaveExpiryDate',
        'keputusan roster': 'rosterDecision',
        'minggu penundaan roster': 'postponedWeeks',
        'catatan penundaan roster': 'postponedNotes',
        'durasi cuti tahunan': 'annualLeaveDuration',
        'durasi cuti khusus': 'specialLeaveDuration',
        'alasan cuti khusus': 'specialLeaveReason'
      };
      Object.entries(FIELD_LABELS).forEach(([key, label]) => {
        reverseLabels[label.toLowerCase().trim()] = key;
      });

      const formatNikString = (val: any): string => {
        if (val === undefined || val === null) return "";
        if (typeof val === 'number') {
          if (Number.isFinite(val)) {
            return val.toLocaleString('fullwide', { useGrouping: false }).replace(/[^\d]/g, '');
          }
        }
        let str = String(val).trim();
        str = str.replace(/^'/, '');
        str = str.replace(/[\s.-]/g, '');
        if (str.toLowerCase() === 'null' || str.toLowerCase() === 'undefined' || str === '-') {
          return "";
        }
        return str;
      };

      const parseDateValue = (val: any): { dateStr: string | null; isPermanent: boolean } => {
        if (val === undefined || val === null) return { dateStr: null, isPermanent: false };
        const str = String(val).trim().toLowerCase();
        if (str === '' || str === '-') return { dateStr: null, isPermanent: false };

        if (str.includes('tetap') || str.includes('pkwtt') || str.includes('permanent')) {
          return { dateStr: null, isPermanent: true };
        }

        if (typeof val === 'number') {
          const jsDate = XLSX.SSF.parse_date_code(val);
          if (jsDate) {
            const y = jsDate.y;
            const m = String(jsDate.m).padStart(2, '0');
            const d = String(jsDate.d).padStart(2, '0');
            return { dateStr: `${y}-${m}-${d}`, isPermanent: false };
          }
        }

        const monthMap: Record<string, string> = {
          jan: '01', feb: '02', mar: '03', apr: '04', may: '05', mei: '05',
          jun: '06', jul: '07', aug: '08', agu: '08', ags: '08', sep: '09',
          oct: '10', okt: '10', nov: '11', dec: '12', des: '12'
        };

        const mmmMatch = str.match(/^(\d{1,2})[-\s/]([a-z]{3})[-\s/](\d{2,4})$/i);
        if (mmmMatch) {
          const day = String(parseInt(mmmMatch[1], 10)).padStart(2, '0');
          const monthKey = mmmMatch[2].toLowerCase();
          const month = monthMap[monthKey] || '01';
          let year = parseInt(mmmMatch[3], 10);
          if (year < 100) {
            year = year >= 50 ? 1900 + year : 2000 + year;
          }
          return { dateStr: `${year}-${month}-${day}`, isPermanent: false };
        }

        const isoMatch = str.match(/^(\d{4})[-\s/](\d{1,2})[-\s/](\d{1,2})$/);
        if (isoMatch) {
          const y = isoMatch[1];
          const m = String(parseInt(isoMatch[2], 10)).padStart(2, '0');
          const d = String(parseInt(isoMatch[3], 10)).padStart(2, '0');
          return { dateStr: `${y}-${m}-${d}`, isPermanent: false };
        }

        const dmyMatch = str.match(/^(\d{1,2})[-\s/](\d{1,2})[-\s/](\d{2,4})$/);
        if (dmyMatch) {
          const d = String(parseInt(dmyMatch[1], 10)).padStart(2, '0');
          const m = String(parseInt(dmyMatch[2], 10)).padStart(2, '0');
          let y = parseInt(dmyMatch[3], 10);
          if (y < 100) {
            y = y >= 50 ? 1900 + y : 2000 + y;
          }
          return { dateStr: `${y}-${m}-${d}`, isPermanent: false };
        }

        return { dateStr: String(val).trim(), isPermanent: false };
      };

      const cleanEmployeeRow = (row: any) => {
        const mappedRow: Record<string, any> = {};
        Object.entries(row).forEach(([colName, value]) => {
          const cleanColName = colName.toLowerCase().trim();
          const normalizedCol = cleanColName.replace(/_/g, ' ').replace(/\s+/g, ' ');
          const noDotCol = normalizedCol.replace(/\./g, '');
          const key = reverseLabels[cleanColName] || reverseLabels[normalizedCol] || reverseLabels[noDotCol] || colName;
          
          let mappedVal: any = value;
          if (typeof value === 'string') {
            const lowerVal = value.toLowerCase().trim();
            if (lowerVal === 'ya' || lowerVal === 'true' || lowerVal === '1') mappedVal = true;
            else if (lowerVal === 'tidak' || lowerVal === 'false' || lowerVal === '0') mappedVal = false;
            else if (value === '-' || value === '') mappedVal = null;
          }
          mappedRow[key] = mappedVal;
        });

        const cleanObj: Record<string, any> = { ...mappedRow };

        ['startDate', 'contractEndDate', 'birthDate'].forEach(dateField => {
          if (cleanObj[dateField] !== undefined && cleanObj[dateField] !== null && cleanObj[dateField] !== "") {
            const parsed = parseDateValue(cleanObj[dateField]);
            if (parsed.isPermanent) {
              if (dateField !== 'birthDate') {
                cleanObj['status'] = 'PKWTT';
                cleanObj[dateField] = null;
              }
            } else if (parsed.dateStr) {
              cleanObj[dateField] = parsed.dateStr;
              if (dateField !== 'birthDate' && cleanObj['status'] !== 'PKWTT') {
                cleanObj['status'] = 'PKWT';
              }
            }
          }
        });

        if (cleanObj['gender']) {
          const gStr = String(cleanObj['gender']).trim().toUpperCase();
          if (gStr === 'L' || gStr === 'LAKI-LAKI' || gStr === 'LAKI LAKI' || gStr === 'M' || gStr === 'MALE') {
            cleanObj['gender'] = 'Laki-laki';
          } else if (gStr === 'P' || gStr === 'PEREMPUAN' || gStr === 'F' || gStr === 'FEMALE') {
            cleanObj['gender'] = 'Perempuan';
          }
        }
        
        ['wage', 'leaveRemaining', 'leaveUsed', 'kpiScore', 'businessTripAllowance', 'basicWage', 'fixedAllowance', 'variableAllowance', 'mealAllowance', 'overtimePay', 'incentive', 'contractCompensation', 'bpjsDeduction', 'pphTax', 'grossSalary', 'netSalary', 'taxRate', 'attendanceRate', 'daysPresent', 'daysLate', 'daysAbsent', 'daysPermit', 'postponedWeeks', 'annualLeaveDuration', 'specialLeaveDuration'].forEach(numField => {
          if (cleanObj[numField] !== undefined && cleanObj[numField] !== null && cleanObj[numField] !== "") {
            if (typeof cleanObj[numField] === 'string') {
              const cleanedStr = cleanObj[numField].replace(/[^\d]/g, '');
              cleanObj[numField] = parseInt(cleanedStr, 10) || 0;
            }
          }
        });

        ['nik', 'bpjsTk', 'bpjsKes'].forEach(strField => {
          if (cleanObj[strField] !== undefined && cleanObj[strField] !== null) {
            if (strField === 'nik') {
              cleanObj['nik'] = formatNikString(cleanObj['nik']);
            } else {
              const valStr = String(cleanObj[strField]).trim();
              if (valStr.startsWith('210000') || valStr.startsWith('0000') || valStr.startsWith('12345')) {
                cleanObj[strField] = '';
              } else {
                cleanObj[strField] = valStr;
              }
            }
          }
        });

        const isLokalCol = cleanObj['isLocal'];
        const isNonLokalCol = cleanObj['isNonLocal'];

        if (isLokalCol !== undefined && isLokalCol !== null && isLokalCol !== "" && isLokalCol !== false && isLokalCol !== "Tidak" && isLokalCol !== "false" && isLokalCol !== 0) {
          cleanObj['isLocal'] = true;
          cleanObj['isNonLocal'] = false;
        } else if (isNonLokalCol !== undefined && isNonLokalCol !== null && isNonLokalCol !== "" && isNonLokalCol !== false && isNonLokalCol !== "Tidak" && isNonLokalCol !== "false" && isNonLokalCol !== 0) {
          cleanObj['isLocal'] = false;
          cleanObj['isNonLocal'] = true;
        } else {
          if (cleanObj['isLocal'] === undefined) {
            cleanObj['isLocal'] = true;
          }
          if (cleanObj['isNonLocal'] === undefined) {
            cleanObj['isNonLocal'] = false;
          }
        }
        
        return cleanObj;
      };

      // Fetch active employees to compare
      const empResponse = await fetch(`/api/employees?t=${Date.now()}`);
      if (!empResponse.ok) {
        throw new Error("Gagal mengambil data karyawan aktif untuk pencocokan.");
      }
      const empData = await empResponse.json();
      const allEmployees: Employee[] = empData.employees || [];

      const validRowsList: {
        data: any;
        statusType: 'add' | 'update' | 'conflict';
        conflictReason?: string;
        fieldDiffs?: { key: string; label: string; dbVal: any; fileVal: any }[];
        matchedEmp?: Employee;
        rowNum: number | string;
      }[] = [];

      const alreadyProcessed: any[] = [];

      rawItems.forEach(item => {
        const cleaned = cleanEmployeeRow(item.data);
        const cleanName = cleaned.name ? String(cleaned.name).trim() : "";
        const cleanNik = cleaned.nik ? String(cleaned.nik).trim() : "";
        const cleanDept = cleaned.department ? String(cleaned.department).trim() : "";
        const cleanPos = cleaned.position ? String(cleaned.position).trim() : "";
        const cleanBirthDate = cleaned.birthDate ? String(cleaned.birthDate).trim() : "";

        const hasNik = cleanNik !== "";

        if (!cleanName && !hasNik) {
          skippedLogs.push({ rowNum: item.rowNum, reason: "Nama dan NIK kosong" });
          return;
        }
        if (!cleanName) {
          skippedLogs.push({ rowNum: item.rowNum, reason: "Nama kosong" });
          return;
        }

        // Filter out header/category rows (e.g. HRD, SECURITY, DRIVER rows with no NIK, position, phone, or birthdate)
        if (!hasNik && !cleanPos && !cleaned.phone && !cleanBirthDate && !cleaned.startDate) {
          skippedLogs.push({ rowNum: item.rowNum, reason: `Header/Kategori Departemen '${cleanName}' (Bukan Data Karyawan)` });
          return;
        }

        // Check duplicate within the uploaded file itself
        let duplicateInFile: any = null;
        if (hasNik) {
          // Primary check by NIK: Two rows with the same NIK are duplicates
          duplicateInFile = alreadyProcessed.find(p => p.nik && String(p.nik).trim() === cleanNik);
        } else {
          // Secondary check by Name ONLY when NIK is missing on both rows
          duplicateInFile = alreadyProcessed.find(p => {
            if (!p.name) return false;
            const sameName = String(p.name).toLowerCase().trim() === cleanName.toLowerCase();
            if (!sameName) return false;

            const pDept = (p.department || '').trim().toLowerCase();
            const cDept = cleanDept.toLowerCase();
            const pPos = (p.position || '').trim().toLowerCase();
            const cPos = cleanPos.toLowerCase();
            const pBirth = (p.birthDate || '').trim();
            const cBirth = cleanBirthDate;

            if (pBirth && cBirth && pBirth !== cBirth) return false;
            if (pDept && cDept && pDept !== cDept) return false;
            if (pPos && cPos && pPos !== cPos) return false;

            return true;
          });
        }

        if (duplicateInFile) {
          const detailMsg = hasNik 
            ? `NIK '${cleanNik}' (${cleanName}) sudah ada di Baris ${duplicateInFile._rowNum} (${duplicateInFile.name}) pada berkas ini`
            : `Nama '${cleanName}' (tanpa NIK) di Baris ${item.rowNum} sama dengan Baris ${duplicateInFile._rowNum}. Harap cantumkan NIK 16-digit untuk membedakan.`;
            
          validRowsList.push({
            data: cleaned,
            statusType: 'conflict',
            conflictReason: `Duplikat di dalam file yang sama: ${detailMsg}`,
            rowNum: item.rowNum
          });
          return;
        }

        // Attach current row number for future duplicate detection
        const recordForTracking = { ...cleaned, _rowNum: item.rowNum };

        // Match in DB
        let matchedEmp: Employee | undefined;

        if (hasNik) {
          matchedEmp = allEmployees.find(e => e.nik && formatNikString(e.nik) === cleanNik);
        } else {
          matchedEmp = allEmployees.find(e => {
            const dbName = (e.name || '').toLowerCase().trim();
            if (dbName !== cleanName.toLowerCase()) return false;
            if (cleanBirthDate && e.birthDate && e.birthDate !== cleanBirthDate) return false;
            if (cleanDept && e.department && e.department.toLowerCase().trim() !== cleanDept.toLowerCase()) return false;
            return true;
          });
        }

        if (matchedEmp) {
          cleaned.id = matchedEmp.id;
          const diffs = detectFieldConflicts(matchedEmp, cleaned);

          if (diffs.length > 0) {
            const diffSummary = diffs.map(d => `${d.label}: DB '${d.dbVal || '-'}' ➔ File '${d.fileVal || '-'}'`).join(' | ');
            const conflictReason = `Perbedaan Data (${diffs.length} Field): ${diffSummary}`;

            validRowsList.push({
              data: cleaned,
              statusType: 'conflict',
              conflictReason,
              fieldDiffs: diffs,
              matchedEmp,
              rowNum: item.rowNum
            });
            alreadyProcessed.push(recordForTracking);
          } else {
            validRowsList.push({
              data: cleaned,
              statusType: 'update',
              matchedEmp,
              rowNum: item.rowNum
            });
            alreadyProcessed.push(recordForTracking);
          }
        } else {
          validRowsList.push({
            data: cleaned,
            statusType: 'add',
            rowNum: item.rowNum
          });
          alreadyProcessed.push(recordForTracking);
        }
      });

      const addedCount = validRowsList.filter(r => r.statusType === 'add').length;
      const updatedCount = validRowsList.filter(r => r.statusType === 'update').length;
      const conflictCount = validRowsList.filter(r => r.statusType === 'conflict').length;
      const skippedCount = skippedLogs.length;

      setImportPreview({
        totalRows: totalOriginalRows,
        addedCount,
        updatedCount,
        conflictCount,
        skippedCount,
        skippedLogs: [
          ...skippedLogs.map(l => ({ rowNum: l.rowNum, reason: l.reason })),
          ...validRowsList.filter(r => r.statusType === 'conflict').map(r => ({ rowNum: r.rowNum, reason: r.conflictReason || 'Konflik data' }))
        ],
        validRows: validRowsList
      });

      if (conflictCount > 0) {
        setPreviewFilter('conflict');
      } else {
        setPreviewFilter('all');
      }

      setUploadStatus({ type: null, message: '' });
    } else {
      throw new Error("Tipe file tidak didukung. Harap unggah file .xlsx, .xls, .csv, atau .json.");
    }
  };

  // Handler to sync and save the approved employee preview to database
  const handleSaveImportPreview = async () => {
    if (!importPreview) return;
    setIsUploading(true);
    setUploadStatus({ 
      type: null, 
      message: importMode === 'replace' ? 'Menimpa database & menyimpan data...' : 'Menyimpan data karyawan...' 
    });

    try {
      // Send valid rows
      const payloadToSave = importPreview.validRows
        .filter(r => r.statusType === 'add' || r.statusType === 'update')
        .map(r => r.data);

      if (payloadToSave.length === 0) {
        throw new Error("Tidak ada data karyawan valid yang dapat disimpan.");
      }

      if (importMode === 'replace') {
        // Clear deleted employees cache on explicit replace mode
        localStorage.removeItem('deleted_employee_ids');
      }

      const response = await fetch('/api/employees/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: importMode,
          dashboardType: dashboardType || 'GENERAL',
          employees: payloadToSave
        })
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.error || "Gagal mengimpor data ke database.");
      }

      setUploadStatus({
        type: 'success',
        message: importMode === 'replace'
          ? `Sukses Timpa Database! Seluruh master data lama telah diganti total dengan ${resData.totalCount} karyawan baru dari berkas.`
          : `Sukses Mengimpor Data! Berhasil menambahkan ${resData.addedCount} karyawan baru dan memperbarui ${resData.updatedCount} karyawan lama di database.`,
        added: resData.addedCount,
        updated: resData.updatedCount
      });

      setImportPreview(null);

      if (onUploadSuccess) {
        onUploadSuccess();
      }
    } catch (err: any) {
      setUploadStatus({
        type: 'error',
        message: err.message || "Gagal mengimpor data."
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Process selected file (CSV, Excel xlsx/xls, or JSON)
  const processFile = async (file: File) => {
    setIsUploading(true);
    setUploadStatus({ type: null, message: 'Membaca file...' });

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const dataBuffer = e.target?.result;
        if (!dataBuffer) {
          throw new Error("Gagal membaca isi file.");
        }
        await processBuffer(dataBuffer as ArrayBuffer, file.name);
      } catch (err: any) {
        setUploadStatus({
          type: 'error',
          message: err.message || "Gagal memproses file."
        });
      } finally {
        setIsUploading(false);
      }
    };

    reader.onerror = () => {
      setUploadStatus({ type: 'error', message: 'Gagal membaca file.' });
      setIsUploading(false);
    };

    reader.readAsArrayBuffer(file);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col xl:flex-row items-center gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-sm w-full">
      <div className="flex items-center gap-2 mr-auto">
        <FileSpreadsheet className="w-5 h-5 text-indigo-400 shrink-0" />
        <div>
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">{title}</h4>
          <p className="text-[10px] text-slate-400">Total data aktif siap unduh: {data.length} baris</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto justify-end">
        {/* DOWNLOAD BUTTONS GROUP */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
          <span className="text-[9px] uppercase font-bold text-slate-500 px-2">Unduh Laporan:</span>
          
          {/* CSV */}
          <button
            onClick={handleExportCSV}
            className="bg-slate-900 hover:bg-slate-850 text-slate-200 px-2.5 py-1.5 rounded text-[10.5px] font-bold transition-all cursor-pointer flex items-center gap-1 border border-slate-800 hover:border-slate-700"
            title="Download CSV"
          >
            <FileText className="w-3.5 h-3.5 text-indigo-400" />
            <span>CSV</span>
          </button>

          {/* EXCEL */}
          <button
            onClick={handleExportExcel}
            className="bg-slate-900 hover:bg-slate-850 text-slate-200 px-2.5 py-1.5 rounded text-[10.5px] font-bold transition-all cursor-pointer flex items-center gap-1 border border-slate-800 hover:border-slate-700"
            title="Download Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>EXCEL</span>
          </button>

          {/* PDF */}
          <button
            onClick={handleExportPDF}
            className="bg-slate-900 hover:bg-slate-850 text-slate-200 px-2.5 py-1.5 rounded text-[10.5px] font-bold transition-all cursor-pointer flex items-center gap-1 border border-slate-800 hover:border-slate-700"
            title="Download PDF (.pdf)"
          >
            <Download className="w-3.5 h-3.5 text-red-400" />
            <span>PDF</span>
          </button>
        </div>

        {/* UPLOAD BUTTON */}
        <button
          onClick={() => {
            setIsOpen(true);
            setUploadStatus({ type: null, message: '' });
          }}
          className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm px-3.5 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
          title={fileName.includes('absensi') ? "Unggah berkas log mesin .dat atau Excel/CSV absensi" : "Unggah berkas Excel/CSV untuk memperbarui atau menambah data karyawan"}
        >
          <Upload className="w-3.5 h-3.5" />
          <span>{fileName.includes('absensi') ? 'Unggah Log Mesin (.dat)' : 'Unggah / Import Data'}</span>
        </button>

        {/* CLEAR ALL MASTER DATA BUTTON */}
        {onClearAllEmployees && (
          <button
            onClick={() => onClearAllEmployees()}
            className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 px-3 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
            title="Kosongkan seluruh master data karyawan untuk mengunggah berkas data baru"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>Kosongkan Master Data</span>
          </button>
        )}
      </div>

      {/* UPLOAD MODAL DIALOG */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`bg-slate-900 border border-slate-800 rounded-2xl w-full ${(parsedSummary || importPreview) ? 'max-w-4xl' : 'max-w-lg'} overflow-hidden shadow-2xl relative animate-in fade-in zoom-in duration-200`}>
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-sm text-white uppercase tracking-wider">
                  {importPreview ? 'Review & Approval Impor Karyawan' : parsedSummary ? 'Hasil Rekapitulasi Absensi Solution' : 'Unggah & Impor Karyawan (Massal)'}
                </h3>
              </div>
              <button 
                onClick={() => {
                  setIsOpen(false);
                  setParsedSummary(null);
                  setImportPreview(null);
                  setFileMeta(null);
                }}
                className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {importPreview ? (
                // Unified Excel/CSV/JSON Review & Approval Preview
                <div className="space-y-4">
                  {/* Interactive Mode Toggle Bar */}
                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Mode Eksekusi Impor Database:</span>
                      <p className="text-[11px] text-slate-300">
                        {importMode === 'replace' 
                          ? '⚠️ Mode Timpa Aktif: Master data lama akan DIHAPUS PERMANEN dan DIGANTI TOTAL.' 
                          : '🔄 Mode Gabung Aktif: Memperbarui karyawan yang cocok & menambah karyawan baru.'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 shrink-0">
                      <button
                        type="button"
                        onClick={() => setImportMode('merge')}
                        className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                          importMode === 'merge' 
                            ? 'bg-indigo-600 text-white shadow-sm' 
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Gabung Data</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setImportMode('replace')}
                        className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                          importMode === 'replace' 
                            ? 'bg-rose-600 text-white shadow-sm' 
                            : 'text-slate-400 hover:text-rose-300'
                        }`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Timpa Database</span>
                      </button>
                    </div>
                  </div>

                  {/* Replace Mode Warning Banner */}
                  {importMode === 'replace' && (
                    <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <div>
                        <strong className="block text-rose-200 font-bold mb-0.5">PERHATIAN: PERINGATAN HAPUS &amp; TIMPA DATABASE!</strong>
                        Seluruh data karyawan lama di database akan dikosongkan secara permanen. Database master akan langsung diisi ulang secara bersih oleh <strong>{importPreview.validRows.length} baris karyawan</strong> yang tertera pada berkas unggahan ini.
                      </div>
                    </div>
                  )}

                  {/* Stats & Filter Bar */}
                  <div className="space-y-3">
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-500 font-bold block uppercase">Total Baris File</span>
                        <strong className="text-white text-sm block">{importPreview.totalRows} Baris</strong>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-emerald-500 font-bold block uppercase">Akan Ditambahkan</span>
                        <strong className="text-emerald-400 text-sm block">{importPreview.addedCount} Baru</strong>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-blue-500 font-bold block uppercase">Akan Diperbarui</span>
                        <strong className="text-blue-400 text-sm block">{importPreview.updatedCount} Update</strong>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-amber-500 font-bold block uppercase">Perlu Approval / Konflik</span>
                        <strong className={`text-sm block font-bold ${importPreview.conflictCount > 0 ? 'text-amber-400 animate-pulse' : 'text-slate-400'}`}>
                          {importPreview.conflictCount} Konflik
                        </strong>
                      </div>
                    </div>

                    {/* Navigation Tabs for Filter */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-1.5 overflow-x-auto">
                        <button
                          type="button"
                          onClick={() => setPreviewFilter('all')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                            previewFilter === 'all'
                              ? 'bg-slate-800 text-white shadow-sm'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <span>Semua Data</span>
                          <span className="px-1.5 py-0.2 rounded-full bg-slate-900 text-[10px] font-mono">{importPreview.validRows.length}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setPreviewFilter('conflict')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                            previewFilter === 'conflict'
                              ? 'bg-amber-600 text-white shadow-sm'
                              : 'text-amber-400 hover:text-amber-300 bg-amber-500/10 border border-amber-500/20'
                          }`}
                        >
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Perlu Approval Konflik</span>
                          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${importPreview.conflictCount > 0 ? 'bg-amber-400 text-slate-950' : 'bg-slate-900 text-slate-400'}`}>
                            {importPreview.conflictCount}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setPreviewFilter('add')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                            previewFilter === 'add'
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'text-emerald-400 hover:text-emerald-300'
                          }`}
                        >
                          <span>Baru</span>
                          <span className="px-1.5 py-0.2 rounded-full bg-slate-900 text-[10px] font-mono">{importPreview.addedCount}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setPreviewFilter('update')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                            previewFilter === 'update'
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'text-blue-400 hover:text-blue-300'
                          }`}
                        >
                          <span>Update</span>
                          <span className="px-1.5 py-0.2 rounded-full bg-slate-900 text-[10px] font-mono">{importPreview.updatedCount}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* PROMINENT CONFLICT APPROVAL PANEL FOR PKWT & BPJS / DUKCAPIL */}
                  {importPreview.conflictCount > 0 && (previewFilter === 'conflict' || previewFilter === 'all') && (
                    <div className="bg-slate-950 border border-amber-500/40 rounded-xl p-4 space-y-3.5 shadow-lg relative overflow-hidden">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                        <div className="space-y-0.5">
                          <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                            <ShieldCheck className="w-4 h-4 text-emerald-400" />
                            <span>PUSAT APPROVAL KARYAWAN &amp; SINKRONISASI DUKCAPIL / BPJS ({importPreview.conflictCount} KONFLIK)</span>
                          </h4>
                          <p className="text-[11px] text-slate-300">
                            Sistem menemukan perbedaan antara berkas unggahan PKWT/BPJS dan data master Dukcapil DB. Silakan pilih opsi approval di bawah ini:
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleResolveAllConflicts('bpjs_tk')}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-md border border-emerald-400/30"
                            title="Gunakan Seluruh Data dari Berkas BPJS TK (Nama, NIK, No BPJS TK, DLL)"
                          >
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-200" />
                            <span>Gunakan Data BPJS TK</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleResolveAllConflicts('dukcapil_smart')}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-md"
                            title="Proteksi NIK & Nama Dukcapil dari DB, Update Kontrak PKWT & Nomor BPJS dari Berkas"
                          >
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                            <span>🇮🇩 Dukcapil Smart Merge (Rekomendasi)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleResolveAllConflicts('file')}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Terima Semua Berkas</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleResolveAllConflicts('db')}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer"
                          >
                            <span>Pertahankan DB</span>
                          </button>
                        </div>
                      </div>

                      {/* Conflict Items Detailed Cards */}
                      <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                        {importPreview.validRows.map((row, idx) => {
                          if (row.statusType !== 'conflict') return null;
                          return (
                            <div key={idx} className="bg-slate-900 border border-amber-500/30 rounded-xl p-3.5 space-y-2.5">
                              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold rounded text-[10px] font-mono">Baris #{row.rowNum}</span>
                                    <strong className="text-xs text-white font-bold">{row.data.name || row.matchedEmp?.name || 'Karyawan'}</strong>
                                  </div>
                                  <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                                    NIK: <span className="text-slate-200">{row.data.nik || row.matchedEmp?.nik || '-'}</span> | Departemen: {row.data.department || row.matchedEmp?.department || '-'}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => handleResolveConflictRow(idx, 'bpjs_tk')}
                                    className="bg-emerald-600/30 hover:bg-emerald-600/60 text-emerald-200 border border-emerald-500/50 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1"
                                    title="Gunakan Data dari Berkas BPJS TK"
                                  >
                                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                                    <span>Data BPJS TK</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleResolveConflictRow(idx, 'dukcapil_smart')}
                                    className="bg-indigo-600/30 hover:bg-indigo-600/60 text-indigo-200 border border-indigo-500/50 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1"
                                    title="Proteksi Nama/NIK Dukcapil DB, Update Kontrak PKWT & BPJS dari File"
                                  >
                                    <ShieldCheck className="w-3 h-3 text-indigo-400" />
                                    <span>Dukcapil Smart</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleResolveConflictRow(idx, 'file')}
                                    className="bg-blue-600 hover:bg-blue-500 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1"
                                  >
                                    <Check className="w-3 h-3" />
                                    <span>Terima Berkas</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleResolveConflictRow(idx, 'db')}
                                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                                  >
                                    <span>Gunakan DB</span>
                                  </button>
                                </div>
                              </div>

                              {/* Diff Table */}
                              {row.fieldDiffs && row.fieldDiffs.length > 0 && (
                                <div className="border border-slate-800 rounded-lg overflow-hidden text-[11px]">
                                  <table className="w-full text-left border-collapse">
                                    <thead className="bg-slate-950 text-[9px] uppercase font-bold text-slate-400 border-b border-slate-800">
                                      <tr>
                                        <th className="p-1.5">Field</th>
                                        <th className="p-1.5 text-slate-300">Data Master DB (Dukcapil)</th>
                                        <th className="p-1.5 text-indigo-300">Data Berkas Baru (PKWT/BPJS)</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/60 font-mono text-[10.5px]">
                                      {row.fieldDiffs.map((diff, dIdx) => (
                                        <tr key={dIdx} className="hover:bg-slate-800/50">
                                          <td className="p-1.5 font-sans font-bold text-slate-300">{diff.label}</td>
                                          <td className="p-1.5 text-slate-400 bg-slate-950/40">{String(diff.dbVal ?? '-')}</td>
                                          <td className="p-1.5 text-indigo-300 font-bold bg-indigo-950/30">{String(diff.fileVal ?? '-')}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {importPreview.skippedLogs.length > 0 && (
                    <div className="bg-amber-950/20 border border-amber-500/20 rounded-xl p-3 text-xs space-y-1">
                      <span className="font-bold text-amber-400 block">Daftar Baris yang Dilewati ({importPreview.skippedLogs.length}):</span>
                      <div className="max-h-[100px] overflow-y-auto space-y-1 font-mono text-[10px] text-amber-300/80 divide-y divide-amber-500/10">
                        {importPreview.skippedLogs.map((log, lIdx) => (
                          <div key={lIdx} className="pt-1 first:pt-0 flex items-start gap-1">
                            <span className="font-bold shrink-0 text-amber-400">[Baris {log.rowNum}]:</span>
                            <span>{log.reason}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Scrollable Preview Table of Parsed Rows */}
                  <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
                    <div className="max-h-[260px] overflow-y-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead className="bg-slate-900 sticky top-0 border-b border-slate-800 text-slate-400 uppercase text-[9px] font-bold tracking-wider z-10">
                          <tr>
                            <th className="p-3 w-16">Baris</th>
                            <th className="p-3">Nama Karyawan</th>
                            <th className="p-3">NIK</th>
                            <th className="p-3">Jabatan</th>
                            <th className="p-3">Departemen</th>
                            <th className="p-3">Status</th>
                            <th className="p-3 text-right">Rencana Tindakan</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-900 text-slate-300 font-mono text-[11px]">
                          {importPreview.validRows
                            .filter(row => {
                              if (previewFilter === 'conflict') return row.statusType === 'conflict';
                              if (previewFilter === 'add') return row.statusType === 'add';
                              if (previewFilter === 'update') return row.statusType === 'update';
                              return true;
                            })
                            .map((row, idx) => (
                              <tr 
                                key={idx} 
                                className={`hover:bg-slate-900/50 ${
                                  row.statusType === 'add' ? 'bg-emerald-950/10 text-emerald-300' :
                                  row.statusType === 'update' ? 'bg-blue-950/10 text-blue-300' :
                                  'bg-amber-950/20 text-amber-300 border-l-2 border-l-amber-500'
                                }`}
                              >
                                <td className="p-3 font-bold">#{row.rowNum}</td>
                                <td className="p-3 font-sans font-semibold text-slate-100 max-w-[150px] truncate">
                                  {row.data.name || '-'}
                                </td>
                                <td className="p-3 text-slate-300 font-mono">
                                  {row.data.nik ? (
                                    <span className="inline-flex items-center gap-1.5">
                                      <span>{row.data.nik}</span>
                                      {row.data.nik.length === 16 ? (
                                        <span className="text-[9px] text-emerald-400 font-bold px-1 py-0.2 bg-emerald-500/10 border border-emerald-500/20 rounded" title="NIK Valid 16 Digit">16-Digit</span>
                                      ) : (
                                        <span className="text-[9px] text-amber-400 font-bold px-1 py-0.2 bg-amber-500/10 border border-amber-500/20 rounded" title={`NIK ${row.data.nik.length} Digit`}>{row.data.nik.length} Digit</span>
                                      )}
                                    </span>
                                  ) : (
                                    <span className="text-amber-500/80 italic text-[10px] bg-amber-500/5 px-1.5 py-0.5 rounded border border-amber-500/20">Tanpa NIK</span>
                                  )}
                                </td>
                                <td className="p-3 font-sans text-slate-400">{row.data.position || '-'}</td>
                                <td className="p-3 font-sans text-slate-400">{row.data.department || '-'}</td>
                                <td className="p-3 font-sans">
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase font-sans ${
                                    row.data.status === 'PKWTT' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-slate-800 text-slate-400'
                                  }`}>
                                    {row.data.status || 'PKWT'}
                                  </span>
                                </td>
                                <td className="p-3 text-right">
                                  {row.statusType === 'conflict' ? (
                                    <div className="inline-flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const rowIdxInFull = importPreview.validRows.findIndex(r => r.rowNum === row.rowNum);
                                          if (rowIdxInFull !== -1) handleResolveConflictRow(rowIdxInFull, 'dukcapil_smart');
                                        }}
                                        className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 hover:bg-amber-400 font-bold text-[10px] cursor-pointer shadow-sm flex items-center gap-1"
                                      >
                                        <ShieldCheck className="w-3 h-3" />
                                        <span>Setujui (Smart)</span>
                                      </button>
                                    </div>
                                  ) : (
                                    <span className={`px-2 py-0.5 rounded-full font-bold font-sans text-[10px] ${
                                      row.statusType === 'add' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'
                                    }`}>
                                      {row.statusType === 'add' ? 'Ditambahkan' : 'Diperbarui'}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : parsedSummary ? (
                // Solution DAT File Recap Preview
                <div className="space-y-4">
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-500 font-bold block uppercase">NAMA BERKAS</span>
                      <strong className="text-white text-xs truncate block">{fileMeta?.fileName || '-'}</strong>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-500 font-bold block uppercase">TOTAL TAP DETEKSI</span>
                      <strong className="text-indigo-400 text-xs block">{Number(fileMeta?.totalLogs ?? 0).toLocaleString()} Tap</strong>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-500 font-bold block uppercase">KARYAWAN TERDETEKSI</span>
                      <strong className="text-emerald-400 text-xs block">{fileMeta?.employeeCount ?? 0} Orang</strong>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-500 font-bold block uppercase">RENTANG TANGGAL</span>
                      <strong className="text-amber-400 text-[11px] block">{fileMeta?.startDate || '-'} s/d {fileMeta?.endDate || '-'}</strong>
                    </div>
                  </div>

                  <div className="p-3 bg-indigo-950/20 border border-indigo-500/20 rounded-lg text-xs leading-relaxed text-slate-300">
                    Sistem mendeteksi format Solution Fingerprint .dat. Data di bawah ini telah dikelompokkan per hari dan dihitung keterlambatannya berdasarkan tipe <strong>Shift Kerja</strong> masing-masing karyawan (Shift 1 = 07:00, Shift 2 = 15:00/19:00, Regular = 08:00) dengan toleransi keterlambatan 15 menit.
                  </div>

                  {/* Scrollable Preview Table */}
                  <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
                    <div className="max-h-[280px] overflow-y-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead className="bg-slate-900 sticky top-0 border-b border-slate-800 text-slate-400 uppercase text-[9px] font-bold tracking-wider z-10">
                          <tr>
                            <th className="p-3">PIN / No</th>
                            <th className="p-3">Nama Karyawan</th>
                            <th className="p-3">Departemen</th>
                            <th className="p-3">Shift</th>
                            <th className="p-3 text-center">Hadir (Tepat)</th>
                            <th className="p-3 text-center">Terlambat</th>
                            <th className="p-3 text-center">Alpa</th>
                            <th className="p-3 text-center">Izin / Cuti</th>
                            <th className="p-3 text-right">Skor Kehadiran</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-900 text-slate-300 font-mono text-[11px]">
                          {parsedSummary.map((row, idx) => (
                            <tr key={idx} className={`hover:bg-slate-900/50 ${!row.nik ? 'bg-amber-950/10 text-amber-300/90' : ''}`}>
                              <td className="p-3 font-bold">#{row.globalNo}</td>
                              <td className="p-3 font-sans font-semibold text-slate-100 max-w-[150px] truncate">
                                {row.name}
                                {!row.nik && (
                                  <span className="block text-[8px] text-amber-500 font-bold tracking-widest uppercase mt-0.5">TIDAK TERDAFTAR</span>
                                )}
                              </td>
                              <td className="p-3 font-sans text-slate-400">{row.department}</td>
                              <td className="p-3 text-slate-400">
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase font-sans ${
                                  row.workShift === 'Shift 1' ? 'bg-blue-500/10 text-blue-400' :
                                  row.workShift === 'Shift 2' ? 'bg-purple-500/10 text-purple-400' :
                                  'bg-slate-800 text-slate-400'
                                }`}>
                                  {row.workShift}
                                </span>
                              </td>
                              <td className="p-3 text-center font-bold text-emerald-400">{row.daysPresent} Hari</td>
                              <td className="p-3 text-center font-bold text-amber-400">{row.daysLate} Hari</td>
                              <td className="p-3 text-center font-bold text-red-400">{row.daysAbsent} Hari</td>
                              <td className="p-3 text-center font-bold text-sky-400">{row.daysPermit} Hari</td>
                              <td className="p-3 text-right">
                                <span className={`px-2 py-0.5 rounded-full font-bold font-mono text-[11px] ${
                                  row.attendanceRate >= 95 ? 'bg-emerald-500/10 text-emerald-400' :
                                  row.attendanceRate >= 80 ? 'bg-amber-500/10 text-amber-400' :
                                  'bg-red-500/10 text-red-400'
                                }`}>
                                  {row.attendanceRate}%
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                // Tabbed Importer / Exporter UI (Local vs Google Drive)
                <div className="space-y-4">
                  {/* Tab Selector */}
                  <div className="flex border-b border-slate-800">
                    <button
                      type="button"
                      onClick={() => setActiveTab('local')}
                      className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider text-center border-b-2 transition-all cursor-pointer ${
                        activeTab === 'local'
                          ? 'border-indigo-500 text-indigo-400'
                          : 'border-transparent text-slate-400 hover:text-slate-300'
                      }`}
                    >
                      Komputer Lokal
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('drive');
                        setUploadStatus({ type: null, message: '' });
                      }}
                      className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider text-center border-b-2 transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        activeTab === 'drive'
                          ? 'border-indigo-500 text-indigo-400'
                          : 'border-transparent text-slate-400 hover:text-slate-300'
                      }`}
                    >
                      <Cloud className="w-4 h-4 shrink-0 text-sky-400" />
                      <span>Google Drive</span>
                    </button>
                  </div>

                  {activeTab === 'local' ? (
                    // Tab 1: Local File Upload
                    <>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Anda dapat menambah karyawan baru atau memperbarui data lama dengan mengunggah berkas <strong>Excel (.xlsx, .xls)</strong>, <strong>CSV (.csv)</strong>, atau <strong>JSON</strong>.
                        {fileName.includes('absensi') && (
                          <span className="text-indigo-400 block mt-1.5 font-medium">
                            ✨ Sistem ini mendukung pemrosesan langsung berkas log absensi sidik jari <strong>Solution (.dat)</strong> seperti berkas <strong>1_attlog.dat</strong> secara cerdas.
                          </span>
                        )}
                      </p>

                      {/* Template Download Link */}
                      <div className="bg-indigo-950/20 border border-indigo-500/20 p-3 rounded-lg flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2 text-indigo-300 font-medium">
                          <FileDown className="w-4 h-4 text-indigo-400 shrink-0" />
                          <span>Unduh template kolom impor:</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleDownloadTemplate}
                            className="flex-1 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 px-2.5 py-1 rounded text-[10px] font-bold transition-all cursor-pointer"
                          >
                            CSV Template
                          </button>
                          <button
                            type="button"
                            onClick={handleDownloadTemplateExcel}
                            className="flex-1 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 border border-indigo-500/30 hover:border-indigo-400 px-2.5 py-1 rounded text-[10px] font-bold transition-all cursor-pointer"
                          >
                            Excel Template
                          </button>
                        </div>
                      </div>

                      {/* Mode Selection Choice (Gabung vs Timpa Database) */}
                      <div className="space-y-2 text-left">
                        <label className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
                          Pilih Mode Impor Database:
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setImportMode('merge')}
                            className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                              importMode === 'merge'
                                ? 'bg-indigo-600/15 border-indigo-500/80 text-white shadow-sm'
                                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-300 hover:border-slate-700'
                            }`}
                          >
                            <RefreshCw className={`w-4 h-4 shrink-0 mt-0.5 ${importMode === 'merge' ? 'text-indigo-400' : 'text-slate-500'}`} />
                            <div className="space-y-0.5">
                              <div className="text-xs font-bold flex items-center gap-1">
                                <span>Gabung / Update Data</span>
                                {importMode === 'merge' && <Check className="w-3 h-3 text-indigo-400" />}
                              </div>
                              <p className="text-[10px] text-slate-400 leading-tight">
                                Perbarui data lama yang cocok (NIK/Nama) &amp; tambah data baru. Data lama lainnya tetap tersimpan.
                              </p>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => setImportMode('replace')}
                            className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                              importMode === 'replace'
                                ? 'bg-rose-500/15 border-rose-500/80 text-white shadow-sm'
                                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-300 hover:border-slate-700'
                            }`}
                          >
                            <Trash2 className={`w-4 h-4 shrink-0 mt-0.5 ${importMode === 'replace' ? 'text-rose-400' : 'text-slate-500'}`} />
                            <div className="space-y-0.5">
                              <div className="text-xs font-bold text-rose-300 flex items-center gap-1">
                                <span>Timpa Database (Replace All)</span>
                                {importMode === 'replace' && <Check className="w-3 h-3 text-rose-400" />}
                              </div>
                              <p className="text-[10px] text-slate-400 leading-tight">
                                Hapus &amp; ganti seluruh master database karyawan dengan seluruh isi dari berkas baru ini.
                              </p>
                            </div>
                          </button>
                        </div>
                      </div>

                      {/* Drag and Drop Zone */}
                      <div 
                        onDragEnter={handleDrag}
                        onDragOver={handleDrag}
                        onDragLeave={handleDrag}
                        onDrop={handleDrop}
                        onClick={triggerFileInput}
                        className={`border-2 border-dashed rounded-xl p-8 text-center flex flex-col items-center justify-center gap-3 transition-all cursor-pointer ${
                          dragActive 
                            ? 'border-indigo-500 bg-indigo-500/5' 
                            : 'border-slate-800 hover:border-slate-700 bg-slate-950/40'
                        }`}
                      >
                        <input 
                          type="file" 
                          ref={fileInputRef}
                          onChange={handleFileChange}
                          accept=".csv,.xlsx,.xls,.json,.dat"
                          className="hidden"
                        />
                        
                        <UploadCloud className="w-10 h-10 text-slate-500" />
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-white">Seret berkas di sini atau klik untuk memilih</p>
                          <p className="text-[10px] text-slate-500">Mendukung format .xlsx, .xls, .csv, .json, dan .dat (Maks. 10MB)</p>
                        </div>
                      </div>
                    </>
                  ) : (
                    // Tab 2: Google Drive Integration
                    <div className="space-y-4">
                      {!driveUser ? (
                        // Not signed in to Google
                        <div className="border border-slate-800 bg-slate-950/40 rounded-xl p-6 text-center space-y-4 flex flex-col items-center justify-center">
                          <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                            <Cloud className="w-6 h-6" />
                          </div>
                          <div className="space-y-1.5 max-w-sm">
                            <h4 className="text-sm font-bold text-white">Koneksi Google Workspace</h4>
                            <p className="text-xs text-slate-400 leading-relaxed">
                              Hubungkan aplikasi ini dengan akun Google Drive Anda untuk mengimpor lembar absensi/karyawan dan menyimpan cadangan data secara otomatis.
                            </p>
                          </div>
                          
                          <button
                            type="button"
                            onClick={handleDriveSignIn}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-md px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2"
                          >
                            <svg className="w-4 h-4 shrink-0 fill-current" viewBox="0 0 24 24">
                              <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.113-6.886 4.113-4.754 0-8.625-3.87-8.625-8.624 0-4.754 3.871-8.625 8.625-8.625 2.193 0 4.12.81 5.614 2.146l3.153-3.153C18.152.992 15.352 0 12.24 0 5.48 0 0 5.48 0 12.24s5.48 12.24 12.24 12.24c6.7 0 12.115-4.887 12.115-12.24 0-.828-.083-1.428-.242-1.955H12.24z"/>
                            </svg>
                            <span>Hubungkan dengan Google Drive</span>
                          </button>
                        </div>
                      ) : (
                        // Signed in to Google
                        <div className="space-y-4 animate-in fade-in duration-150">
                          {/* Google account header bar */}
                          <div className="bg-slate-950 p-3 rounded-lg border border-slate-850 flex items-center justify-between text-xs gap-3">
                            <div className="flex items-center gap-2">
                              {driveUser.photoURL ? (
                                <img
                                  src={driveUser.photoURL}
                                  alt={driveUser.email || 'Google User'}
                                  className="w-6 h-6 rounded-full border border-slate-800"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-indigo-400">
                                  G
                                </div>
                              )}
                              <div className="text-left leading-tight">
                                <span className="block font-bold text-white text-xs">{driveUser.displayName || 'Akun Google Connected'}</span>
                                <span className="block text-[10px] text-slate-400">{driveUser.email}</span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={handleDriveSignOut}
                              className="text-rose-400 hover:text-rose-300 p-1.5 hover:bg-rose-950/10 rounded-lg transition-all cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                              title="Disconnect Google Account"
                            >
                              <LogOut className="w-3.5 h-3.5" />
                              <span>Keluar</span>
                            </button>
                          </div>

                          {/* Grid layout: Import left, export right */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Panel Import */}
                            <div className="border border-slate-800 rounded-xl bg-slate-950/20 p-4 space-y-3 flex flex-col">
                              <h5 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-2">
                                <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-400" />
                                <span>Impor dari Drive</span>
                              </h5>
                              <p className="text-[11px] text-slate-400">
                                Pilih berkas Excel, CSV, JSON, atau log mesin (.dat) di Google Drive Anda untuk diimpor.
                              </p>

                              {/* Search & Refresh Bar */}
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  placeholder="Cari berkas..."
                                  value={driveSearch}
                                  onChange={(e) => setDriveSearch(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') loadDriveFiles();
                                  }}
                                  className="flex-1 bg-slate-950 text-xs text-white border border-slate-850 rounded px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                                />
                                <button
                                  type="button"
                                  onClick={loadDriveFiles}
                                  disabled={isDriveLoading}
                                  className="bg-slate-900 hover:bg-slate-800 border border-slate-850 p-1.5 rounded transition-all cursor-pointer disabled:opacity-50 text-slate-300"
                                  title="Refresh file list"
                                >
                                  <RefreshCw className={`w-3.5 h-3.5 ${isDriveLoading ? 'animate-spin' : ''}`} />
                                </button>
                              </div>

                              {/* Files List Container */}
                              <div className="border border-slate-850 rounded bg-slate-950 flex-1 min-h-[140px] max-h-[180px] overflow-y-auto p-1 text-xs">
                                {isDriveLoading ? (
                                  <div className="flex flex-col items-center justify-center h-full py-8 text-slate-500 gap-2">
                                    <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                                    <span>Memuat berkas...</span>
                                  </div>
                                ) : driveError ? (
                                  <div className="p-3 text-center text-rose-400 text-[11px]">
                                    {driveError}
                                  </div>
                                ) : driveFiles.length === 0 ? (
                                  <div className="text-center py-10 text-slate-500 text-[11px]">
                                    Tidak ada berkas yang ditemukan.
                                  </div>
                                ) : (
                                  <div className="divide-y divide-slate-900">
                                    {driveFiles.map((file) => {
                                      const driveFileNameLower = file.name.toLowerCase();
                                      const isSheet = driveFileNameLower.endsWith('.xlsx') || driveFileNameLower.endsWith('.xls');
                                      const isCsv = driveFileNameLower.endsWith('.csv');
                                      const isJson = driveFileNameLower.endsWith('.json');
                                      const isDat = driveFileNameLower.endsWith('.dat');

                                      return (
                                        <div key={file.id} className="p-2 flex items-center justify-between gap-2 hover:bg-slate-900/50 rounded transition-all">
                                          <div className="flex items-center gap-2 min-w-0 flex-1">
                                            {isSheet ? (
                                              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                            ) : isCsv ? (
                                              <FileText className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                            ) : isJson ? (
                                              <Cloud className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                            ) : isDat ? (
                                              <FileText className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                                            ) : (
                                              <Cloud className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                            )}
                                            <div className="min-w-0">
                                              <p className="font-medium text-slate-200 truncate" title={file.name}>
                                                {file.name}
                                              </p>
                                              <span className="text-[9px] text-slate-500 font-mono block">
                                                ID: {file.id.substring(0, 10)}...
                                              </span>
                                            </div>
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() => handleImportDriveFile(file)}
                                            className="bg-indigo-600/20 hover:bg-indigo-600 border border-indigo-500/30 text-indigo-300 hover:text-white px-2 py-1 rounded text-[10px] font-bold transition-all cursor-pointer shrink-0"
                                          >
                                            Impor
                                          </button>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>

                              {/* Direct URL Input for Google Sheets */}
                              <div className="pt-2 border-t border-slate-850 space-y-2 text-left">
                                <label className="text-[10px] font-bold text-slate-400 block uppercase">Atau Impor via Tautan Google Sheets</label>
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    placeholder="Tempel tautan Google Sheets..."
                                    value={directUrlInput}
                                    onChange={(e) => setDirectUrlInput(e.target.value)}
                                    className="flex-1 bg-slate-950 text-xs text-white border border-slate-850 rounded px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                                  />
                                  <button
                                    type="button"
                                    onClick={handleImportDirectUrl}
                                    disabled={isUploading}
                                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded text-xs font-bold transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1 shrink-0"
                                  >
                                    <FileUp className="w-3.5 h-3.5" />
                                    <span>Impor</span>
                                  </button>
                                </div>
                                <p className="text-[9px] text-slate-500">
                                  Contoh: https://docs.google.com/spreadsheets/d/...
                                </p>
                              </div>
                            </div>

                            {/* Panel Export */}
                            <div className="border border-slate-800 rounded-xl bg-slate-950/20 p-4 space-y-3 flex flex-col justify-between">
                              <div className="space-y-3">
                                <h5 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-2">
                                  <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>Ekspor ke Drive</span>
                                </h5>
                                <p className="text-[11px] text-slate-400 leading-relaxed">
                                  Ekspor seluruh baris data aktif di halaman ini langsung sebagai berkas spreadsheet Excel (.xlsx) baru ke folder utama Google Drive Anda.
                                </p>

                                <div className="space-y-1.5">
                                  <label className="text-[10px] font-bold text-slate-400 block uppercase">NAMA BERKAS EXCEL</label>
                                  <input
                                    type="text"
                                    placeholder="Contoh: Laporan_Hrd"
                                    value={driveExportName}
                                    onChange={(e) => setDriveExportName(e.target.value)}
                                    className="w-full bg-slate-950 text-xs text-white border border-slate-850 rounded px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                                  />
                                </div>
                              </div>

                              <div className="pt-3 border-t border-slate-850 flex items-center justify-between gap-2">
                                <span className="text-[10px] text-slate-500 font-mono">Format: .xlsx (Excel)</span>
                                <button
                                  type="button"
                                  onClick={handleExportToDrive}
                                  disabled={driveExporting || isUploading}
                                  className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm px-3.5 py-2 rounded text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                                >
                                  {driveExporting ? (
                                    <>
                                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                      <span>Mengirim...</span>
                                    </>
                                  ) : (
                                    <>
                                      <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
                                      <span>Ekspor Sekarang</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Drive error notification */}
                          {driveError && (
                            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-[11px] text-rose-300 leading-relaxed flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                              <span>{driveError}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Upload Status Alert */}
              {uploadStatus.type && (
                <div className={`p-4 rounded-xl border flex items-start gap-3 text-xs ${
                  uploadStatus.type === 'success' 
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' 
                    : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                }`}>
                  {uploadStatus.type === 'success' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1.5 flex-1">
                    <p className="font-bold">{uploadStatus.type === 'success' ? 'Proses Impor Selesai' : 'Terjadi Kesalahan'}</p>
                    <p className="text-slate-300 leading-relaxed">{uploadStatus.message}</p>
                    
                    {uploadStatus.type === 'success' && uploadStatus.updated !== undefined && uploadStatus.added !== undefined && (
                      <div className="flex items-center gap-4 pt-1 font-mono text-[10px] text-slate-400">
                        <span>Ditambahkan: <strong className="text-white font-bold">{uploadStatus.added}</strong></span>
                        <span>Diperbarui: <strong className="text-white font-bold">{uploadStatus.updated}</strong></span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex justify-end gap-2">
              {importPreview ? (
                <>
                  <button
                    onClick={() => {
                      setImportPreview(null);
                      setUploadStatus({ type: null, message: '' });
                    }}
                    disabled={isUploading}
                    className="bg-slate-800 hover:bg-slate-750 text-slate-300 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer disabled:opacity-55"
                  >
                    Batal &amp; Reset
                  </button>
                  <button
                    onClick={handleSaveImportPreview}
                    disabled={isUploading || (importMode === 'merge' ? (importPreview.addedCount + importPreview.updatedCount === 0) : importPreview.validRows.length === 0)}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-55 ${
                      importMode === 'replace'
                        ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/20'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm'
                    }`}
                  >
                    {isUploading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>{importMode === 'replace' ? 'Menimpa Database...' : 'Menyimpan...'}</span>
                      </>
                    ) : importMode === 'replace' ? (
                      <>
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Timpa Database &amp; Simpan ({importPreview.validRows.length} Data)</span>
                      </>
                    ) : (
                      <span>Konfirmasi &amp; Simpan ({importPreview.addedCount + importPreview.updatedCount} Data)</span>
                    )}
                  </button>
                </>
              ) : parsedSummary ? (
                <>
                  <button
                    onClick={() => {
                      setParsedSummary(null);
                      setFileMeta(null);
                      setUploadStatus({ type: null, message: '' });
                    }}
                    disabled={isUploading}
                    className="bg-slate-800 hover:bg-slate-750 text-slate-300 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer disabled:opacity-55"
                  >
                    Batal &amp; Reset
                  </button>
                  <button
                    onClick={handleSaveParsedSummary}
                    disabled={isUploading}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-55"
                  >
                    {isUploading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      <span>Terapkan Ke Database</span>
                    )}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsOpen(false)}
                  className="bg-slate-800 hover:bg-slate-750 text-slate-300 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer"
                >
                  Tutup
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
