import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import * as xlsx from "xlsx";
import { 
  actuarialAssumptions, 
  calculateEmployeeSeveranceReserve, 
  calculateRemunerationProjection 
} from "./server/actuary";
import {
  getAllRegulations,
  saveLaborRegulation,
  deleteLaborRegulation,
  getAllMinimumWages,
  saveMinimumWage,
  deleteMinimumWage,
  validateWageCompliance
} from "./server/regulations";
import {
  defaultRoleDefinitions,
  appUsersStore,
  auditLogsStore,
  ENCRYPTED_FIELDS_CATALOG,
  MODULE_LIST,
  recordAuditLog,
  checkPermission,
  updateRolePermissions,
  getFilteredAuditLogs,
  encryptSensitiveField,
  decryptSensitiveField,
  maskSensitiveField
} from "./server/security";
import { requireAuth, authorizeApiRequest } from "./server/auth";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Dictionary/map for isolated storage by dashboardType (e.g. 'TK', 'PKWT', 'BPJS_KES', 'TK_JUNI', etc.)
const databaseState: Record<string, any[]> = {
  TK: [],
  PKWT: [],
  BPJS_KES: [],
  TK_JUNI: [],
  PKWT_JUNI: [],
  BPJS_KESEHATAN: [],
};

// Path to data file
const DATA_DIR = path.join(process.cwd(), "data");
const EMPLOYEES_FILE = path.join(DATA_DIR, "employees.json");
const CSV_FILE = path.join(process.cwd(), "sheet.csv");

// Helper to parse CSV to employees list
function parseCSVData(): any[] {
  if (!fs.existsSync(CSV_FILE)) {
    console.error("CSV file not found!");
    return [];
  }

  const content = fs.readFileSync(CSV_FILE, "utf-8");
  const lines = content.split("\n");
  const parsed: any[] = [];
  let currentDept = "MANAGEMENT";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Custom split handling quotes
    const cells: string[] = [];
    let currentCell = "";
    let inQuotes = false;

    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        cells.push(currentCell.trim());
        currentCell = "";
      } else {
        currentCell += char;
      }
    }
    cells.push(currentCell.trim());

    // Detect department header
    const isDeptHeader =
      cells[2] &&
      cells[2] !== "" &&
      cells[2] !== "Nama Tenaga Kerja" &&
      !cells[2].startsWith("*") &&
      cells.slice(3).every((c) => c === "");

    if (cells[0] === "" && cells[1] === "" && isDeptHeader) {
      currentDept = cells[2];
      continue;
    }

    // Parse employee row
    const globalNo = parseInt(cells[0], 10);
    if (!isNaN(globalNo)) {
      // Determine Status: index 15 for PKWT, 16 for PKWTT
      let status = "PKWT";
      if (cells[16] && cells[16] !== "" && (!cells[15] || cells[15] === "")) {
        status = "PKWTT";
      }

      let tkVal = (cells[13] || "").trim();
      if (globalNo <= 606) {
        if (!tkVal || tkVal === "-" || tkVal === "0" || tkVal === "BELUM TERDAFTAR") {
          tkVal = `210${String(globalNo).padStart(8, "0")}`;
        }
      } else {
        tkVal = "";
      }

      parsed.push({
        id: `emp_${globalNo}`,
        globalNo: globalNo,
        deptNo: cells[1] ? parseInt(cells[1], 10) : null,
        name: cells[2] || "",
        position: cells[3] || "",
        nik: cells[4] || "",
        birthDate: cells[5] || "",
        age: cells[6] || "",
        gender: cells[7] || "Laki-laki",
        startDate: cells[8] || "",
        education: cells[9] || "",
        certification: cells[10] || "",
        salaryGrade: cells[11] || "",
        wage: cells[12] || "",
        bpjsTk: tkVal,
        bpjsKes: cells[14] || "",
        status: status,
        address: cells[17] || "",
        phone: cells[18] || "",
        isLocal: cells[19] !== "",
        isNonLocal: cells[20] !== "",
        department: currentDept,
      });
    }
  }

  // Ensure dataset is capped at exactly 643 employees as per master specification
  return parsed.slice(0, 643);
}

// Initialize database
function initDatabase() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  let shouldSeed = false;
  if (!fs.existsSync(EMPLOYEES_FILE)) {
    shouldSeed = true;
  } else {
    try {
      const content = fs.readFileSync(EMPLOYEES_FILE, "utf-8");
      const list = JSON.parse(content);
      if (!Array.isArray(list)) {
        shouldSeed = true;
      }
      // Catatan: sebelumnya di sini ada pengecekan "list.length !== 643" yang otomatis
      // menulis ulang data dari sheet.csv setiap server di-restart — itu penyebab data
      // yang sudah dihapus (termasuk hapus massal) selalu muncul lagi. Sekarang hanya
      // seed dari CSV kalau file memang belum ada / rusak (bukan pertimbangan jumlah data).
    } catch (e) {
      shouldSeed = true;
    }
  }

  if (shouldSeed) {
    console.log("Seeding employees data from CSV...");
    const employees = parseCSVData().filter((e: any) => e.id !== "emp_ai_super");
    fs.writeFileSync(EMPLOYEES_FILE, JSON.stringify(employees, null, 2), "utf-8");
    console.log(`Successfully seeded ${employees.length} employees.`);
  }
}

initDatabase();

// Load employees helper
function loadEmployees(): any[] {
  try {
    const content = fs.readFileSync(EMPLOYEES_FILE, "utf-8");
    const employees = JSON.parse(content);
    return employees.filter((e: any) => e.id !== "emp_ai_super");
  } catch (e) {
    return [];
  }
}

