/**
 * MediKiosk - Real JPEG Medical Report Generator
 * Renders a clean, professional medical document to an HTML5 canvas and exports
 * as an authentic 'image/jpeg' blob (.jpg, quality 0.95) with communicative medical wording.
 */

export interface ReportPatientData {
  fullName?: string;
  age?: number | string;
  sex?: string;
  gender?: string;
  mrn?: string;
  phone?: string;
  bloodGroup?: string;
}

export interface ReportEncounterData {
  systemOfMedicine?: string;
  createdAt?: string;
}

export interface ReportData {
  patient: ReportPatientData;
  encounter?: ReportEncounterData;
  chiefComplaints?: Array<{
    complaint?: string;
    duration?: string;
    severity?: string;
    associatedSymptoms?: string[];
  }>;
  reviewOfSystems?: any;
  pastMedical?: Array<{ condition_or_procedure?: string; conditionOrProcedure?: string; condition?: string }>;
  pastSurgical?: Array<{ condition_or_procedure?: string; conditionOrProcedure?: string; condition?: string }>;
  medications?: Array<{ name?: string; dosage?: string; frequency?: string; duration?: string }>;
  allergies?: Array<{ allergen?: string; severity?: string; reaction?: string }>;
  documents?: Array<{ file_name?: string; fileName?: string; document_type?: string; documentType?: string; uploaded_at?: string; uploadedAt?: string }>;
  alerts?: Array<{ reason?: string; severity?: string }>;
  summary?: {
    chiefComplaintSummary?: string;
    hpiSummary?: string;
    pastMedicalSummary?: string;
    physicianNotes?: string;
  } | null;
  physicianNotes?: string;
}

/**
 * Sanitizes a patient name for use in filenames.
 */
export function sanitizeFilename(name: string): string {
  const cleaned = name.trim().replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_');
  return cleaned || 'Patient';
}

