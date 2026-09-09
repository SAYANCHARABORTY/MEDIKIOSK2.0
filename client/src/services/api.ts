import {
  Patient,
  Encounter,
  OPDQueueEntry,
  ClinicalSummary,
  ConsentRecord,
  SupportedLanguage,
  UserRole
} from '@medikiosk/shared';

const API_BASE = '/api';

function getHeaders(): HeadersInit {
  const token = localStorage.getItem('medikiosk_token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const api = {
  // Authentication
  auth: {
    login: async (credentials: { username: string; password: string }) => {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Login failed');
      }
      const data = await res.json();
      localStorage.setItem('medikiosk_token', data.token);
      localStorage.setItem('medikiosk_user', JSON.stringify(data.user));
      return data;
    },
    logout: async () => {
      try {
        await fetch(`${API_BASE}/auth/logout`, {
          method: 'POST',
          headers: getHeaders()
        });
      } finally {
        localStorage.removeItem('medikiosk_token');
        localStorage.removeItem('medikiosk_user');
      }
    },
    getMe: async () => {
      const res = await fetch(`${API_BASE}/auth/me`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Not authenticated');
      return res.json();
    }
  },

  // Patients
  patients: {
    search: async (q: string = ''): Promise<Patient[]> => {
      const res = await fetch(`${API_BASE}/patients?q=${encodeURIComponent(q)}`, {
        headers: getHeaders()
      });
      if (!res.ok) throw new Error('Failed to fetch patients');
      return res.json();
    },
    getById: async (id: string) => {
      const res = await fetch(`${API_BASE}/patients/${id}`, { headers: getHeaders() });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 401) throw new Error('Authentication required (401). Please sign in.');
        if (res.status === 403) throw new Error(data.error || 'Access forbidden (403). Insufficient permissions.');
        if (res.status === 404) throw new Error(data.error || 'Patient not found (404).');
        throw new Error(data.error || `Failed to fetch patient (HTTP ${res.status})`);
      }
      return res.json();
    },
    create: async (data: Partial<Patient>): Promise<Patient> => {
      const res = await fetch(`${API_BASE}/patients`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to register patient');
      }
      return res.json();
    },
    update: async (id: string, data: Partial<Patient>): Promise<Patient> => {
      const res = await fetch(`${API_BASE}/patients/${id}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to update patient');
      }
      return res.json();
    },
    delete: async (id: string) => {
      const res = await fetch(`${API_BASE}/patients/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) {
        if (res.status === 401) throw new Error('Authentication required. Please sign in as an administrator.');
        if (res.status === 403) throw new Error(data.error || 'You are not authorized to delete this patient.');
        if (res.status === 404) throw new Error(data.error || 'Patient not found.');
        throw new Error(data.error || `Delete failed with HTTP ${res.status}`);
      }
      return data;
    }
  },

  // Encounters
  encounters: {
    create: async (data: Record<string, any>) => {
      const res = await fetch(`${API_BASE}/encounters`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to create encounter');
      }
      return res.json();
    },
    getById: async (id: string) => {
      const res = await fetch(`${API_BASE}/encounters/${id}`, { headers: getHeaders() });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 401) throw new Error('Authentication required (401). Please sign in.');
        if (res.status === 403) throw new Error(data.error || 'Access forbidden (403). Insufficient permissions.');
        if (res.status === 404) throw new Error(data.error || 'Encounter not found (404).');
        throw new Error(data.error || `Failed to fetch encounter (HTTP ${res.status})`);
      }
      return res.json();
    }
  },

  // OPD Queue
  queue: {
    getAll: async (status?: string): Promise<OPDQueueEntry[]> => {
      const url = status ? `${API_BASE}/queue?status=${status}` : `${API_BASE}/queue`;
      const res = await fetch(url, { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch OPD queue');
      return res.json();
    },
    updateStatus: async (id: string, status: string) => {
      const res = await fetch(`${API_BASE}/queue/${id}/status`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error('Failed to update queue status');
      return res.json();
    }
  },

  // AI Services (Strictly separated per Spec 6)
  ai: {
    clinicalChat: async (input: string, context?: Record<string, any>, language: SupportedLanguage = 'en') => {
      const res = await fetch(`${API_BASE}/ai/clinical-chat`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ input, context, language })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Clinical AI unavailable');
      }
      return data.data;
    },
    audioSpeech: async (audioBase64: string, mimeType: string = 'audio/webm', language: SupportedLanguage = 'en') => {
      const res = await fetch(`${API_BASE}/ai/audio`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ audioBase64, mimeType, language })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Audio speech processing unavailable');
      }
      return data.data;
    }
  },

  // Documents
  documents: {
    upload: async (formData: FormData) => {
      const token = localStorage.getItem('medikiosk_token');
      const headers: HeadersInit = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      let res: Response;
      try {
        res = await fetch(`${API_BASE}/documents/upload`, {
          method: 'POST',
          headers,
          body: formData
        });
      } catch (networkErr: any) {
        throw new Error(`Network error connecting to backend: ${networkErr.message}. Ensure MediKiosk server is running.`);
      }

      let payload: any = {};
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        payload = await res.json().catch(() => ({}));
      } else {
        const text = await res.text().catch(() => '');
        payload = { error: text || `Server error (${res.status})` };
      }

      if (!res.ok) {
        if (res.status === 413) {
          throw new Error('File is too large. Maximum size is 25MB.');
        }
        if (res.status === 415) {
          throw new Error(payload.error || 'Unsupported file type. Upload PDF, PNG, or JPG/JPEG only.');
        }
        throw new Error(payload.error || payload.message || `Upload failed with HTTP ${res.status}`);
      }
      return payload;
    },
    process: async (docId: string) => {
      let res: Response;
      try {
        res = await fetch(`${API_BASE}/documents/${docId}/process`, {
          method: 'POST',
          headers: getHeaders()
        });
      } catch (networkErr: any) {
        throw new Error(`Network error during document processing: ${networkErr.message}`);
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Document processing failed');
      }
      return data;
    },
    getDownloadUrl: (docId: string) => `${API_BASE}/documents/${docId}/download`,
    getViewUrl: (docId: string) => `${API_BASE}/documents/${docId}/view`
  },

  // Summaries
  summaries: {
    generate: async (encounterId: string): Promise<ClinicalSummary> => {
      const res = await fetch(`${API_BASE}/summaries/generate`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ encounterId })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to generate summary');
      }
      return res.json();
    },
    verify: async (summaryId: string, updates: Record<string, any>) => {
      const res = await fetch(`${API_BASE}/summaries/${summaryId}/verify`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(updates)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Verification failed');
      }
      return res.json();
    }
  },

  // Consents
  consents: {
    create: async (data: { patientId: string; category: string; captureMethod?: string; purpose?: string }) => {
      const res = await fetch(`${API_BASE}/consents`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to record consent');
      return res.json();
    },
    getByPatient: async (patientId: string): Promise<ConsentRecord[]> => {
      const res = await fetch(`${API_BASE}/consents/${patientId}`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch patient consents');
      return res.json();
    },
    revoke: async (consentId: string) => {
      const res = await fetch(`${API_BASE}/consents/${consentId}/revoke`, {
        method: 'POST',
        headers: getHeaders()
      });
      if (!res.ok) throw new Error('Failed to revoke consent');
      return res.json();
    }
  },

  // Admin & Demo Data Management (Spec 45, 46, 58)
  admin: {
    getAnalytics: async () => {
      const res = await fetch(`${API_BASE}/admin/analytics`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch analytics');
      return res.json();
    },
    getSystemStatus: async () => {
      const res = await fetch(`${API_BASE}/admin/system-status`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch system status');
      return res.json();
    },
    resetDemoData: async () => {
      const res = await fetch(`${API_BASE}/admin/reset-demo-data`, {
        method: 'POST',
        headers: getHeaders()
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Demo reset failed');
      }
      return res.json();
    },
    clearDemoAudit: async () => {
      const res = await fetch(`${API_BASE}/admin/clear-demo-audit`, {
        method: 'POST',
        headers: getHeaders()
      });
      if (!res.ok) throw new Error('Failed to clear audit log');
      return res.json();
    },
    getAuditLogs: async (limit: number = 100) => {
      const res = await fetch(`${API_BASE}/audit?limit=${limit}`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch audit logs');
      return res.json();
    }
  },

  // FHIR & Sharing
  fhir: {
    exportEncounter: async (encounterId: string) => {
      const res = await fetch(`${API_BASE}/fhir/export/${encounterId}`, {
        method: 'POST',
        headers: getHeaders()
      });
      if (!res.ok) throw new Error('Failed to export FHIR bundle');
      return res.json();
    },
    createShare: async (patientId: string, durationHours: number = 24) => {
      const res = await fetch(`${API_BASE}/shares`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ patientId, durationHours })
      });
      if (!res.ok) throw new Error('Failed to create record share');
      return res.json();
    },
    getShared: async (token: string) => {
      const res = await fetch(`${API_BASE}/shares/${token}`);
      if (!res.ok) throw new Error('Invalid or expired record share');
      return res.json();
    }
  },

  // AI & External Integrations Health / Status (Spec: /api/v1/integrations/ai/*)
  integrations: {
    getAiStatus: async () => {
      const res = await fetch(`${API_BASE}/v1/integrations/ai/status`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch AI integration status');
      return res.json();
    },
    testAi: async (provider: 'all' | 'geminiDocument' | 'geminiAudio' | 'groq' = 'all') => {
      const res = await fetch(`${API_BASE}/v1/integrations/ai/test`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ provider })
      });
      if (!res.ok) throw new Error('Failed to test AI provider');
      return res.json();
    }
  }
};