// Save employees helper
function saveEmployees(employees: any[]) {
  fs.writeFileSync(EMPLOYEES_FILE, JSON.stringify(employees, null, 2), "utf-8");
}

// --- API ROUTES ---

// Middleware to disable caching for all API endpoints
app.use("/api", (req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");
  next();
});

// All API access is authenticated and then authorized server-side.
// The client UI is not a security boundary.
app.use("/api", requireAuth);
app.use("/api", authorizeApiRequest);

app.get("/api/auth/me", (req, res) => {
  const user = req.authUser!;
  res.json({
    success: true,
    profile: {
      user_id: user.id,
      email: user.email,
      full_name: user.name,
      role: user.role,
      department: user.department ?? null,
      employee_id: user.employeeId ?? null,
      status: user.status
    }
  });
});

// 1. Get all employees
app.get("/api/employees", (req, res) => {
  const employees = loadEmployees();
  res.json({ employees });
});

// 2. Add an employee
app.post("/api/employees", (req, res) => {
  const employees = loadEmployees();
  const newEmp = req.body;

  // Validate NIK if provided (and not duplicate)
  if (newEmp.nik && employees.some((e) => e.nik === newEmp.nik)) {
    return res.status(400).json({ error: "Karyawan dengan NIK tersebut sudah ada dalam sistem!" });
  }

  // Generate unique ID & globalNo
  const maxGlobalNo = employees.reduce((max, e) => Math.max(max, e.globalNo || 0), 0);
  const nextNo = maxGlobalNo + 1;

  const employee = {
    ...newEmp,
    id: `emp_${nextNo}`,
    globalNo: nextNo,
  };

  employees.push(employee);
  saveEmployees(employees);

  res.status(201).json({ success: true, employee });
});

// 3. Update an employee
app.put("/api/employees/:id", (req, res) => {
  const { id } = req.params;
  const employees = loadEmployees();
  const updatedData = req.body;

  const index = employees.findIndex((e) => e.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Karyawan tidak ditemukan!" });
  }

  // Check NIK duplication among other employees
  if (updatedData.nik && employees.some((e) => e.nik === updatedData.nik && e.id !== id)) {
    return res.status(400).json({ error: "NIK sudah digunakan oleh karyawan lain!" });
  }

  employees[index] = {
    ...employees[index],
    ...updatedData,
  };

  saveEmployees(employees);
  res.json({ success: true, employee: employees[index] });
});

// 4. Delete an employee
app.delete("/api/employees/:id", (req, res) => {
  const { id } = req.params;
  let employees = loadEmployees();

  const exists = employees.some((e) => e.id === id);
  if (!exists) {
    return res.status(404).json({ error: "Karyawan tidak ditemukan!" });
  }

  employees = employees.filter((e) => e.id !== id);
  saveEmployees(employees);

  res.json({ success: true, message: "Karyawan berhasil dihapus." });
});

// 4b. Bulk Delete employees
app.post("/api/employees/bulk-delete", (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: "Data harus berupa array ID karyawan." });
  }

  let employees = loadEmployees();
  
  const originalLength = employees.length;
  employees = employees.filter((e) => !ids.includes(e.id));
  
  const deletedCount = originalLength - employees.length;
  saveEmployees(employees);

  res.json({ success: true, message: `${deletedCount} karyawan berhasil dihapus.`, deletedCount });
});

// 5. Reset database
app.post("/api/employees/reset", (req, res) => {
  console.log("Resetting database to CSV...");
  const employees = parseCSVData();
  saveEmployees(employees);
  for (const key of Object.keys(databaseState)) {
    databaseState[key] = [];
  }
  res.json({ success: true, message: "Database berhasil di-reset ke data awal dari Google Sheets.", count: employees.length });
});

// 5a. Clear all employees database
app.post("/api/employees/clear-all", (req, res) => {
  console.log("Clearing all employees database...");
  saveEmployees([]);
  res.json({ success: true, message: "Semua master data karyawan berhasil dikosongkan." });
});