/**
 * Helper to wrap text into multiple lines given a max width.
 */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = ctx.measureText(testLine).width;
    if (testWidth > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

/**
 * Generates and downloads a real JPEG medical report.
 */
export async function downloadReportAsJpeg(data: ReportData): Promise<void> {
  const patient = data.patient || {};
  const patientName = patient.fullName || 'Patient';
  const patientAge = patient.age ? `${patient.age} years` : 'Age not provided';
  const patientSex = patient.gender || patient.sex || 'Not provided';
  const patientMrn = patient.mrn || 'Pending';
  const dateStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const timeStr = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });

  // Canvas Setup
  const canvas = document.createElement('canvas');
  const width = 1200;
  const padding = 60;
  const contentWidth = width - padding * 2;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  // Measure content first to calculate dynamic height
  const lineHeight = 26;
  const sectionGap = 32;

  // Build document sections
  interface Section {
    title: string;
    items: string[];
    isAlert?: boolean;
  }

  const sections: Section[] = [];

  // 1. Main Concerns
  const concernItems: string[] = [];
  if (data.chiefComplaints && data.chiefComplaints.length > 0) {
    data.chiefComplaints.forEach((c) => {
      const complaintText = c.complaint || 'General consultation requested';
      const durationText = c.duration ? ` for ${c.duration}` : '';
      const severityText = c.severity ? ` (Severity: ${c.severity.toLowerCase()})` : '';
      let line = `The patient reports experiencing ${complaintText}${durationText}${severityText}.`;
      if (c.associatedSymptoms && c.associatedSymptoms.length > 0) {
        line += ` Associated symptoms include ${c.associatedSymptoms.join(', ')}.`;
      }
      concernItems.push(line);
    });
  } else {
    concernItems.push('The patient did not report any acute primary complaints at intake.');
  }
  sections.push({ title: 'Main Concerns', items: concernItems });

  // 2. Reported Symptoms (Review of Systems in communicative language)
  const symptomItems: string[] = [];
  const ros = data.reviewOfSystems || {};
  const rosMap: Record<string, { label: string; positive: (s: string) => string; negative: string }> = {
    constitutional: {
      label: 'General Health',
      positive: (s) => `The patient reports experiencing ${s.toLowerCase()}.`,
      negative: 'No fatigue, unexpected weight loss, or general malaise reported.'
    },
    cardiovascular: {
      label: 'Heart & Circulation',
      positive: (s) => `Heart-related symptoms documented: ${s}.`,
      negative: 'No heart-related symptoms, chest discomfort, or palpitations were reported.'
    },
    respiratory: {
      label: 'Breathing & Lungs',
      positive: (s) => `Respiratory symptoms noted: ${s}.`,
      negative: 'No breathing difficulties, cough, or shortness of breath were reported.'
    },
    gastrointestinal: {
      label: 'Digestive System',
      positive: (s) => `Digestive symptoms noted: ${s}.`,
      negative: 'No stomach pain, nausea, or digestive issues were reported.'
    },
    neurological: {
      label: 'Neurological & Nervous System',
      positive: (s) => `Neurological symptoms reported: ${s}.`,
      negative: 'No dizziness, headaches, or numbness were reported.'
    },
    musculoskeletal: {
      label: 'Muscles & Joints',
      positive: (s) => `Joint or muscle symptoms reported: ${s}.`,
      negative: 'No joint pain, muscle stiffness, or movement difficulties were reported.'
    },
    integumentary: {
      label: 'Skin Health',
      positive: (s) => `Skin symptoms reported: ${s}.`,
      negative: 'No rash, itching, or skin changes were reported.'
    },
    psychiatric: {
      label: 'Mental Health & Mood',
      positive: (s) => `Mood symptoms reported: ${s}.`,
      negative: 'No anxiety, severe sleep disturbances, or mood symptoms were reported.'
    }
  };

  Object.entries(rosMap).forEach(([key, config]) => {
    const val = ros[key];
    if (Array.isArray(val) && val.length > 0) {
      const cleanList = val.map((s) => String(s || '').trim()).filter((s) => Boolean(s) && s !== '[]');
      if (cleanList.length > 0) {
        symptomItems.push(`${config.label}: ${config.positive(cleanList.join(', '))}`);
        return;
      }
    }
    symptomItems.push(`${config.label}: ${config.negative}`);
  });
  sections.push({ title: 'Reported Symptoms', items: symptomItems });

  // 3. Medical History
  const historyItems: string[] = [];
  if (data.pastMedical && data.pastMedical.length > 0) {
    data.pastMedical.forEach((m) => {
      const cond = m.condition_or_procedure || m.conditionOrProcedure || m.condition;
      if (cond) historyItems.push(`Previous medical condition: ${cond}.`);
    });
  }
  if (data.pastSurgical && data.pastSurgical.length > 0) {
    data.pastSurgical.forEach((s) => {
      const proc = s.condition_or_procedure || s.conditionOrProcedure || s.condition;
      if (proc) historyItems.push(`Previous surgical procedure: ${proc}.`);
    });
  }
  if (historyItems.length === 0) {
    historyItems.push('No medical history was provided.');
  }
  sections.push({ title: 'Medical History', items: historyItems });

  // 4. Current Medication
  const medItems: string[] = [];
  if (data.medications && data.medications.length > 0) {
    data.medications.forEach((m) => {
      let desc = m.name || 'Prescription medication';
      if (m.dosage) desc += ` (${m.dosage})`;
      if (m.frequency) desc += ` taken ${m.frequency}`;
      if (m.duration) desc += ` for ${m.duration}`;
      medItems.push(`Active medication: ${desc}.`);
    });
  } else {
    medItems.push('No medication information was provided.');
  }
  sections.push({ title: 'Current Medication', items: medItems });

  // 5. Documented Allergies
  const allergyItems: string[] = [];
  if (data.allergies && data.allergies.length > 0) {
    data.allergies.forEach((a) => {
      const allergen = a.allergen || 'Substance';
      const severity = a.severity ? `[${a.severity.toLowerCase()} severity]` : '';
      const reaction = a.reaction ? `with reaction of ${a.reaction}` : '';
      allergyItems.push(`Allergic to ${allergen} ${severity} ${reaction}.`.trim());
    });
  } else {
    allergyItems.push('No known drug or environmental allergies were reported.');
  }
  sections.push({ title: 'Documented Allergies & Hypersensitivities', items: allergyItems });

  // 6. Lab Findings & Uploaded Diagnostic Reports
  const labItems: string[] = [];
  if (data.documents && data.documents.length > 0) {
    data.documents.forEach((d) => {
      const fileName = d.file_name || d.fileName || 'Diagnostic File';
      const docType = (d.document_type || d.documentType || 'Medical Document').replace(/_/g, ' ');
      labItems.push(`Attached medical document: "${fileName}" categorized as ${docType}. Document digitized and ready for physician review.`);
    });
  } else {
    labItems.push('No laboratory reports or diagnostic documents were uploaded for this visit.');
  }
  sections.push({ title: 'Lab Findings & Attached Records', items: labItems });

  // 7. Important Observations
  const alertItems: string[] = [];
  if (data.alerts && data.alerts.length > 0) {
    data.alerts.forEach((al) => {
      alertItems.push(`Clinical observation: ${al.reason || 'Symptom flagged for physician review'} (${al.severity || 'MODERATE'} priority).`);
    });
  } else {
    alertItems.push('No immediate clinical red flag alerts detected during intake.');
  }
  sections.push({ title: 'Important Observations', items: alertItems, isAlert: data.alerts && data.alerts.length > 0 });

  // 8. AI Summary & Physician Verification
  const summaryItems: string[] = [];
  if (data.summary?.chiefComplaintSummary || data.summary?.hpiSummary) {
    if (data.summary.chiefComplaintSummary) summaryItems.push(`Chief Concern Assessment: ${data.summary.chiefComplaintSummary}`);
    if (data.summary.hpiSummary) summaryItems.push(`History Details: ${data.summary.hpiSummary}`);
  } else {
    summaryItems.push('The patient has completed self-intake. Clinical symptoms, medical history, and documentation have been organized and prepared for the consultation.');
  }
  if (data.physicianNotes || data.summary?.physicianNotes) {
    summaryItems.push(`Attending Physician Notes: ${data.physicianNotes || data.summary?.physicianNotes}`);
  }
  sections.push({ title: 'AI Summary', items: summaryItems });

  // Compute Required Canvas Height
  ctx.font = '15px sans-serif';
  let estimatedHeight = 320; // Header and patient info block
  for (const sec of sections) {
    estimatedHeight += 36; // Section title
    for (const item of sec.items) {
      const lines = wrapText(ctx, item, contentWidth - 40);
      estimatedHeight += lines.length * lineHeight + 8;
    }
    estimatedHeight += sectionGap;
  }
  estimatedHeight += 180; // Disclaimer and footer

  canvas.width = width;
  canvas.height = estimatedHeight;

  // Render Background: Clean White Medical Report
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, estimatedHeight);

  // Outer Border & Header Accent Bar
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 2;
  ctx.strokeRect(20, 20, width - 40, estimatedHeight - 40);

  // Emerald Top Branding Bar
  ctx.fillStyle = '#059669';
  ctx.fillRect(20, 20, width - 40, 10);

  // Header
  let y = 65;
  ctx.fillStyle = '#059669';
  ctx.font = 'bold 32px "Inter", "Segoe UI", Arial, sans-serif';
  ctx.fillText('MEDIKIOSK', padding, y);

  y += 28;
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 20px "Inter", "Segoe UI", Arial, sans-serif';
  ctx.fillText('AI MEDICAL REPORT', padding, y);

  ctx.fillStyle = '#64748B';
  ctx.font = '14px "Inter", "Segoe UI", Arial, sans-serif';
  ctx.fillText('Intelligent Clinical Case-Taking & Assessment Platform', padding, y + 20);

  // Right-aligned Date
  ctx.textAlign = 'right';
  ctx.fillStyle = '#475569';
  ctx.font = '13px "Inter", "Segoe UI", Arial, sans-serif';
  ctx.fillText(`Report Date: ${dateStr}`, width - padding, 65);
  ctx.fillText(`Generated: ${timeStr}`, width - padding, 85);
  ctx.fillText('Confidential Medical Record', width - padding, 105);
  ctx.textAlign = 'left';

  y += 50;
  ctx.strokeStyle = '#E2E8F0';
  ctx.beginPath();
  ctx.moveTo(padding, y);
  ctx.lineTo(width - padding, y);
  ctx.stroke();

  // Patient Information Card
  y += 25;
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(padding, y, contentWidth, 90);
  ctx.strokeStyle = '#E2E8F0';
  ctx.strokeRect(padding, y, contentWidth, 90);

  const colWidth = contentWidth / 4;
  const cardY = y + 30;

  // Name
  ctx.fillStyle = '#64748B';
  ctx.font = '11px "Inter", Arial, sans-serif';
  ctx.fillText('PATIENT NAME', padding + 20, cardY);
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 16px "Inter", Arial, sans-serif';
  ctx.fillText(patientName, padding + 20, cardY + 24);

  // Age & Sex
  ctx.fillStyle = '#64748B';
  ctx.font = '11px "Inter", Arial, sans-serif';
  ctx.fillText('AGE & GENDER', padding + colWidth + 10, cardY);
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 15px "Inter", Arial, sans-serif';
  ctx.fillText(`${patientAge} • ${patientSex}`, padding + colWidth + 10, cardY + 24);

  // MRN
  ctx.fillStyle = '#64748B';
  ctx.font = '11px "Inter", Arial, sans-serif';
  ctx.fillText('RECORD ID (MRN)', padding + colWidth * 2 + 10, cardY);
  ctx.fillStyle = '#059669';
  ctx.font = 'bold 15px "Courier New", monospace';
  ctx.fillText(patientMrn, padding + colWidth * 2 + 10, cardY + 24);

  // System
  ctx.fillStyle = '#64748B';
  ctx.font = '11px "Inter", Arial, sans-serif';
  ctx.fillText('SYSTEM OF MEDICINE', padding + colWidth * 3 + 10, cardY);
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 15px "Inter", Arial, sans-serif';
  ctx.fillText(data.encounter?.systemOfMedicine || 'Modern Medicine', padding + colWidth * 3 + 10, cardY + 24);

  y += 115;

  // Render Sections
  for (const sec of sections) {
    // Section Header
    ctx.fillStyle = sec.isAlert ? '#DC2626' : '#0F172A';
    ctx.font = 'bold 16px "Inter", Arial, sans-serif';
    ctx.fillText(sec.title.toUpperCase(), padding, y);

    // Subtle divider line
    ctx.strokeStyle = sec.isAlert ? '#FCA5A5' : '#CBD5E1';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, y + 8);
    ctx.lineTo(width - padding, y + 8);
    ctx.stroke();

    y += 28;

    // Items
    for (const item of sec.items) {
      // Bullet dot
      ctx.fillStyle = sec.isAlert ? '#DC2626' : '#059669';
      ctx.beginPath();
      ctx.arc(padding + 10, y + 8, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Text wrapping
      ctx.fillStyle = sec.isAlert ? '#991B1B' : '#334155';
      ctx.font = '14.5px "Inter", "Segoe UI", Arial, sans-serif';
      const lines = wrapText(ctx, item, contentWidth - 35);
      for (const line of lines) {
        ctx.fillText(line, padding + 26, y + 13);
        y += lineHeight;
      }
      y += 4;
    }

    y += sectionGap - 10;
  }

  // Medical Disclaimer Box
  y += 10;
  ctx.fillStyle = '#F1F5F9';
  ctx.fillRect(padding, y, contentWidth, 65);
  ctx.strokeStyle = '#CBD5E1';
  ctx.strokeRect(padding, y, contentWidth, 65);

  ctx.fillStyle = '#475569';
  ctx.font = 'italic 12.5px "Inter", Arial, sans-serif';
  ctx.fillText(
    'IMPORTANT MEDICAL NOTICE: This document is an AI-assisted intake report generated for clinical decision support.',
    padding + 16,
    y + 24
  );
  ctx.fillText(
    'This information is intended to assist healthcare professionals and should be reviewed by a qualified medical professional.',
    padding + 16,
    y + 44
  );

  // Bottom Footer
  y += 90;
  ctx.fillStyle = '#94A3B8';
  ctx.font = '11px "Inter", Arial, sans-serif';
  ctx.fillText('MediKiosk Autonomous Healthcare Station • Standards-Compliant Case-Taking Record', padding, y);
  ctx.textAlign = 'right';
  ctx.fillText('Page 1 of 1 • Official Health Summary', width - padding, y);
  ctx.textAlign = 'left';

  // Convert to Real JPEG Blob with 0.95 Quality
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to create JPEG Blob from canvas'));
          return;
        }

        const safeName = sanitizeFilename(patientName);
        const fileName = `MediKiosk_AI_Report_${safeName}.jpg`;

        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
        resolve();
      },
      'image/jpeg',
      0.95
    );
  });
}
