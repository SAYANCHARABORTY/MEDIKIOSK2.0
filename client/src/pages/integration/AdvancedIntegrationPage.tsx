import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Cpu, RefreshCw, CheckCircle2, AlertCircle, ArrowLeft, Download, Terminal, Building2 } from 'lucide-react';
import { LiquidGlassCard, LiquidGlassButton } from '../../components/ui/LiquidGlass';
import { api } from '../../services/api';
import { useTranslation } from '../../contexts/LanguageContext';

export const AdvancedIntegrationPage: React.FC = () => {
  const { t } = useTranslation();
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [testingAi, setTestingAi] = useState(false);
  const [aiTestResults, setAiTestResults] = useState<any>(null);

  useEffect(() => {
    api.admin.getSystemStatus()
      .then(res => setSystemStatus(res))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white transition-colors">
          <ArrowLeft size={16} />
          {t('nav.home', 'Home')}
        </Link>
        <span className="text-xs font-mono text-primary uppercase tracking-wider font-bold">
          Developer & Interoperability Architecture
        </span>
      </div>

      <div className="border-b border-white/10 pb-4">
        <h1 className="text-3xl font-extrabold text-white">Advanced Healthcare Integrations</h1>
        <p className="text-xs text-muted-foreground mt-1">
          HL7 FHIR R4 interoperability layer, Ayushman Bharat Digital Mission (ABDM) sandbox, and Hospital HMIS adapters.
        </p>
      </div>

      {/* AI Services Integration Status (Spec: Gemini Document, Gemini Audio, Groq separation) */}
      <LiquidGlassCard glow="none">
        <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
          <div className="flex items-center gap-2">
            <Cpu size={20} className="text-primary" />
            <div>
              <h2 className="text-lg font-bold text-white">AI Services & Clinical Engines</h2>
              <p className="text-xs text-muted-foreground font-light">
                Strict 3-provider separation. Never hardcoded, read securely from backend environment.
              </p>
            </div>
          </div>
          <LiquidGlassButton
            size="sm"
            variant="secondary"
            onClick={async () => {
              setTestingAi(true);
              try {
                const res = await api.integrations.testAi('all');
                setAiTestResults(res);
              } catch (e: any) {
                alert(`Test failed: ${e.message}`);
              } finally {
                setTestingAi(false);
              }
            }}
            disabled={testingAi}
          >
            <RefreshCw size={13} className={testingAi ? 'animate-spin' : ''} />
            {testingAi ? 'Testing Real Connections...' : 'Test AI Health'}
          </LiquidGlassButton>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Provider 1: Gemini Document AI */}
          <div className="p-4 rounded-xl bg-black/40 border border-border flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-bold text-foreground">Gemini Document AI</span>
                {(() => {
                  const status = aiTestResults?.geminiDocument?.status || systemStatus?.documentAi || 'NOT_CONFIGURED';
                  const isConnected = status === 'CONNECTED' || status === 'AVAILABLE';
                  const isFailed = status === 'CONNECTION_FAILED' || status === 'CONNECTION_ERROR';
                  const isConfigured = status === 'CONFIGURED';
                  return (
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase ${
                        isConnected
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 font-semibold'
                          : isFailed
                          ? 'bg-red-500/15 text-red-400 border-red-500/30 font-semibold'
                          : isConfigured
                          ? 'bg-primary/10 text-primary border-primary/25 font-semibold'
                          : 'bg-white/5 text-muted-foreground border-border'
                      }`}
                    >
                      ● {status}
                    </span>
                  );
                })()}
              </div>
              <p className="text-xs text-muted-foreground font-light leading-relaxed">
                Medical document understanding, prescription OCR, dosage, frequency, and lab tests extraction.
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-white/[0.04] text-[11px] font-mono text-muted-foreground/80">
              {aiTestResults?.geminiDocument?.latencyMs ? `Latency: ${aiTestResults.geminiDocument.latencyMs}ms (${aiTestResults.geminiDocument.model || 'Gemini'})` : 'Target: GEMINI_DOCUMENT_API_KEY'}
            </div>
          </div>

          {/* Provider 2: Gemini Audio */}
          <div className="p-4 rounded-xl bg-black/40 border border-border flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-bold text-foreground">Gemini Audio Speech</span>
                {(() => {
                  const status = aiTestResults?.geminiAudio?.status || systemStatus?.audioAi || 'NOT_CONFIGURED';
                  const isConnected = status === 'CONNECTED' || status === 'AVAILABLE';
                  const isFailed = status === 'CONNECTION_FAILED' || status === 'CONNECTION_ERROR';
                  const isConfigured = status === 'CONFIGURED';
                  return (
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase ${
                        isConnected
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 font-semibold'
                          : isFailed
                          ? 'bg-red-500/15 text-red-400 border-red-500/30 font-semibold'
                          : isConfigured
                          ? 'bg-primary/10 text-primary border-primary/25 font-semibold'
                          : 'bg-white/5 text-muted-foreground border-border'
                      }`}
                    >
                      ● {status}
                    </span>
                  );
                })()}
              </div>
              <p className="text-xs text-muted-foreground font-light leading-relaxed">
                Voice interaction, Indian regional speech-to-text (Bengali, Hindi, English), and translation.
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-white/[0.04] text-[11px] font-mono text-muted-foreground/80">
              {aiTestResults?.geminiAudio?.connectionStatus ? aiTestResults.geminiAudio.connectionStatus : 'Target: GEMINI_AUDIO_API_KEY'}
            </div>
          </div>

          {/* Provider 3: Groq Clinical */}
          <div className="p-4 rounded-xl bg-black/40 border border-border flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-bold text-foreground">Groq Clinical Engine</span>
                {(() => {
                  const status = aiTestResults?.groq?.status || systemStatus?.groqClinical || 'NOT_CONFIGURED';
                  const isConnected = status === 'CONNECTED' || status === 'AVAILABLE';
                  const isFailed = status === 'CONNECTION_FAILED' || status === 'CONNECTION_ERROR';
                  const isConfigured = status === 'CONFIGURED';
                  return (
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase ${
                        isConnected
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 font-semibold'
                          : isFailed
                          ? 'bg-red-500/15 text-red-400 border-red-500/30 font-semibold'
                          : isConfigured
                          ? 'bg-primary/10 text-primary border-primary/25 font-semibold'
                          : 'bg-white/5 text-muted-foreground border-border'
                      }`}
                    >
                      ● {status}
                    </span>
                  );
                })()}
              </div>
              <p className="text-xs text-muted-foreground font-light leading-relaxed">
                Adaptive clinical questioning (SOCRATES HPI), conversational intake, and doctor summary drafting.
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-white/[0.04] text-[11px] font-mono text-muted-foreground/80">
              {aiTestResults?.groq?.latencyMs ? `Latency: ${aiTestResults.groq.latencyMs}ms (${aiTestResults.groq.model || 'Groq'})` : 'Target: GROQ_API_KEY'}
            </div>
          </div>
        </div>
      </LiquidGlassCard>

      {/* ABDM Integration Architecture (Spec 26 & 27: Honest connection status, no fake transactions) */}
      <LiquidGlassCard glow="none">
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
          <div className="flex items-center gap-2">
            <Shield size={20} className="text-primary" />
            <h2 className="text-lg font-bold text-white">ABDM Sandbox Gateway Adapter</h2>
          </div>
          <span className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-mono font-bold">
            {systemStatus?.abdm?.status || 'ABDM_NOT_CONNECTED'}
          </span>
        </div>

        <p className="text-xs text-foreground/85 leading-relaxed mb-4">
          MediKiosk implements an isolated adapter layer (<code>/server/src/integrations/abdmAdapter.ts</code>) ready to bind official National Health Authority (NHA) ABDM M1, M2, and M3 APIs. Per medical software safety guidelines, the application operates in localized facility mode without fabricating ABHA credentials or mock transactions.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
          <div className="p-3 rounded-xl bg-black/40/70 border border-border">
            <span className="text-muted-foreground/60 block text-[10px]">ENVIRONMENT:</span>
            <span className="text-foreground">{systemStatus?.abdm?.environment || 'sandbox'}</span>
          </div>
          <div className="p-3 rounded-xl bg-black/40/70 border border-border">
            <span className="text-muted-foreground/60 block text-[10px]">GATEWAY STATUS:</span>
            <span className="text-amber-400 font-bold">{systemStatus?.abdm?.status || 'NOT_CONNECTED'}</span>
          </div>
          <div className="p-3 rounded-xl bg-black/40/70 border border-border">
            <span className="text-muted-foreground/60 block text-[10px]">FACILITY REGISTRY ID:</span>
            <span className="text-muted-foreground">UNLINKED (LOCAL MODE)</span>
          </div>
        </div>
      </LiquidGlassCard>

      {/* HL7 FHIR R4 Specification (Spec 25) */}
      <LiquidGlassCard glow="none">
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
          <div className="flex items-center gap-2">
            <Terminal size={20} className="text-teal-400" />
            <h2 className="text-lg font-bold text-white">HL7 FHIR R4 Resources Supported</h2>
          </div>
          <span className="px-2.5 py-1 rounded bg-teal-500/20 text-teal-300 border border-teal-500/40 text-xs font-mono font-bold">
            FHIR R4 DETERMINISTIC
          </span>
        </div>

        <p className="text-xs text-foreground/85 leading-relaxed mb-4">
          Verified patient encounters and clinical summaries map deterministically into FHIR R4 Document Bundles. The application schema maps cleanly to:
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
          {[
            'Patient',
            'Practitioner',
            'Organization',
            'Encounter',
            'Condition',
            'Observation',
            'AllergyIntolerance',
            'MedicationStatement',
            'Composition',
            'Bundle'
          ].map(res => (
            <div key={res} className="p-2.5 rounded-xl bg-white/5 border border-border text-foreground/85 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              {res}
            </div>
          ))}
        </div>
      </LiquidGlassCard>

      {/* Hospital HMIS / EHR Adapter (Spec 57) */}
      <LiquidGlassCard glow="none">
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
          <div className="flex items-center gap-2">
            <Building2 size={20} className="text-purple-400" />
            <h2 className="text-lg font-bold text-white">Hospital HMIS & Laboratory Links</h2>
          </div>
          <span className="px-2.5 py-1 rounded bg-white/5 text-muted-foreground border border-border text-xs font-mono">
            {systemStatus?.hospital?.hisStatus || 'NOT_CONFIGURED'}
          </span>
        </div>

        <p className="text-xs text-foreground/85 leading-relaxed">
          Extensible REST interfaces allow bidirectional synchronization with existing hospital information systems (HIS), laboratory information systems (LIS), and pharmacy databases.
        </p>
      </LiquidGlassCard>
    </div>
  );
};
