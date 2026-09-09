import { Request, Response } from 'express';
import { query } from '../database/connection';
import { OPDQueueEntry } from '@medikiosk/shared';

export async function getOPDQueue(req: Request, res: Response) {
  const statusFilter = req.query.status as string;
  let sql = `
    SELECT 
      q.id, q.token, q.encounter_id, q.patient_id, q.priority, q.status, q.department,
      q.waiting_duration_minutes, q.created_at,
      p.full_name as patient_name, p.age, p.sex,
      e.system_of_medicine,
      (SELECT complaint FROM chief_complaints WHERE encounter_id = q.encounter_id LIMIT 1) as chief_complaint,
      (SELECT COUNT(*) FROM documents WHERE encounter_id = q.encounter_id) as doc_count,
      (SELECT COUNT(*) FROM clinical_attention_alerts WHERE encounter_id = q.encounter_id) as alert_count
    FROM queue_entries q
    JOIN patients p ON q.patient_id = p.id
    JOIN encounters e ON q.encounter_id = e.id
    WHERE 1=1
  `;
  const params: string[] = [];

  if (statusFilter) {
    sql += ' AND q.status = ?';
    params.push(statusFilter);
  }

  // Priority order: EMERGENCY first, then URGENT, then ROUTINE; within priority, order by created_at ASC
  sql += `
    ORDER BY 
      CASE q.priority
        WHEN 'EMERGENCY' THEN 1
        WHEN 'URGENT' THEN 2
        ELSE 3
      END,
      q.created_at ASC
  `;

  const rows = query.all<any>(sql, params);
  const queueEntries: OPDQueueEntry[] = rows.map(r => {
    const createdTime = new Date(r.created_at).getTime();
    const nowTime = Date.now();
    const waitMins = Math.max(0, Math.floor((nowTime - createdTime) / 60000));

    return {
      id: r.id,
      token: r.token,
      encounterId: r.encounter_id,
      patientId: r.patient_id,
      patientName: r.patient_name,
      age: r.age,
      sex: r.sex,
      chiefComplaint: r.chief_complaint || 'General Consultation',
      systemOfMedicine: r.system_of_medicine,
      priority: r.priority,
      status: r.status,
      waitingDurationMinutes: waitMins,
      hasDocuments: Number(r.doc_count) > 0,
      hasAttentionAlerts: Number(r.alert_count) > 0,
      department: r.department,
      createdAt: r.created_at
    };
  });

  return res.json(queueEntries);
}

export async function updateQueueStatus(req: Request, res: Response) {
  const id = req.params.id as string;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: 'status is required.' });
  }

  const existing = query.get<any>('SELECT * FROM queue_entries WHERE id = ?', [id]);
  if (!existing) {
    return res.status(404).json({ error: 'Queue entry not found' });
  }

  const now = new Date().toISOString();
  query.run('UPDATE queue_entries SET status = ?, updated_at = ? WHERE id = ?', [status, now, id]);
  query.run('UPDATE encounters SET status = ?, updated_at = ? WHERE id = ?', [status, now, existing.encounter_id]);

  return res.json({ message: 'Queue status updated', id, status });
}
