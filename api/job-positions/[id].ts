import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../_supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Position ID missing or invalid' });
  }

  if (req.method === 'PUT' || req.method === 'PATCH') {
    try {
      const { type, title, departmentId, jobGradeId, description, minExperienceYears, gradeCode, gradeName, level, minSalary, maxSalary } = req.body;

      if (type === 'grade') {
        const updatePayload: any = {};
        if (gradeCode !== undefined) updatePayload.grade_code = gradeCode.toUpperCase();
        if (gradeName !== undefined) updatePayload.grade_name = gradeName;
        if (level !== undefined) updatePayload.level = Number(level);
        if (minSalary !== undefined) updatePayload.min_salary = minSalary ? Number(minSalary) : null;
        if (maxSalary !== undefined) updatePayload.max_salary = maxSalary ? Number(maxSalary) : null;
        if (description !== undefined) updatePayload.description = description;

        const { data, error } = await supabase
          .from('job_grades')
          .update(updatePayload)
          .eq('id', id)
          .select()
          .single();

        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json({ success: true, grade: data });
      } else {
        const updatePayload: any = {};
        if (title !== undefined) updatePayload.title = title;
        if (departmentId !== undefined) updatePayload.department_id = departmentId || null;
        if (jobGradeId !== undefined) updatePayload.job_grade_id = jobGradeId || null;
        if (description !== undefined) updatePayload.description = description;
        if (minExperienceYears !== undefined) updatePayload.min_experience_years = Number(minExperienceYears);

        const { data, error } = await supabase
          .from('job_positions')
          .update(updatePayload)
          .eq('id', id)
          .select()
          .single();

        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json({ success: true, position: data });
      }
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Server error' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { type } = req.query;
      const targetTable = type === 'grade' ? 'job_grades' : 'job_positions';

      const { error } = await supabase
        .from(targetTable)
        .delete()
        .eq('id', id);

      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ success: true, message: 'Berhasil dihapus' });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Server error' });
    }
  }

  res.setHeader('Allow', ['PUT', 'PATCH', 'DELETE']);
  return res.status(405).end();
}
