import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requirePermission } from '../_auth';
import { supabase } from '../_supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const ctx = await requirePermission(req, res, 'org_structure', req.method === 'GET' ? 'view' : 'edit');
  if (!ctx) return;
  if (req.method === 'GET') {
    try {
      const { data: positions, error: posErr } = await supabase
        .from('job_positions')
        .select(`
          *,
          department:departments(id, name, code),
          job_grade:job_grades(id, grade_code, grade_name, level)
        `)
        .order('title');

      const { data: grades, error: gradeErr } = await supabase
        .from('job_grades')
        .select('*')
        .order('level', { ascending: true });

      if (posErr || gradeErr) {
        // Simple fallback
        const { data: simplePositions } = await supabase.from('job_positions').select('*');
        const { data: simpleGrades } = await supabase.from('job_grades').select('*');
        return res.status(200).json({
          positions: simplePositions || [],
          grades: simpleGrades || []
        });
      }

      const formattedPositions = (positions || []).map((p: any) => ({
        id: p.id,
        title: p.title,
        code: p.code,
        departmentId: p.department_id,
        departmentName: p.department?.name,
        jobGradeId: p.job_grade_id,
        jobGradeName: p.job_grade?.grade_name,
        jobGradeLevel: p.job_grade?.level,
        description: p.description,
        minExperienceYears: p.min_experience_years,
        createdAt: p.created_at
      }));

      const formattedGrades = (grades || []).map((g: any) => ({
        id: g.id,
        gradeCode: g.grade_code,
        gradeName: g.grade_name,
        level: g.level,
        minSalary: g.min_salary,
        maxSalary: g.max_salary,
        description: g.description,
        createdAt: g.created_at
      }));

      return res.status(200).json({
        positions: formattedPositions,
        grades: formattedGrades
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Server error' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { type, title, departmentId, jobGradeId, description, minExperienceYears, gradeCode, gradeName, level, minSalary, maxSalary } = req.body;

      if (type === 'grade') {
        if (!gradeCode || !level) {
          return res.status(400).json({ error: 'Kode Grade dan Level Wajib diisi' });
        }
        const { data, error } = await supabase
          .from('job_grades')
          .insert({
            grade_code: gradeCode.toUpperCase(),
            grade_name: gradeName || `Grade ${gradeCode}`,
            level: Number(level),
            min_salary: minSalary ? Number(minSalary) : null,
            max_salary: maxSalary ? Number(maxSalary) : null,
            description: description || null
          })
          .select()
          .single();

        if (error) return res.status(500).json({ error: error.message });
        return res.status(201).json({ success: true, grade: data });
      } else {
        // default position
        if (!title) {
          return res.status(400).json({ error: 'Nama Jabatan (Title) wajib diisi' });
        }

        const { data, error } = await supabase
          .from('job_positions')
          .insert({
            title,
            department_id: departmentId || null,
            job_grade_id: jobGradeId || null,
            description: description || null,
            min_experience_years: minExperienceYears ? Number(minExperienceYears) : 0
          })
          .select()
          .single();

        if (error) return res.status(500).json({ error: error.message });
        return res.status(201).json({ success: true, position: data });
      }
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Server error' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end();
}