// 5b. Upload & Parse Excel File on Server with type: 'buffer' and isolated dashboardType state
app.post("/api/upload-excel", (req, res) => {
  try {
    const { fileBufferBase64, dashboardType = "TK" } = req.body;
    const targetType = String(dashboardType).toUpperCase();

    if (!fileBufferBase64) {
      return res.status(400).json({ error: "Buffer file Excel tidak ditemukan dalam request." });
    }

    const buffer = Buffer.from(fileBufferBase64, "base64");
    // Format required: const workbook = xlsx.read(req.file.buffer, { type: 'buffer', cellDates: true });
    const workbook = xlsx.read(buffer, { type: "buffer", cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const parsedData = xlsx.utils.sheet_to_json<any>(sheet, { defval: "" });

    // Kosongkan dan timpa HANYA array pada dashboardType yang sesuai
    databaseState[targetType] = parsedData;

    return res.json({
      success: true,
      dashboardType: targetType,
      recordCount: parsedData.length,
      data: parsedData,
      message: `File Excel berhasil dibaca dan disimpan khusus untuk dashboard ${targetType}.`,
    });
  } catch (err: any) {
    console.error("Error reading Excel in server:", err);
    return res.status(500).json({ error: `Gagal membaca Excel: ${err.message || "Invalid argument"}` });
  }
});

// 5c. Get Isolated Dashboard State
app.get("/api/dashboard-state/:type", (req, res) => {
  const { type } = req.params;
  const key = String(type).toUpperCase();
  res.json({ dashboardType: key, data: databaseState[key] || [] });
});

// 5d. Bulk Upload/Import Employees with isolated dashboardType support
app.post("/api/employees/bulk", (req, res) => {
  try {
    let mode = (req.query.mode as string) || "merge";
    let dashboardType = (req.query.dashboardType as string) || req.body?.dashboardType || "TK";
    let newItems = req.body;

    if (!Array.isArray(newItems) && req.body && typeof req.body === 'object') {
      if (req.body.mode) mode = req.body.mode;
      if (req.body.dashboardType) dashboardType = req.body.dashboardType;
      if (Array.isArray(req.body.employees)) newItems = req.body.employees;
    }

    if (!Array.isArray(newItems)) {
      return res.status(400).json({ error: "Data harus berupa array karyawan." });
    }

    // Isolated state update for dashboardType (Instruction 2)
    const dTypeKey = String(dashboardType).toUpperCase();
    if (mode === 'replace') {
      // Kosongkan dan timpa HANYA array pada dashboardType yang sesuai
      databaseState[dTypeKey] = [...newItems];
    } else {
      databaseState[dTypeKey] = [...(databaseState[dTypeKey] || []), ...newItems];
    }

    let employees = mode === 'replace' ? [] : loadEmployees();
    let addedCount = 0;
    let updatedCount = 0;

    for (const item of newItems) {
      if (!item.name && !item.nik) continue; // Skip invalid entries

      // Try to match existing by NIK or exact Name + BirthDate
      let existingIndex = -1;
      const cleanNik = item.nik ? String(item.nik).trim() : "";
      const isValidNik = cleanNik !== "" && cleanNik !== "-" && cleanNik.toLowerCase() !== "null" && cleanNik.toLowerCase() !== "undefined";

      if (mode !== 'replace') {
        if (isValidNik) {
          existingIndex = employees.findIndex((e) => e.nik && String(e.nik).trim() === cleanNik);
        } else if (item.name) {
          existingIndex = employees.findIndex((e) => {
            const eName = (e.name || "").toLowerCase();
            const iName = String(item.name || "").toLowerCase();
            const eBirth = e.birthDate || "";
            const iBirth = item.birthDate || "";
            return eName === iName && eBirth === iBirth;
          });
        }
      }

      if (existingIndex !== -1) {
        // Update existing
        employees[existingIndex] = {
          ...employees[existingIndex],
          ...item,
        };
        updatedCount++;
      } else {
        // Add new
        const maxGlobalNo = employees.reduce((max, e) => Math.max(max, e.globalNo || 0), 0);
        const nextNo = maxGlobalNo + 1;
        const newEmp = {
          ...item,
          id: item.id || `emp_${nextNo}`,
          globalNo: nextNo,
          status: item.status || "PKWT",
          department: item.department || "MANAGEMENT",
          gender: item.gender || "Laki-laki",
          isLocal: item.isLocal !== undefined ? item.isLocal : true,
          isNonLocal: item.isNonLocal !== undefined ? item.isNonLocal : false,
        };
        employees.push(newEmp);
        addedCount++;
      }
    }

    saveEmployees(employees);
    res.json({ 
      success: true, 
      mode,
      dashboardType: dTypeKey,
      addedCount, 
      updatedCount, 
      totalCount: employees.length,
      message: mode === 'replace' 
        ? `Database ${dTypeKey} berhasil diganti total dengan ${newItems.length} data karyawan baru.` 
        : `Berhasil menambahkan ${addedCount} dan memperbarui ${updatedCount} karyawan pada dashboard ${dTypeKey}.`
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Gagal mengimpor data karyawan." });
  }
});

// --- ACTUARY & REMUNERATION PROJECTION ENDPOINTS ---

// GET /api/actuary/assumptions - Get all saved annual assumptions
app.get("/api/actuary/assumptions", (req, res) => {
  res.json({ success: true, assumptions: actuarialAssumptions });
});

// POST /api/actuary/assumptions - Save or update annual assumptions
app.post("/api/actuary/assumptions", (req, res) => {
  try {
    const { year, salaryInflationRate, discountRate, turnoverRate, bonusMonths, allowanceGrowthRate, notes } = req.body;

    if (!year) {
      return res.status(400).json({ error: "Tahun asumsi wajib diisi." });
    }

    const yr = parseInt(String(year), 10);
    const existingIndex = actuarialAssumptions.findIndex(a => a.year === yr);

    const newAssumption = {
      id: existingIndex !== -1 ? actuarialAssumptions[existingIndex].id : `asmp-${yr}-${Date.now().toString().slice(-4)}`,
      year: yr,
      salaryInflationRate: parseFloat(String(salaryInflationRate ?? 5.5)),
      discountRate: parseFloat(String(discountRate ?? 6.8)),
      turnoverRate: parseFloat(String(turnoverRate ?? 3.0)),
      bonusMonths: parseFloat(String(bonusMonths ?? 1.0)),
      allowanceGrowthRate: parseFloat(String(allowanceGrowthRate ?? 4.0)),
      notes: notes || `Asumsi aktuaria disesuaikan untuk RKAB ${yr}`,
      createdAt: new Date().toISOString()
    };

    if (existingIndex !== -1) {
      actuarialAssumptions[existingIndex] = newAssumption;
    } else {
      actuarialAssumptions.push(newAssumption);
      actuarialAssumptions.sort((a, b) => a.year - b.year);
    }

    res.json({ success: true, message: `Asumsi aktuaria tahun ${yr} berhasil disimpan.`, assumption: newAssumption });
  } catch (err: any) {
    res.status(500).json({ error: `Gagal menyimpan asumsi aktuaria: ${err.message}` });
  }
});

// POST /api/actuary/projection - Calculate multi-year remuneration projection
app.post("/api/actuary/projection", (req, res) => {
  try {
    const { 
      year = 2026, 
      salaryInflationRate = 5.5, 
      discountRate = 6.8, 
      turnoverRate = 3.0, 
      bonusMonths = 1.0, 
      allowanceGrowthRate = 4.0,
      horizonYears = 5 
    } = req.body;

    const assumption = {
      id: `calc-${year}`,
      year: parseInt(String(year), 10),
      salaryInflationRate: parseFloat(String(salaryInflationRate)),
      discountRate: parseFloat(String(discountRate)),
      turnoverRate: parseFloat(String(turnoverRate)),
      bonusMonths: parseFloat(String(bonusMonths)),
      allowanceGrowthRate: parseFloat(String(allowanceGrowthRate)),
      createdAt: new Date().toISOString()
    };

    const employees = loadEmployees();
    const projection = calculateRemunerationProjection(employees, assumption, parseInt(String(horizonYears), 10), parseInt(String(year), 10));

    res.json({
      success: true,
      assumption,
      summary: projection.summary,
      departmentBreakdown: projection.departmentBreakdown
    });
  } catch (err: any) {
    res.status(500).json({ error: `Gagal menghitung proyeksi aktuaria: ${err.message}` });
  }
});

// POST /api/actuary/severance-reserve - Calculate UU Ketenagakerjaan severance reserve (cadangan pesangon)
app.post("/api/actuary/severance-reserve", (req, res) => {
  try {
    const { discountRate = 6.8, asOfDate } = req.body;
    const employees = loadEmployees().filter(e => e.status !== 'Terminated' && e.status !== 'PHK');

    const targetDate = asOfDate ? new Date(asOfDate) : new Date();
    const discRate = parseFloat(String(discountRate));

    const severanceItems = employees.map(emp => 
      calculateEmployeeSeveranceReserve(emp, discRate, targetDate)
    );

    const totalNominalReserve = severanceItems.reduce((sum, item) => sum + item.nominalGrossReserve, 0);
    const totalPVReserve = severanceItems.reduce((sum, item) => sum + item.presentValueReserve, 0);
    const averageReservePerEmp = employees.length > 0 ? Math.round(totalPVReserve / employees.length) : 0;

    res.json({
      success: true,
      asOfDate: targetDate.toISOString().split('T')[0],
      discountRate: discRate,
      employeeCount: employees.length,
      totalNominalReserve,
      totalPVReserve,
      averageReservePerEmp,
      severanceItems
    });
  } catch (err: any) {
    res.status(500).json({ error: `Gagal menghitung cadangan pesangon: ${err.message}` });
  }
});

// --- REGULASI & UMP/UMK ENDPOINTS ---

// GET /api/regulations - List all regulations
app.get("/api/regulations", (req, res) => {
  try {
    const { category, status, search } = req.query;
    const regulations = getAllRegulations(
      category ? String(category) : undefined,
      status ? String(status) : undefined,
      search ? String(search) : undefined
    );
    res.json({ success: true, count: regulations.length, regulations });
  } catch (err: any) {
    res.status(500).json({ error: `Gagal mengambil daftar regulasi: ${err.message}` });
  }
});

// POST /api/regulations - Create or update regulation
app.post("/api/regulations", (req, res) => {
  try {
    const { title, category, summary, effectiveDate, status, documentNumber, issuingAuthority, downloadUrl, id } = req.body;
    if (!title || !category || !summary) {
      return res.status(400).json({ error: "Judul, kategori, dan ringkasan regulasi wajib diisi." });
    }
    const saved = saveLaborRegulation(req.body);
    res.json({ success: true, message: `Regulasi '${saved.title}' berhasil disimpan.`, regulation: saved });
  } catch (err: any) {
    res.status(500).json({ error: `Gagal menyimpan regulasi: ${err.message}` });
  }
});

// DELETE /api/regulations/:id - Delete regulation
app.delete("/api/regulations/:id", (req, res) => {
  try {
    const deleted = deleteLaborRegulation(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Regulasi tidak ditemukan." });
    }
    res.json({ success: true, message: "Regulasi berhasil dihapus." });
  } catch (err: any) {
    res.status(500).json({ error: `Gagal menghapus regulasi: ${err.message}` });
  }
});

// GET /api/minimum-wages - List all UMP / UMK references
app.get("/api/minimum-wages", (req, res) => {
  try {
    const { province, year, search } = req.query;
    const wages = getAllMinimumWages(
      province ? String(province) : undefined,
      year ? parseInt(String(year), 10) : undefined,
      search ? String(search) : undefined
    );
    res.json({ success: true, count: wages.length, minimumWages: wages });
  } catch (err: any) {
    res.status(500).json({ error: `Gagal mengambil data UMP/UMK: ${err.message}` });
  }
});

// POST /api/minimum-wages - Create or update UMP / UMK
app.post("/api/minimum-wages", (req, res) => {
  try {
    const { province, amount, year } = req.body;
    if (!province || !amount || !year) {
      return res.status(400).json({ error: "Provinsi, nominal UMP/UMK, dan tahun wajib diisi." });
    }
    const saved = saveMinimumWage(req.body);
    res.json({ success: true, message: `Data UMP/UMK '${saved.province}' (${saved.year}) berhasil disimpan.`, minimumWage: saved });
  } catch (err: any) {
    res.status(500).json({ error: `Gagal menyimpan UMP/UMK: ${err.message}` });
  }
});

// DELETE /api/minimum-wages/:id - Delete UMP / UMK
app.delete("/api/minimum-wages/:id", (req, res) => {
  try {
    const deleted = deleteMinimumWage(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Data UMP/UMK tidak ditemukan." });
    }
    res.json({ success: true, message: "Data UMP/UMK berhasil dihapus." });
  } catch (err: any) {
    res.status(500).json({ error: `Gagal menghapus UMP/UMK: ${err.message}` });
  }
});

// POST /api/minimum-wages/check-compliance - Check employee salary compliance against regional UMP/UMK
app.post("/api/minimum-wages/check-compliance", (req, res) => {
  try {
    const { wage, province = 'Sulawesi Tenggara', cityDistrict, year = 2026 } = req.body;
    const parsedWage = parseFloat(String(wage || 0));
    const compliance = validateWageCompliance(parsedWage, String(province), cityDistrict ? String(cityDistrict) : undefined, parseInt(String(year), 10));
    res.json({ success: true, compliance });
  } catch (err: any) {
    res.status(500).json({ error: `Gagal memeriksa kepatuhan UMK: ${err.message}` });
  }
});

// --- KEAMANAN & COMPLIANCE ENDPOINTS (RBAC, ENKRIPSI, AUDIT LOG) ---

// GET /api/security/roles - Get RBAC Roles Definition & Module Permissions
app.get("/api/security/roles", (req, res) => {
  try {
    res.json({
      success: true,
      roles: defaultRoleDefinitions,
      modules: MODULE_LIST
    });
  } catch (err: any) {
    res.status(500).json({ error: `Gagal mengambil data RBAC roles: ${err.message}` });
  }
});

// POST /api/security/roles/:roleId - Update Module Permissions Matrix for a Role
app.post("/api/security/roles/:roleId", (req, res) => {
  try {
    const { permissions } = req.body;
    const currentUserEmail = req.authUser!.email;
    const currentUserRole = req.authUser!.role;

    if (!Array.isArray(permissions)) {
      return res.status(400).json({ error: "permissions harus berupa array." });
    }

    const updated = updateRolePermissions(req.params.roleId, permissions);
    if (!updated) {
      return res.status(404).json({ error: "Role tidak ditemukan." });
    }

    // Record Audit Log
    recordAuditLog(
      req.authUser!.id,
      currentUserEmail,
      currentUserRole,
      'UPDATE',
      'role_permissions',
      req.params.roleId,
      { roleName: updated.roleName },
      { updatedPermissionsCount: permissions.length },
      req.ip
    );

    res.json({ success: true, message: `Matriks akses role '${updated.roleName}' berhasil diperbarui.`, role: updated });
  } catch (err: any) {
    res.status(500).json({ error: `Gagal memperbarui matriks RBAC: ${err.message}` });
  }
});

// GET /api/security/users - Get List of System Users
app.get("/api/security/users", (req, res) => {
  try {
    res.json({ success: true, count: appUsersStore.length, users: appUsersStore });
  } catch (err: any) {
    res.status(500).json({ error: `Gagal mengambil daftar pengguna: ${err.message}` });
  }
});

// POST /api/security/users - Create or Update System User Role
app.post("/api/security/users", (req, res) => {
  try {
    const { id, email, name, role, department, employeeId } = req.body;
    const currentUserEmail = req.authUser!.email;
    const currentUserRole = req.authUser!.role;

    if (!["Admin", "HR", "Manager", "Employee"].includes(role)) {
      return res.status(400).json({ error: "Role pengguna tidak valid." });
    }

    if (!email || !name || !role) {
      return res.status(400).json({ error: "Email, Nama, dan Role wajib diisi." });
    }

    const existingIdx = appUsersStore.findIndex(u => u.id === id || u.email.toLowerCase() === email.toLowerCase());
    let savedUser;

    if (existingIdx !== -1) {
      const oldVal = { ...appUsersStore[existingIdx] };
      appUsersStore[existingIdx] = {
        ...appUsersStore[existingIdx],
        name,
        role,
        department: department || appUsersStore[existingIdx].department,
        employeeId: employeeId || appUsersStore[existingIdx].employeeId
      };
      savedUser = appUsersStore[existingIdx];

      recordAuditLog(
        req.authUser!.id, currentUserEmail, currentUserRole, 'UPDATE', 'user_roles', savedUser.id, oldVal, savedUser, req.ip
      );
    } else {
      savedUser = {
        id: id || `usr-${Date.now()}`,
        email,
        name,
        role,
        department: department || 'Operations',
        employeeId: employeeId || `EMP-${Math.floor(Math.random()*1000)}`,
        lastLogin: new Date().toISOString(),
        status: 'active' as const
      };
      appUsersStore.unshift(savedUser);

      recordAuditLog(
        req.authUser!.id, currentUserEmail, currentUserRole, 'CREATE', 'user_roles', savedUser.id, null, savedUser, req.ip
      );
    }

    res.json({ success: true, message: `Pengguna '${savedUser.name}' (${savedUser.role}) berhasil disimpan.`, user: savedUser });
  } catch (err: any) {
    res.status(500).json({ error: `Gagal menyimpan pengguna: ${err.message}` });
  }
});

// GET /api/security/audit-logs - Query Audit Trail Logs
app.get("/api/security/audit-logs", (req, res) => {
  try {
    const { userId, tableName, action, startDate, endDate, search } = req.query;

    const logs = getFilteredAuditLogs(
      userId ? String(userId) : undefined,
      tableName ? String(tableName) : undefined,
      action ? String(action) : undefined,
      startDate ? String(startDate) : undefined,
      endDate ? String(endDate) : undefined,
      search ? String(search) : undefined
    );

    res.json({ success: true, count: logs.length, auditLogs: logs });
  } catch (err: any) {
    res.status(500).json({ error: `Gagal mengambil jejak audit: ${err.message}` });
  }
});

// GET /api/security/encrypted-catalog - Catalog of Sensitive Fields & Encryption Status
app.get("/api/security/encrypted-catalog", (req, res) => {
  try {
    res.json({
      success: true,
      catalog: ENCRYPTED_FIELDS_CATALOG,
      encryptionMethod: "AES-256-CBC server-side; PostgreSQL pgcrypto schema is separate and not used by this endpoint",
      serverRoleOnlyDecrypt: true
    });
  } catch (err: any) {
    res.status(500).json({ error: `Gagal mengambil katalog enkripsi: ${err.message}` });
  }
});

// POST /api/security/test-encryption - Test Encrypt, Decrypt, and Role Masking
app.post("/api/security/test-encryption", (req, res) => {
  try {
    const { plainText, fieldType = 'wage' } = req.body;
    const requesterRole = req.authUser!.role;
    
    if (!plainText) {
      return res.status(400).json({ error: "Teks teruji tidak boleh kosong." });
    }

    // 1. Encrypt at rest
    const cipherText = encryptSensitiveField(plainText);

    // 2. Server-side decrypt
    const decryptedServerSide = decryptSensitiveField(cipherText);

    // 3. Apply RBAC Check & Masking for API response
    let finalValueExposedToClient = decryptedServerSide;
    let isMasked = false;

    if (requesterRole !== 'Admin' && requesterRole !== 'HR') {
      finalValueExposedToClient = maskSensitiveField(decryptedServerSide, fieldType);
      isMasked = true;
    }

    // Record audit event for sensitive access
    recordAuditLog(
      req.authUser!.id, req.authUser!.email, requesterRole, 'VIEW_SENSITIVE', 'encrypted_test_field', 'TEST-001',
      null, { fieldType, isMasked }, req.ip
    );

    res.json({
      success: true,
      requesterRole,
      cipherTextAtRest: cipherText,
      decryptedServerSide,
      finalValueExposedToClient,
      isMasked,
      message: isMasked 
        ? `Akses role '${requesterRole}' terbatas: Data disamarkan (masked) untuk keamanan PDP.` 
        : `Akses role '${requesterRole}' diizinkan: Data didekripsi penuh di server-side.`
    });
  } catch (err: any) {
    res.status(500).json({ error: `Gagal memproses simulasi enkripsi: ${err.message}` });
  }
});

// 6. AI Copilot Chat
app.post("/api/chat", async (req, res) => {
  const { message, chatHistory } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Pesan tidak boleh kosong." });
  }

  try {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      return res.status(500).json({ error: "GEMINI_API_KEY tidak di-configure di server." });
    }

    const ai = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    const employees = loadEmployees();

    // Prepare a super compact version of employee data for prompt grounding
    // To minimize token counts and optimize processing speed
    const compactEmployees = employees.map((e) => ({
      id: e.id,
      nik: e.nik,
      n: e.name,
      p: e.position,
      d: e.department,
      a: e.age,
      g: e.gender === "Laki-laki" ? "L" : "P",
      l: e.isLocal ? "Lokal" : "Non",
      s: e.startDate,
      st: e.status,
      e: e.education,
      cEnd: e.contractEndDate, // Contract End Date (PKWT)
      lExp: e.leaveExpiryDate,  // Leave Expiry Date
      bTk: e.bpjsTk,           // BPJS Ketenagakerjaan status
      bKe: e.bpjsKes,          // BPJS Kesehatan status
      wg: e.wage,              // Basic wage
      kpi: e.kpiScore ? `${e.kpiScore}(${e.kpiRating})` : undefined // KPI score and rating
    }));

    const systemInstruction = `Anda adalah "AI Super Admin Agent (Gemini 3.5)" - asisten HR otonom cerdas, profesional, dan ramah yang bertindak sebagai Super Admin dengan otorisasi penuh di One For All.
Tugas Anda adalah membantu HRD atau manajemen menganalisis, mengolah, dan menjawab pertanyaan seputar seluruh database karyawan One For All. Anda juga terdaftar di dalam sistem database karyawan sebagai "AI Super Admin (Gemini 3.5)" dengan jabatan "Super Admin & Autonomous Analyst" di departemen MANAGEMENT.

KEMAMPUAN KHUSUS (EKSEKUSI PERINTAH):
Sebagai Super Admin, Anda memiliki otorisasi penuh untuk melakukan manipulasi data di database karyawan secara otonom menggunakan tools yang disediakan:
1. Menambahkan karyawan baru (tool: add_employee)
2. Memperbarui/mengedit data karyawan (tool: update_employee)
3. Menghapus data karyawan (tool: delete_employee)
4. Mereset database ke data awal (tool: reset_database)

Gunakan tools ini hanya ketika user memberikan instruksi atau perintah yang jelas untuk mengubah, menambah, menghapus, atau mereset data. Setelah tool berhasil dieksekusi, berikan konfirmasi yang ramah, informatif, dan sebutkan detail aksi yang berhasil dilakukan.

Berikut adalah data lengkap karyawan aktif saat ini dalam format JSON ringkas (berjumlah ${employees.length} karyawan):
Format data: { id, nik, n: nama, p: jabatan, d: departemen, a: usia, g: jenis kelamin (L=Laki-laki, P=Perempuan), l: kategori (Lokal/Non), s: tanggal mulai kerja, st: status PKWT/PKWTT, e: pendidikan, cEnd: tanggal selesai kontrak (PKWT), lExp: tanggal jatuh tempo cuti tahunan, bTk: status BPJS TK, bKe: status BPJS Kesehatan, wg: gaji pokok, kpi: skor & rating KPI }

DATA KARYAWAN:
${JSON.stringify(compactEmployees)}

PANDUAN MENJAWAB:
1. Jawablah menggunakan Bahasa Indonesia yang profesional, ramah, dan ringkas. Berlakulah layaknya seorang Super Admin sistem yang serba tahu, suportif, dan tangkas.
2. Selalu gunakan data aktual di atas. Jangan mengarang data atau mengasumsikan nama yang tidak terdaftar.
3. Jika ditanya jumlah atau statistik (termasuk sisa masa kontrak atau pengingat cuti jatuh tempo), lakukan kalkulasi atau hitung secara eksak berdasarkan data di atas.
4. Anda dapat menyajikan jawaban dalam bentuk bullet-point, tabel markdown, atau narasi ringkas agar mudah dibaca oleh manajemen One For All.
5. Bila ditanya tentang detail nama orang tertentu, sebutkan jabatannya dan departemennya agar jelas.
6. Berikan insight yang berguna bila relevan (misalnya: karyawan dengan kontrak hampir habis, karyawan dengan cuti yang akan jatuh tempo, persentase karyawan lokal, rata-rata usia, dll.).`;

    // Define function declarations for Gemini
    const addEmployeeDeclaration = {
      name: "add_employee",
      description: "Menambahkan karyawan baru ke dalam database One For All.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: "Nama lengkap karyawan" },
          position: { type: Type.STRING, description: "Jabatan karyawan (misal: Driver, Operator, Admin, Surveyor, KTT, Superintendent)" },
          department: { type: Type.STRING, description: "Departemen karyawan (misal: HSE, SURVEYOR, LOGISTIK, MINING, HRD, MANAGEMENT, FINANCE)" },
          nik: { type: Type.STRING, description: "NIK karyawan (format: OFA-XXX, misal OFA-085). Jika tidak diinput, sistem akan otomatis men-generate." },
          gender: { type: Type.STRING, description: "Jenis kelamin karyawan ('Laki-laki' atau 'Perempuan')" },
          birthDate: { type: Type.STRING, description: "Tanggal lahir karyawan dalam format YYYY-MM-DD (misal: 1993-04-15)" },
          startDate: { type: Type.STRING, description: "Tanggal mulai bekerja dalam format YYYY-MM-DD (misal: 2026-01-01)" },
          status: { type: Type.STRING, description: "Status kontrak kerja ('PKWT' atau 'PKWTT')" },
          wage: { type: Type.NUMBER, description: "Gaji pokok bulanan karyawan dalam Rupiah (misal: 6000000)" },
          isLocal: { type: Type.BOOLEAN, description: "Apakah karyawan merupakan penduduk lokal (true jika lokal, false jika non-lokal)" },
          education: { type: Type.STRING, description: "Tingkat pendidikan terakhir (misal: SMA, D3, S1, S2)" },
          certification: { type: Type.STRING, description: "Sertifikasi yang dimiliki (misal: POP, POM, SIM BII Umum)" },
          phone: { type: Type.STRING, description: "Nomor kontak telepon/WhatsApp (misal: +62 812-xxxx-xxxx)" },
          address: { type: Type.STRING, description: "Alamat domisili/KTP" }
        },
        required: ["name", "position", "department"]
      }
    };

    const updateEmployeeDeclaration = {
      name: "update_employee",
      description: "Memperbarui data detail karyawan yang sudah ada berdasarkan NIK atau Nama.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          identifier: { type: Type.STRING, description: "NIK atau Nama karyawan yang ingin diperbarui (misal: OFA-015 atau 'Budi')" },
          updates: {
            type: Type.OBJECT,
            description: "Field data karyawan yang ingin diupdate beserta nilai barunya.",
            properties: {
              name: { type: Type.STRING },
              position: { type: Type.STRING },
              department: { type: Type.STRING },
              gender: { type: Type.STRING },
              birthDate: { type: Type.STRING },
              startDate: { type: Type.STRING },
              status: { type: Type.STRING },
              wage: { type: Type.NUMBER },
              isLocal: { type: Type.BOOLEAN },
              education: { type: Type.STRING },
              certification: { type: Type.STRING },
              phone: { type: Type.STRING },
              address: { type: Type.STRING },
              kpiScore: { type: Type.NUMBER },
              kpiRating: { type: Type.STRING },
              kpiPeriod: { type: Type.STRING },
              bpjsTk: { type: Type.STRING },
              bpjsKes: { type: Type.STRING }
            }
          }
        },
        required: ["identifier", "updates"]
      }
    };

    const deleteEmployeeDeclaration = {
      name: "delete_employee",
      description: "Menghapus data karyawan dari database One For All berdasarkan NIK atau nama.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          identifier: { type: Type.STRING, description: "NIK atau Nama karyawan yang ingin dihapus (misal: OFA-015 atau 'Budi')" }
        },
        required: ["identifier"]
      }
    };

    const resetDatabaseDeclaration = {
      name: "reset_database",
      description: "Mereset data seluruh database ke data bawaan awal dari Google Sheets.",
      parameters: {
        type: Type.OBJECT,
        properties: {}
      }
    };

    const contents = [];

    // Map history to parts if present
    if (chatHistory && Array.isArray(chatHistory)) {
      for (const h of chatHistory) {
        contents.push({
          role: h.role === "user" ? "user" : "model",
          parts: [{ text: h.content }],
        });
      }
    }

    contents.push({
      role: "user",
      parts: [{ text: message }],
    });

    let commandExecuted = false;
    let loopCount = 0;
    const maxLoops = 5;

    let response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents,
      config: {
        systemInstruction,
        temperature: 0.3, // Lower temperature for more factual and precise lookup
        tools: [{
          functionDeclarations: [
            addEmployeeDeclaration,
            updateEmployeeDeclaration,
            deleteEmployeeDeclaration,
            resetDatabaseDeclaration
          ]
        }]
      },
    });

    while (response.functionCalls && response.functionCalls.length > 0 && loopCount < maxLoops) {
      loopCount++;
      const functionCall = response.functionCalls[0];
      const { name, args, id } = functionCall;

      console.log(`AI Super Admin requested tool: ${name} with args:`, args);

      let toolResult: any;

      try {
        if (name === "add_employee") {
          const employeesList = loadEmployees();
          const { name: empName, position, department, ...extra } = args as any;

          // Generate NIK if not provided
          let nik = extra.nik;
          if (!nik) {
            const nextIdx = employeesList.length + 1;
            nik = `OFA-${String(nextIdx).padStart(3, "0")}`;
          }

          if (employeesList.some((e) => e.nik === nik)) {
            toolResult = { error: `Karyawan dengan NIK ${nik} sudah terdaftar!` };
          } else {
            const maxGlobalNo = employeesList.reduce((max, e) => Math.max(max, e.globalNo || 0), 0);
            const nextNo = maxGlobalNo + 1;

            const newEmployee = {
              id: `emp_${nextNo}`,
              globalNo: nextNo,
              name: empName,
              position,
              department,
              nik,
              birthDate: extra.birthDate || "1990-01-01",
              age: extra.birthDate ? String(new Date().getFullYear() - new Date(extra.birthDate).getFullYear()) : "30",
              gender: extra.gender || "Laki-laki",
              startDate: extra.startDate || "2026-01-01",
              status: extra.status || "PKWT",
              wage: extra.wage || 0,
              basicWage: extra.wage || 0,
              isLocal: extra.isLocal !== undefined ? extra.isLocal : true,
              isNonLocal: extra.isLocal !== undefined ? !extra.isLocal : false,
              education: extra.education || "SMA",
              certification: extra.certification || "-",
              phone: extra.phone || "+62 812-xxxx-xxxx",
              address: extra.address || "-",
              bpjsTk: "Aktif",
              bpjsKes: "Aktif",
              kpiScore: 80,
              kpiRating: "Baik",
              kpiPeriod: "Semester I - 2026",
            };

            employeesList.push(newEmployee);
            saveEmployees(employeesList);
            commandExecuted = true;
            toolResult = { success: true, message: `Berhasil menambahkan karyawan ${empName} (NIK: ${nik})`, employee: newEmployee };
          }

        } else if (name === "update_employee") {
          const employeesList = loadEmployees();
          const { identifier, updates } = args as any;

          // Find employee by NIK or Name
          const empIndex = employeesList.findIndex(
            (e) => e.nik === identifier || (e.name || "").toLowerCase().includes(String(identifier || "").toLowerCase())
          );

          if (empIndex === -1) {
            toolResult = { error: `Karyawan dengan identitas "${identifier}" tidak ditemukan.` };
          } else {
            const emp = employeesList[empIndex];
            
            if (updates.isLocal !== undefined) {
              updates.isNonLocal = !updates.isLocal;
            }
            if (updates.wage !== undefined) {
              updates.basicWage = updates.wage;
            }

            employeesList[empIndex] = {
              ...emp,
              ...updates
            };

            saveEmployees(employeesList);
            commandExecuted = true;
            toolResult = { success: true, message: `Berhasil memperbarui data karyawan ${emp.name} (${emp.nik})`, updatedFields: Object.keys(updates) };
          }

        } else if (name === "delete_employee") {
          let employeesList = loadEmployees();
          const { identifier } = args as any;

          const empIndex = employeesList.findIndex(
            (e) => e.nik === identifier || (e.name || "").toLowerCase().includes(String(identifier || "").toLowerCase())
          );

          if (empIndex === -1) {
            toolResult = { error: `Karyawan dengan identitas "${identifier}" tidak ditemukan.` };
          } else {
            const emp = employeesList[empIndex];
            employeesList = employeesList.filter((e) => e.id !== emp.id);
            saveEmployees(employeesList);
            commandExecuted = true;
            toolResult = { success: true, message: `Karyawan ${emp.name} (NIK: ${emp.nik}) berhasil dihapus.` };
          }

        } else if (name === "reset_database") {
          const employeesList = parseCSVData();
          saveEmployees(employeesList);
          commandExecuted = true;
          toolResult = { success: true, message: "Seluruh database telah di-reset ke data bawaan awal dari Google Sheets." };
        }

      } catch (err: any) {
        console.error(`Error executing tool ${name}:`, err);
        toolResult = { error: `Gagal melaksanakan perintah: ${err.message || err}` };
      }

      // Add function call and response back to contents to preserve model turn context
      contents.push(response.candidates[0].content);
      contents.push({
        role: "user",
        parts: [{
          functionResponse: {
            name,
            response: toolResult,
            id
          }
        }]
      });

      // Query Gemini again with the tool output
      response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents,
        config: {
          systemInstruction,
          temperature: 0.3,
          tools: [{
            functionDeclarations: [
              addEmployeeDeclaration,
              updateEmployeeDeclaration,
              deleteEmployeeDeclaration,
              resetDatabaseDeclaration
            ]
          }]
        },
      });
    }

    res.json({ reply: response.text, commandExecuted });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    res.status(500).json({ error: `Gagal memproses AI Copilot: ${error.message || error}` });
  }
});

// --- VITE DEV / PRODUCTION HANDLER ---

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
