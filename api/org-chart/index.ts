import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../_supabase.js';
import { requirePermission } from '../_auth';
import { requirePermission } from '../_auth';

interface EmployeeRaw {
  id: string;
  global_no?: number;
  nik?: string;
  name: string;
  position: string;
  department: string;
  phone?: string;
  status?: string;
  reports_to_id?: string | null;
  reports_to_name?: string | null;
  job_grade_level?: number | null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const ctx = await requirePermission(req, res, 'orgstructure', req.method === 'GET' ? 'view' : 'edit');
  if (!ctx) return;
  // 1. GET: Fetch Org Chart Tree & Employees List with hierarchy
  if (req.method === 'GET') {
    try {
      const { data: employees, error } = await supabase
        .from('employees')
        .select('id, global_no, nik, name, position, department, phone, status, reports_to_id, reports_to_name, job_grade_level')
        .order('global_no', { ascending: true });

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      const empList: EmployeeRaw[] = employees || [];

      // Map for quick lookup
      const empMap = new Map<string, any>();
      empList.forEach(e => {
        empMap.set(e.id, {
          id: e.id,
          globalNo: e.global_no,
          nik: e.nik,
          name: e.name,
          position: e.position,
          department: e.department,
          phone: e.phone,
          status: e.status,
          reportsToId: e.reports_to_id || undefined,
          reportsToName: e.reports_to_name || undefined,
          jobGradeLevel: e.job_grade_level || 5,
          directReports: []
        });
      });

      // Build hierarchical tree
      const rootNodes: any[] = [];

      empMap.forEach((node) => {
        if (node.reportsToId && empMap.has(node.reportsToId)) {
          const parentNode = empMap.get(node.reportsToId);
          parentNode.directReports.push(node);
        } else {
          rootNodes.push(node);
        }
      });

      return res.status(200).json({
        tree: rootNodes,
        employees: Array.from(empMap.values())
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Server error' });
    }
  }

  // 2. POST/PUT: Update Reporting Line with CIRCULAR VALIDATION
  if (req.method === 'POST' || req.method === 'PUT') {
    try {
      const { employeeId, reportsToId } = req.body;

      if (!employeeId) {
        return res.status(400).json({ error: 'employeeId (ID Karyawan) wajib diisi' });
      }

      // Check self-reporting
      if (reportsToId && employeeId === reportsToId) {
        return res.status(400).json({
          error: 'Aturan Validasi: Karyawan tidak dapat dijadikan atasan langsung untuk dirinya sendiri!'
        });
      }

      // Fetch all employees to inspect reporting chain
      const { data: allEmps, error: fetchErr } = await supabase
        .from('employees')
        .select('id, name, reports_to_id');

      if (fetchErr) {
        return res.status(500).json({ error: fetchErr.message });
      }

      const empLookup = new Map<string, { id: string; name: string; reports_to_id?: string | null }>();
      (allEmps || []).forEach((e: any) => empLookup.set(e.id, e));

      const targetEmp = empLookup.get(employeeId);
      if (!targetEmp) {
        return res.status(404).json({ error: 'Karyawan tidak ditemukan' });
      }

      // CIRCULAR REPORTING VALIDATION
      if (reportsToId) {
        const managerEmp = empLookup.get(reportsToId);
        if (!managerEmp) {
          return res.status(404).json({ error: 'Calon atasan tidak ditemukan' });
        }

        // Trace upstream ancestry chain starting from the candidate manager
        let currId: string | null | undefined = reportsToId;
        const visitedChain: string[] = [];

        while (currId) {
          if (currId === employeeId) {
            // CYCLE DETECTED!
            const cycleNames = visitedChain.map(id => empLookup.get(id)?.name).filter(Boolean);
            return res.status(400).json({
              error: `Circular Reporting Line Detected! Tidak dapat menetapkan ${managerEmp.name} sebagai atasan ${targetEmp.name}, karena ${managerEmp.name} sudah berada di bawah hirarki ${targetEmp.name}.`,
              isCircular: true,
              cycleChain: [targetEmp.name, managerEmp.name, ...cycleNames]
            });
          }

          visitedChain.push(currId);
          const currNode = empLookup.get(currId);
          currId = currNode?.reports_to_id;

          // Guard against existing broken data loops
          if (visitedChain.length > (allEmps || []).length) {
            break;
          }
        }
      }

      // If valid, update database
      const managerName = reportsToId ? empLookup.get(reportsToId)?.name : null;

      const { data: updatedEmp, error: updateErr } = await supabase
        .from('employees')
        .update({
          reports_to_id: reportsToId || null,
          reports_to_name: managerName || null
        })
        .eq('id', employeeId)
        .select()
        .single();

      if (updateErr) {
        return res.status(500).json({ error: updateErr.message });
      }

      return res.status(200).json({
        success: true,
        message: `Reporting line untuk ${targetEmp.name} berhasil diperbarui!`,
        employee: updatedEmp
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Server error' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'PUT']);
  return res.status(405).end();
}
