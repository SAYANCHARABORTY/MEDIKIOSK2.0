import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  FileText,
  Mic,
  MicOff,
  Send,
  Upload,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  Info,
  Shield,
  Volume2,
  RefreshCw,
  HelpCircle,
  Activity,
  FileCheck
} from 'lucide-react';
import { LiquidGlassCard, LiquidGlassButton, GlassInput, ProvenanceBadge } from '../../components/ui/LiquidGlass';
import { api } from '../../services/api';
import { useTranslation } from '../../contexts/LanguageContext';

type AiSubSection = 'chat' | 'document' | 'voice';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  provider?: string;
  isEmergency?: boolean;
}

export const AiAssistPage: React.FC = () => {
  const { t, language } = useTranslation();
  const [activeSection, setActiveSection] = useState<AiSubSection>('chat');

  // Integration Health Status
  const [apiStatus, setApiStatus] = useState<any>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);

  // 1. Chat Assist (Groq)
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome_1',
      role: 'assistant',
      content:
        'Hello! I am your MediKiosk AI Health Assistant, powered by Groq. I can help explain medical terms, discuss symptoms, and help you prepare questions for your doctor.\n\nHow can I support your health visit today?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      provider: 'Groq'
    }
  ]);
  const [chatLoading, setChatLoading] = useState(false);
  const [emergencyAlert, setEmergencyAlert] = useState<string | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // 2. Document & Result Chat (Gemini Document)
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docUploading, setDocUploading] = useState(false);
  const [docContext, setDocContext] = useState<string>('');
  const [docExtractedData, setDocExtractedData] = useState<any>(null);
  const [docQuestion, setDocQuestion] = useState('');
  const [docChatHistory, setDocChatHistory] = useState<Array<{ q: string; a: string; timestamp: string }>>([]);
  const [docAsking, setDocAsking] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);

  // 3. Voice Assist (Gemini Audio)
  const [isRecording, setIsRecording] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState<string | null>(null);
  const [originalVoiceText, setOriginalVoiceText] = useState<string | null>(null);
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);
  const [voiceResponseText, setVoiceResponseText] = useState<string | null>(null);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [voiceEmergency, setVoiceEmergency] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Fetch real API status on mount
  const fetchStatus = async () => {
    setCheckingStatus(true);
    try {
      const res = await api.integrations.getAiStatus();
      setApiStatus(res);
    } catch (e: any) {
      console.error('Failed to fetch AI integration status:', e);
    } finally {
      setCheckingStatus(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // 1. Send Chat Message to Groq
  const handleSendChat = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = chatInput.trim();
    if (!query || chatLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setChatLoading(true);

    try {
      const res = await fetch('/api/ai/assist/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          history: chatMessages.slice(-6).map(m => ({ role: m.role, content: m.content })),
          language
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'AI service is currently unavailable.');
      }

      const data = await res.json();

      if (data.isEmergency) {
        setEmergencyAlert(
          'CRITICAL ATTENTION: Red-flag emergency symptoms detected. Please immediately proceed to the nearest Emergency Room or alert clinic triage staff.'
        );
      }

      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        provider: data.provider,
        isEmergency: data.isEmergency
      };

      setChatMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      setChatMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'AI service is currently unavailable. Please discuss your questions directly with your doctor.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          provider: 'System Fallback'
        }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  // 2. Upload Document for Gemini Document Chat (Shared Document Service)
  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setDocFile(file);
    setDocUploading(true);
    setDocError(null);
    setDocExtractedData(null);

    const formData = new FormData();
    formData.append('document', file);
    formData.append('file', file);
    formData.append('patientId', 'temp_kiosk_patient');
    formData.append('documentType', 'LAB_REPORT');

    try {
      // 1. Shared upload service
      const uploadResult = await api.documents.upload(formData);
      const docId = uploadResult.id || uploadResult.document?.id;

      // 2. Shared extraction via Gemini Document AI
      if (docId) {
        try {
          const procData = await api.documents.process(docId);
          const extracted = procData.extractedData || procData;
          setDocExtractedData(extracted);
          setDocContext(
            `File: ${file.name}. Extracted Content: ${JSON.stringify(extracted, null, 2)}`
          );
        } catch (procErr: any) {
          console.warn('[Doc Process Notice]', procErr);
          setDocContext(`File: ${file.name}. Medical document uploaded.`);
          setDocError(`Document uploaded, but AI entity extraction reported: ${procErr.message}. You can still ask questions about it.`);
        }
      } else {
        setDocContext(`File: ${file.name}. Medical document uploaded.`);
      }
    } catch (err: any) {
      console.error('[AiAssist Doc Upload Error]', err);
      setDocError(err.message || 'Unable to upload this document.');
    } finally {
      setDocUploading(false);
    }
  };

  // Ask Question about Document via Gemini
  const handleAskDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docQuestion.trim() || docAsking) return;

    const q = docQuestion.trim();
    setDocAsking(true);
    setDocError(null);

    try {
      const res = await fetch('/api/ai/assist/document-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q,
          documentContext: docContext || 'Prescription / Lab Report with medication and clinical observations.',
          extractedData: docExtractedData,
          language
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Unable to process this document.');
      }

      const data = await res.json();
      setDocChatHistory(prev => [
        ...prev,
        {
          q,
          a: data.answer,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      setDocQuestion('');
    } catch (err: any) {
      setDocError(err.message || 'Unable to process this document.');
    } finally {
      setDocAsking(false);
    }
  };

  // 3. Voice Assist via Gemini Audio
  const startRecording = async () => {
    setVoiceError(null);
    setVoiceTranscript(null);
    setVoiceResponseText(null);
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = e => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await sendVoiceAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(250);
      setIsRecording(true);
    } catch (err: any) {
      setVoiceError('Microphone access was denied or is not supported. Please allow microphone permissions or use text input.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const sendVoiceAudio = async (audioBlob: Blob) => {
    setVoiceLoading(true);
    setVoiceError(null);

    const formData = new FormData();
    formData.append('audio', audioBlob, 'speech.webm');
    formData.append('language', language);

    try {
      const res = await fetch('/api/ai/assist/voice', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Voice service is currently unavailable.');
      }

      const data = await res.json();
      setOriginalVoiceText(data.originalTranscript || 'Speech recorded');
      setDetectedLanguage(data.detectedLanguage || 'en');
      setVoiceTranscript(data.translatedEnglish || data.originalTranscript);
      setVoiceResponseText(data.responseText);
      setVoiceEmergency(Boolean(data.isEmergency));

      // Speak response back using Web Speech API if supported
      if ('speechSynthesis' in window && data.responseText) {
        const utterance = new SpeechSynthesisUtterance(data.responseText);
        window.speechSynthesis.speak(utterance);
      }
    } catch (err: any) {
      setVoiceError('Voice service is currently unavailable. You may type your inquiry in Chat Assist.');
    } finally {
      setVoiceLoading(false);
    }
  };

  // Update initial welcome message whenever language changes
  useEffect(() => {
    setChatMessages(prev => {
      if (prev.length === 1 && prev[0].id === 'welcome_1') {
        return [
          {
            id: 'welcome_1',
            role: 'assistant',
            content: t(
              'nirvana.chat_welcome',
              'Hello! I am NIRVANA, your intelligent healthcare companion. I can help explain medical terms, discuss symptoms, and help you prepare questions for your doctor.\n\nHow can I support your health visit today?'
            ),
            timestamp: prev[0].timestamp,
            provider: 'NIRVANA'
          }
        ];
      }
      return prev;
    });
  }, [language, t]);

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 max-w-7xl mx-auto space-y-6 font-sora">
      {/* Top Header: NIRVANA Branding */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary font-semibold text-xs uppercase tracking-wider">
            <Sparkles size={16} />
            {t('nirvana.badge', 'NIRVANA • Intelligent Healthcare Companion')}
          </div>
          <div className="flex items-baseline gap-3 mt-1 flex-wrap">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white font-sora">
              NIRVANA
            </h1>
            <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30 font-semibold tracking-wide">
              {t('nirvana.tagline', 'Intelligent Care. Clear Understanding.')}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-2xl leading-relaxed">
            {t('nirvana.subtitle', 'Your Intelligent Healthcare Companion')}
          </p>
        </div>

        {/* Live Subsystem Health Badges (Subtle for Developer Transparency) */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <div className="px-3 py-1 rounded-xl bg-black/40 border border-white/10 text-[11px] font-mono flex items-center gap-1.5" title="Groq Clinical LLM Engine">
            <span className="text-muted-foreground">Groq Chat:</span>
            {apiStatus?.services?.groq?.status === 'AVAILABLE' || apiStatus?.services?.groq?.configured ? (
              <span className="text-emerald-400 font-bold">● Active</span>
            ) : (
              <span className="text-muted-foreground">● Standby</span>
            )}
          </div>

          <div className="px-3 py-1 rounded-xl bg-black/40 border border-white/10 text-[11px] font-mono flex items-center gap-1.5" title="Gemini Document Analysis Engine">
            <span className="text-muted-foreground">Gemini Doc:</span>
            {apiStatus?.services?.geminiDocument?.status === 'AVAILABLE' || apiStatus?.services?.geminiDocument?.configured ? (
              <span className="text-emerald-400 font-bold">● Active</span>
            ) : (
              <span className="text-muted-foreground">● Standby</span>
            )}
          </div>

          <div className="px-3 py-1 rounded-xl bg-black/40 border border-white/10 text-[11px] font-mono flex items-center gap-1.5" title="Gemini Audio Multimodal Engine">
            <span className="text-muted-foreground">Gemini Voice:</span>
            {apiStatus?.services?.geminiAudio?.status === 'AVAILABLE' || apiStatus?.services?.geminiAudio?.configured ? (
              <span className="text-emerald-400 font-bold">● Active</span>
            ) : (
              <span className="text-muted-foreground">● Standby</span>
            )}
          </div>
        </div>
      </div>

      {/* Mandatory Clinical Safety Boundary Notice */}
      <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/20 text-xs text-foreground/85 flex items-start sm:items-center gap-3">
        <Shield size={18} className="text-primary shrink-0 mt-0.5 sm:mt-0" />
        <span className="font-medium">
          {t('nirvana.disclaimer', 'NIRVANA provides intelligent health support and educational explanations only. It is not a replacement for a qualified healthcare professional and does not provide a definitive diagnosis or prescribe medication.')}
        </span>
      </div>

      {/* Emergency Alert Banner */}
      {emergencyAlert && (
        <div className="p-4 rounded-xl bg-red-500/20 border border-red-500/40 text-red-200 text-xs flex items-start gap-3 animate-pulse">
          <AlertTriangle size={20} className="text-red-400 shrink-0 mt-0.5" />
          <div>
            <strong className="block font-bold text-red-300 text-sm mb-0.5">
              {t('nirvana.emergency_alert_title', 'Emergency Triage Advisory')}
            </strong>
            {emergencyAlert}
          </div>
        </div>
      )}

      {/* 3 Major Interactive Modules in NIRVANA */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="nirvana-modules-container">
        {/* Module 1: CHAT WITH NIRVANA */}
        <button
          type="button"
          onClick={() => setActiveSection('chat')}
          id="nirvana-tab-chat"
          className={`text-left p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
            activeSection === 'chat'
              ? 'bg-primary/15 border-primary shadow-[0_0_25px_rgba(20,184,166,0.25)] ring-1 ring-primary/40'
              : 'bg-black/40 border-border hover:border-white/20 hover:bg-white/[0.03]'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 rounded-xl bg-primary/20 text-primary group-hover:scale-110 transition-transform">
              <Bot size={22} />
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/5 text-primary/80 border border-primary/25">
              {t('nirvana.card1_badge', 'Powered by Groq')}
            </span>
          </div>
          <h2 className="text-base font-bold text-white flex items-center gap-1.5">
            {t('nirvana.card1_title', '💬 CHAT WITH NIRVANA')}
          </h2>
          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
            {t('nirvana.card1_desc', 'Ask questions and receive intelligent assistance.')}
          </p>
        </button>

        {/* Module 2: TALK TO NIRVANA */}
        <button
          type="button"
          onClick={() => setActiveSection('voice')}
          id="nirvana-tab-voice"
          className={`text-left p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
            activeSection === 'voice'
              ? 'bg-violet-500/15 border-violet-400 shadow-[0_0_25px_rgba(167,139,250,0.25)] ring-1 ring-violet-400/40'
              : 'bg-black/40 border-border hover:border-white/20 hover:bg-white/[0.03]'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 rounded-xl bg-violet-500/20 text-violet-400 group-hover:scale-110 transition-transform">
              <Mic size={22} />
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/5 text-violet-300/80 border border-violet-500/25">
              {t('nirvana.card2_badge', 'Powered by Gemini')}
            </span>
          </div>
          <h2 className="text-base font-bold text-white flex items-center gap-1.5">
            {t('nirvana.card2_title', '🎤 TALK TO NIRVANA')}
          </h2>
          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
            {t('nirvana.card2_desc', 'Speak naturally and interact using your voice.')}
          </p>
        </button>

        {/* Module 3: ANALYZE MEDICAL DOCUMENT */}
        <button
          type="button"
          onClick={() => setActiveSection('document')}
          id="nirvana-tab-document"
          className={`text-left p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
            activeSection === 'document'
              ? 'bg-cyan-500/15 border-cyan-400 shadow-[0_0_25px_rgba(34,211,238,0.25)] ring-1 ring-cyan-400/40'
              : 'bg-black/40 border-border hover:border-white/20 hover:bg-white/[0.03]'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 group-hover:scale-110 transition-transform">
              <FileText size={22} />
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/5 text-cyan-300/80 border border-cyan-500/25">
              {t('nirvana.card3_badge', 'Powered by Gemini')}
            </span>
          </div>
          <h2 className="text-base font-bold text-white flex items-center gap-1.5">
            {t('nirvana.card3_title', '📄 ANALYZE MEDICAL DOCUMENT')}
          </h2>
          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
            {t('nirvana.card3_desc', 'Upload a medical document and receive a clear explanation.')}
          </p>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* MODULE 1: CHAT WITH NIRVANA (GROQ) */}
      {/* ========================================================================= */}
      {activeSection === 'chat' && (
        <LiquidGlassCard glow="none" className="p-0 overflow-hidden flex flex-col h-[600px]" id="nirvana-chat-container">
          {/* Header */}
          <div className="p-4 bg-black/40 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Bot size={20} className="text-primary" />
              <div>
                <h3 className="text-sm font-bold text-white">
                  {t('nirvana.chat_header', 'Chat with NIRVANA')}
                </h3>
                <span className="text-[11px] text-muted-foreground">
                  {t('nirvana.chat_engine_desc', 'Intelligent health inquiries & symptom clarification')}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                {t('nirvana.chat_controlled_badge', 'Clinical Health Guidance')}
              </span>
            </div>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatMessages.map(msg => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-xs leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-primary text-black font-medium shadow-md'
                      : msg.isEmergency
                      ? 'bg-red-500/10 border border-red-500/40 text-red-200'
                      : 'bg-white/5 border border-border text-foreground'
                  }`}
                >
                  {msg.content}
                </div>
                <div className="text-[10px] text-muted-foreground font-mono mt-1 px-1 flex items-center gap-2">
                  <span>{msg.timestamp}</span>
                  <span>• {msg.provider || 'NIRVANA'}</span>
                </div>
              </div>
            ))}

            {chatLoading && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground p-3 rounded-2xl bg-white/5 w-fit border border-border">
                <Activity size={14} className="animate-spin text-primary" />
                {t('nirvana.chat_responding', 'NIRVANA is responding...')}
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Starter Suggestions */}
          <div className="px-4 py-2 bg-black/20 border-t border-white/5 flex gap-2 overflow-x-auto text-[11px]">
            {[
              t('nirvana.suggestion_1', 'What questions should I ask my doctor for my visit?'),
              t('nirvana.suggestion_2', 'What precautions are needed before a fasting blood test?'),
              t('nirvana.suggestion_3', 'Explain what an elevated ESR or CRP level indicates')
            ].map((q, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setChatInput(q);
                }}
                className="px-3 py-1 rounded-full bg-white/5 border border-border hover:border-primary text-muted-foreground hover:text-white whitespace-nowrap transition-colors"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Chat Input */}
          <form onSubmit={handleSendChat} className="p-3 bg-black/40 border-t border-border flex gap-2">
            <input
              type="text"
              id="nirvana-chat-input"
              placeholder={t('nirvana.chat_placeholder', 'Ask NIRVANA any health-related question, prepare for consultation, or discuss symptoms...')}
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              disabled={chatLoading}
              className="flex-1 bg-white/5 border border-border rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-primary"
            />
            <LiquidGlassButton
              type="submit"
              variant="primary"
              size="sm"
              disabled={chatLoading || !chatInput.trim()}
              id="nirvana-chat-send-btn"
            >
              <Send size={14} /> {t('nirvana.chat_send_btn', 'Send')}
            </LiquidGlassButton>
          </form>
        </LiquidGlassCard>
      )}

      {/* ========================================================================= */}
      {/* MODULE 2: TALK TO NIRVANA (GEMINI AUDIO) */}
      {/* ========================================================================= */}
      {activeSection === 'voice' && (
        <LiquidGlassCard glow="none" className="max-w-3xl mx-auto p-8 text-center space-y-6" id="nirvana-voice-container">
          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full text-[10px] font-mono bg-violet-500/15 text-violet-300 border border-violet-500/30">
              {t('nirvana.card2_badge', 'Powered by Gemini')}
            </span>
            <h3 className="text-2xl font-bold text-white">
              {t('nirvana.voice_title', 'Talk to NIRVANA')}
            </h3>
            <p className="text-xs text-muted-foreground max-w-lg mx-auto leading-relaxed">
              {t('nirvana.voice_subtitle', 'Speak naturally in your preferred language (Hindi, Bengali, English). NIRVANA will listen, transcribe, and provide verbal preliminary guidance.')}
            </p>
          </div>

          {/* Microphone Record Button */}
          <div className="flex flex-col items-center justify-center py-6">
            <button
              type="button"
              id="nirvana-voice-record-btn"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={voiceLoading}
              className={`w-24 h-24 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                isRecording
                  ? 'bg-red-500 text-white shadow-2xl shadow-red-500/50 animate-pulse scale-110'
                  : 'bg-violet-600/30 hover:bg-violet-600/50 text-violet-300 border-2 border-violet-500/40 hover:scale-105'
              }`}
            >
              {isRecording ? <MicOff size={36} /> : <Mic size={36} />}
            </button>

            <span className="text-xs font-mono font-semibold mt-4 text-foreground">
              {isRecording
                ? t('nirvana.voice_listening', 'Listening... Click to Finish')
                : voiceLoading
                ? t('nirvana.voice_processing', 'NIRVANA is processing your voice with Gemini...')
                : t('nirvana.voice_click_start', 'Click to Start Speaking')}
            </span>
          </div>

          {voiceError && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs max-w-lg mx-auto">
              {voiceError}
            </div>
          )}

          {/* Results: Verbatim Transcript + English Translation + Audio Response */}
          {voiceTranscript && (
            <div className="p-6 rounded-2xl bg-white/5 border border-border text-left space-y-4 max-w-xl mx-auto">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Volume2 size={16} className="text-violet-400" />
                  {t('nirvana.voice_result_title', 'Voice Consultation Result')}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-foreground">
                  {t('nirvana.voice_lang_label', 'Language:')} {detectedLanguage?.toUpperCase()}
                </span>
              </div>

              {originalVoiceText && (
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-mono block">
                    {t('nirvana.voice_transcript_label', 'Original Spoken Transcript:')}
                  </span>
                  <p className="text-sm font-semibold text-white mt-0.5 italic">"{originalVoiceText}"</p>
                </div>
              )}

              {voiceTranscript !== originalVoiceText && (
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-mono block">
                    {t('nirvana.voice_translation_label', 'Clinical English Translation:')}
                  </span>
                  <p className="text-xs text-primary font-mono mt-0.5">{voiceTranscript}</p>
                </div>
              )}

              {voiceResponseText && (
                <div className="pt-3 border-t border-white/10">
                  <span className="text-[10px] text-muted-foreground uppercase font-mono block">
                    {t('nirvana.voice_guidance_label', 'Guidance & Next Steps:')}
                  </span>
                  <p className="text-xs text-foreground mt-1 leading-relaxed">{voiceResponseText}</p>
                </div>
              )}

              {voiceEmergency && (
                <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-200 text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle size={16} className="text-red-400 shrink-0" />
                  {t('nirvana.voice_emergency', 'Urgent Emergency Attention Strongly Recommended')}
                </div>
              )}
            </div>
          )}
        </LiquidGlassCard>
      )}

      {/* ========================================================================= */}
      {/* MODULE 3: ANALYZE MEDICAL DOCUMENT (GEMINI DOCUMENT) */}
      {/* ========================================================================= */}
      {activeSection === 'document' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="nirvana-doc-container">
          {/* Document Upload & Extracted Results */}
          <LiquidGlassCard glow="none" className="space-y-5">
            <div>
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Upload size={16} className="text-cyan-400" />
                  {t('nirvana.doc_upload_title', 'Upload Report / Prescription')}
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                  {t('nirvana.card3_badge', 'Powered by Gemini')}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {t('nirvana.doc_subtitle', 'Upload your lab test, diagnostic scan, or prescription to receive a clear explanation.')}
              </p>
            </div>

            {/* Upload Area */}
            <label className="border-2 border-dashed border-border hover:border-cyan-400/50 rounded-2xl p-6 text-center cursor-pointer block transition-colors bg-white/[0.02]">
              <input
                type="file"
                id="nirvana-doc-upload-input"
                accept="image/*,.pdf"
                className="hidden"
                onChange={handleDocUpload}
                disabled={docUploading}
              />
              <FileText size={32} className="mx-auto text-cyan-400/80 mb-2" />
              <span className="text-xs font-semibold text-white block">
                {docUploading
                  ? t('nirvana.doc_upload_processing', 'NIRVANA is analyzing your document with Gemini...')
                  : docFile
                  ? docFile.name
                  : t('nirvana.doc_upload_prompt', 'Click or drag prescription / lab report to upload')}
              </span>
              <span className="text-[11px] text-muted-foreground block mt-1">
                {t('nirvana.doc_upload_types', 'Supports PDF, JPG, PNG medical documents')}
              </span>
            </label>

            {docError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
                {docError}
              </div>
            )}

            {/* Extracted Entities */}
            {docExtractedData ? (
              <div className="space-y-4 pt-4 border-t border-white/10 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">
                    {t('nirvana.doc_extracted_title', 'Extracted Clinical Entities')}
                  </span>
                  <ProvenanceBadge status="DOCUMENT_EXTRACTED" />
                </div>

                {docExtractedData.diagnoses && docExtractedData.diagnoses.length > 0 && (
                  <div className="p-3 rounded-xl bg-white/5 border border-border">
                    <span className="text-[11px] text-muted-foreground block uppercase font-mono">
                      {t('nirvana.doc_findings_label', 'Visible Diagnoses / Findings:')}
                    </span>
                    <span className="text-white font-semibold">{docExtractedData.diagnoses.join(', ')}</span>
                  </div>
                )}

                {docExtractedData.medications && docExtractedData.medications.length > 0 && (
                  <div className="p-3 rounded-xl bg-white/5 border border-border space-y-1">
                    <span className="text-[11px] text-muted-foreground block uppercase font-mono">
                      {t('nirvana.doc_meds_label', 'Prescribed Medications:')}
                    </span>
                    {docExtractedData.medications.map((m: any, idx: number) => (
                      <div key={idx} className="flex justify-between font-mono text-[11px] text-foreground">
                        <span>{m.name}</span>
                        <span className="text-cyan-300">{m.dosage} • {m.frequency}</span>
                      </div>
                    ))}
                  </div>
                )}

                {docExtractedData.investigations && docExtractedData.investigations.length > 0 && (
                  <div className="p-3 rounded-xl bg-white/5 border border-border space-y-1">
                    <span className="text-[11px] text-muted-foreground block uppercase font-mono">
                      {t('nirvana.doc_labs_label', 'Laboratory Investigations:')}
                    </span>
                    {docExtractedData.investigations.map((inv: any, idx: number) => (
                      <div key={idx} className="flex justify-between font-mono text-[11px]">
                        <span className="text-white">{inv.testName}</span>
                        <span className={inv.flag === 'HIGH' || inv.flag === 'LOW' ? 'text-amber-400 font-bold' : 'text-emerald-400'}>
                          {inv.resultValue} {inv.unit || ''}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-white/5 border border-border text-xs text-muted-foreground/70 italic">
                {t('nirvana.doc_empty_extracted', 'Upload a document above to see extracted entities, or ask questions directly using contextual medical analysis.')}
              </div>
            )}
          </LiquidGlassCard>

          {/* Ask Questions about THAT Document */}
          <LiquidGlassCard glow="none" className="flex flex-col h-[520px] p-0 overflow-hidden">
            <div className="p-4 bg-black/40 border-b border-border">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <HelpCircle size={16} className="text-cyan-400" />
                {t('nirvana.doc_qa_title', 'Ask Questions About Your Document')}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {t('nirvana.doc_qa_subtitle', 'NIRVANA provides clear explanations based on your uploaded document.')}
              </p>
            </div>

            {/* QA Conversation */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              {docChatHistory.length === 0 ? (
                <div className="text-center p-8 text-muted-foreground/60 italic space-y-2">
                  <p>{t('nirvana.doc_qa_empty', 'No questions asked yet about this document.')}</p>
                  <p className="text-[11px]">{t('nirvana.doc_qa_try_asking', 'Try asking:')}</p>
                  <div className="flex flex-col gap-1.5 max-w-xs mx-auto text-[11px] not-italic">
                    <button
                      type="button"
                      onClick={() => setDocQuestion(t('nirvana.doc_qa_sample_1', 'What medicines are written in this prescription?'))}
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-cyan-300 text-left border border-border"
                    >
                      "{t('nirvana.doc_qa_sample_1', 'What medicines are written in this prescription?')}"
                    </button>
                    <button
                      type="button"
                      onClick={() => setDocQuestion(t('nirvana.doc_qa_sample_2', 'What does my test result value mean?'))}
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-cyan-300 text-left border border-border"
                    >
                      "{t('nirvana.doc_qa_sample_2', 'What does my test result value mean?')}"
                    </button>
                  </div>
                </div>
              ) : (
                docChatHistory.map((item, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-white font-medium">
                      <strong className="text-cyan-300 block text-[10px] uppercase font-mono mb-1">
                        {t('nirvana.doc_qa_your_q', 'Your Question:')}
                      </strong>
                      {item.q}
                    </div>
                    <div className="p-3.5 rounded-xl bg-white/5 border border-border text-foreground leading-relaxed whitespace-pre-wrap">
                      <strong className="text-primary block text-[10px] uppercase font-mono mb-1">
                        {t('nirvana.doc_qa_answer', 'NIRVANA Explanation:')}
                      </strong>
                      {item.a}
                    </div>
                  </div>
                ))
              )}

              {docAsking && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground p-3 rounded-xl bg-white/5 border border-border">
                  <Activity size={14} className="animate-spin text-cyan-400" />
                  {t('nirvana.doc_qa_analyzing', 'NIRVANA is analyzing document context...')}
                </div>
              )}
            </div>

            {/* Form */}
            <form onSubmit={handleAskDocument} className="p-3 bg-black/40 border-t border-border flex gap-2">
              <input
                type="text"
                id="nirvana-doc-qa-input"
                placeholder={t('nirvana.doc_qa_placeholder', 'Ask NIRVANA about medications, dates, or laboratory results in this document...')}
                value={docQuestion}
                onChange={e => setDocQuestion(e.target.value)}
                disabled={docAsking}
                className="flex-1 bg-white/5 border border-border rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400"
              />
              <LiquidGlassButton
                type="submit"
                variant="secondary"
                size="sm"
                disabled={docAsking || !docQuestion.trim()}
                id="nirvana-doc-qa-send-btn"
              >
                <Send size={14} /> {t('nirvana.doc_qa_ask_btn', 'Ask')}
              </LiquidGlassButton>
            </form>
          </LiquidGlassCard>
        </div>
      )}
    </div>
  );
};
