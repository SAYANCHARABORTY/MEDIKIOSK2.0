import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FileUp, FileText, CheckCircle2, AlertCircle, ArrowLeft, ArrowRight, ShieldCheck, Loader2, RotateCcw } from 'lucide-react';
import { LiquidGlassCard, LiquidGlassButton, ProvenanceBadge } from '../../components/ui/LiquidGlass';
import { usePatientIntake, useTranslation } from '../../contexts/PatientIntakeContext';
import { api } from '../../services/api';

type ProcessState = 
  | 'IDLE' 
  | 'UPLOADING' 
  | 'UPLOADED' 
  | 'PROCESSING' 
  | 'EXTRACTING' 
  | 'COMPLETED' 
  | 'UPLOAD_FAILED' 
  | 'PROCESSING_FAILED' 
  | 'AI_SERVICE_UNAVAILABLE';

export const PatientDocumentsPage: React.FC = () => {
  const navigate = useNavigate();
  const { patient, setUploadedDocuments } = usePatientIntake();
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState('PRESCRIPTION');
  const [processState, setProcessState] = useState<ProcessState>('IDLE');
  const [lastDocId, setLastDocId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [extractedResult, setExtractedResult] = useState<any>(null);

  const handleUploadAndProcess = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!file) return;

    setProcessState('UPLOADING');
    setUploadError('');
    setExtractedResult(null);

    try {
      const formData = new FormData();
      formData.append('document', file);
      formData.append('file', file);
      formData.append('patientId', patient?.id || 'temp_kiosk_patient');
      formData.append('documentType', docType);

      // 1. Upload to secure backend storage
      const uploadRes = await api.documents.upload(formData);
      const docId = uploadRes.id;
      setLastDocId(docId);
      setProcessState('UPLOADED');

      // Short visual transition to processing
      setProcessState('PROCESSING');

      // 2. Process via Gemini Document AI
      setProcessState('EXTRACTING');
      try {
        const processRes = await api.documents.process(docId);
        setExtractedResult(processRes.extractedData);
        setProcessState('COMPLETED');

        // Update intake context
        setUploadedDocuments(prev => [
          ...prev,
          {
            id: docId,
            name: file.name,
            type: docType,
            status: 'COMPLETED',
            extractedData: processRes.extractedData
          }
        ]);
      } catch (procErr: any) {
        console.error('[Document Extraction Error]', procErr);
        if (procErr.message?.includes('not configured') || procErr.message?.includes('503')) {
          setProcessState('AI_SERVICE_UNAVAILABLE');
          setUploadError(procErr.message || 'AI document service is temporarily unavailable. Please retry or enter details manually.');
        } else {
          setProcessState('PROCESSING_FAILED');
          setUploadError(procErr.message || 'Document digitization failed. Please retry.');
        }
      }
    } catch (err: any) {
      console.error('[Document Upload Error]', err);
      setProcessState('UPLOAD_FAILED');
      setUploadError(err.message || 'File upload failed');
    }
  };

  const handleRetry = async () => {
    if (processState === 'PROCESSING_FAILED' && lastDocId) {
      // Retry just processing
      setProcessState('PROCESSING');
      setUploadError('');
      try {
        setProcessState('EXTRACTING');
        const processRes = await api.documents.process(lastDocId);
        setExtractedResult(processRes.extractedData);
        setProcessState('COMPLETED');
      } catch (procErr: any) {
        setProcessState('PROCESSING_FAILED');
        setUploadError(procErr.message || 'Retry processing failed.');
      }
    } else {
      // Full retry upload and process
      await handleUploadAndProcess();
    }
  };

  const isBusy = processState === 'UPLOADING' || processState === 'UPLOADED' || processState === 'PROCESSING' || processState === 'EXTRACTING';

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white transition-colors">
          <ArrowLeft size={16} />
          {t('common.return_home', 'Back to MediKiosk Home')}
        </Link>
        <ProvenanceBadge status="DOCUMENT_EXTRACTED" />
      </div>

      <LiquidGlassCard glow="emerald">
        <div className="border-b border-white/10 pb-4 mb-6">
          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
            <FileText size={16} />
            {t('docs.badge', 'Medical Document Intelligence')}
          </div>
          <h1 className="text-2xl font-bold text-white mt-1">{t('docs.title', 'Previous Prescriptions & Diagnostic Reports')}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t('docs.subtitle', 'Digitize paper records using Gemini Document AI. Clinical findings are extracted for physician verification.')}
          </p>
        </div>

        {uploadError && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start justify-between gap-3 mb-6">
            <div className="flex items-start gap-2">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">
                  {processState === 'UPLOAD_FAILED' ? `${t('docs.failed', 'Upload Failed')}: ` : processState === 'AI_SERVICE_UNAVAILABLE' ? `${t('docs.service_unavailable', 'AI Service Unavailable')}: ` : `${t('common.warning', 'Processing Notice')}: `}
                </span>
                {uploadError}
              </div>
            </div>
            <LiquidGlassButton size="sm" variant="secondary" onClick={handleRetry} disabled={isBusy}>
              <RotateCcw size={13} />
              {t('common.retry', 'Retry')}
            </LiquidGlassButton>
          </div>
        )}

        {/* State progress bar */}
        {isBusy && (
          <div className="p-4 rounded-xl bg-primary/10 border border-primary/25 text-primary text-xs flex items-center justify-between mb-6 animate-pulse">
            <div className="flex items-center gap-2 font-medium">
              <Loader2 size={16} className="animate-spin text-primary" />
              <span>
                {processState === 'UPLOADING' && t('docs.uploading', 'Uploading...')}
                {processState === 'UPLOADED' && t('docs.processing', 'Uploaded — Initializing AI...')}
                {processState === 'PROCESSING' && t('docs.processing', 'Processing document...')}
                {processState === 'EXTRACTING' && t('docs.extracting', 'Extracting information via Gemini Document AI...')}
              </span>
            </div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-primary/80">
              Provider: Gemini Document
            </span>
          </div>
        )}

        {processState === 'COMPLETED' && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 mb-6">
            <CheckCircle2 size={18} />
            <span className="font-bold">{t('docs.completed', 'Extraction Completed')}:</span> Clinical findings successfully parsed by Gemini Document AI.
          </div>
        )}

        <form onSubmit={handleUploadAndProcess} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground/85 uppercase tracking-wider">{t('docs.type_label', 'Document Category')}</label>
              <select
                value={docType}
                onChange={e => setDocType(e.target.value)}
                className="bg-black/50 border border-border rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-primary"
              >
                <option value="PRESCRIPTION">{t('docs.type_prescription', 'Previous Prescription')}</option>
                <option value="LAB_REPORT">{t('docs.type_lab', 'Laboratory Investigation Report')}</option>
                <option value="DISCHARGE_SUMMARY">{t('docs.type_discharge', 'Hospital Discharge Summary')}</option>
                <option value="IMAGING_REPORT">{t('docs.type_imaging', 'Imaging / Radiology Report')}</option>
                <option value="OTHER_MEDICAL_DOCUMENT">{t('common.optional', 'Other Medical Record')}</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground/85 uppercase tracking-wider">{t('docs.select_file', 'Select File or Photo')}</label>
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={e => setFile(e.target.files?.[0] || null)}
                required
                className="bg-black/50 border border-border rounded-xl px-4 py-2.5 text-xs text-foreground/85 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-primary file:text-black file:font-semibold hover:file:bg-cyan-400 cursor-pointer"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <LiquidGlassButton
              type="submit"
              variant="primary"
              size="md"
              disabled={isBusy || !file}
            >
              {isBusy ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> {t('docs.processing', 'Processing with Gemini Document...')}
                </>
              ) : (
                <>
                  <FileUp size={16} /> {t('docs.upload_and_analyze', 'Digitize & Extract')}
                </>
              )}
            </LiquidGlassButton>
          </div>
        </form>

        {/* Extracted Findings Display (Spec 3: Provenance & Non-diagnostic extraction) */}
        {extractedResult && (
          <div className="mt-8 pt-6 border-t border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Extracted Clinical Findings (Draft):
              </h3>
              <ProvenanceBadge status="DOCUMENT_EXTRACTED" />
            </div>

            {/* Diagnoses explicitly written */}
            {extractedResult.diagnoses && extractedResult.diagnoses.length > 0 && (
              <div className="p-3 rounded-xl bg-white/5 border border-border text-xs">
                <span className="font-bold text-foreground/85 block mb-1">Documented Diagnoses / Conditions:</span>
                <div className="flex flex-wrap gap-2">
                  {extractedResult.diagnoses.map((d: string, i: number) => (
                    <span key={i} className="px-2.5 py-1 rounded bg-primary/10 text-primary border border-primary/20 font-medium">
                      {d}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Medications */}
            {extractedResult.medications && extractedResult.medications.length > 0 && (
              <div className="p-3 rounded-xl bg-white/5 border border-border text-xs">
                <span className="font-bold text-foreground/85 block mb-1">Extracted Medications:</span>
                <div className="space-y-1.5">
                  {extractedResult.medications.map((m: any, i: number) => (
                    <div key={i} className="flex justify-between items-center text-foreground">
                      <span>• {m.name} ({m.dosage})</span>
                      <span className="font-mono text-primary">{m.frequency}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Investigations */}
            {extractedResult.investigations && extractedResult.investigations.length > 0 && (
              <div className="p-3 rounded-xl bg-white/5 border border-border text-xs">
                <span className="font-bold text-foreground/85 block mb-1">Test Results & Reference Ranges:</span>
                <div className="space-y-1">
                  {extractedResult.investigations.map((inv: any, i: number) => (
                    <div key={i} className="flex justify-between items-center text-foreground">
                      <span>• {inv.testName}: <strong>{inv.resultValue} {inv.unit}</strong></span>
                      {inv.flag && inv.flag !== 'NORMAL' ? (
                        <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30 text-[10px] font-bold">
                          {inv.flag}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-[11px] font-mono">Ref: {inv.referenceRange || 'Standard'}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-8 pt-4 border-t border-white/10 flex justify-between">
          <Link to="/patient/register">
            <LiquidGlassButton variant="secondary" size="md">
              Start Full Intake
            </LiquidGlassButton>
          </Link>
          <Link to="/patient/interview">
            <LiquidGlassButton variant="primary" size="md">
              Continue to Interview
              <ArrowRight size={16} />
            </LiquidGlassButton>
          </Link>
        </div>
      </LiquidGlassCard>
    </div>
  );
};
