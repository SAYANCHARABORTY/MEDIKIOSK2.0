import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Helper to ensure fresh environment variable check
function ensureEnvLoaded() {
  const envCandidates = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '../.env'),
    path.resolve(__dirname, '../../.env'),
    path.resolve(__dirname, '../../../.env'),
    path.resolve(__dirname, '../../../../.env'),
  ];

  for (const candidate of envCandidates) {
    if (fs.existsSync(candidate)) {
      const parsed = dotenv.parse(fs.readFileSync(candidate));
      for (const [k, v] of Object.entries(parsed)) {
        if (!process.env[k] || process.env[k] === '') {
          process.env[k] = v;
        }
      }
      break;
    }
  }
}

export type ProviderStatus = 'NOT_CONFIGURED' | 'CONFIGURED' | 'CONNECTED' | 'CONNECTION_FAILED';

interface AiProviderInfo {
  provider: string;
  purpose: string;
  configured: boolean;
  status: ProviderStatus;
  connectionStatus?: string;
  httpStatus?: number;
  model?: string;
  message?: string;
  latencyMs?: number;
}

export function getAiKeys() {
  ensureEnvLoaded();
  const groqKey = process.env.GROQ_API_KEY?.trim() || '';
  const geminiDocKey = (process.env.GEMINI_DOCUMENT_API_KEY || process.env.GEMINI_API_KEY)?.trim() || '';
  const geminiAudioKey = (process.env.GEMINI_AUDIO_API_KEY || process.env.GEMINI_API_KEY)?.trim() || '';

  return { groqKey, geminiDocKey, geminiAudioKey };
}

/**
 * GET /api/v1/integrations/ai/status
 * GET /api/integrations/ai/status
 * Returns safe provider status without exposing secrets or keys
 */
export async function getAiIntegrationStatus(req: Request, res: Response) {
  const { groqKey, geminiDocKey, geminiAudioKey } = getAiKeys();

  const response: Record<string, AiProviderInfo> = {
    geminiDocument: {
      provider: 'Google Gemini Document AI',
      purpose: 'Prescription/report extraction and medical OCR understanding',
      configured: Boolean(geminiDocKey),
      status: geminiDocKey ? 'CONFIGURED' : 'NOT_CONFIGURED',
      message: geminiDocKey ? 'Key configured. Run test to verify live connection.' : 'GEMINI_DOCUMENT_API_KEY is not configured.'
    },
    geminiAudio: {
      provider: 'Google Gemini Audio',
      purpose: 'Multilingual speech-to-text and voice clinical interaction',
      configured: Boolean(geminiAudioKey),
      status: geminiAudioKey ? 'CONFIGURED' : 'NOT_CONFIGURED',
      connectionStatus: geminiAudioKey ? 'CONNECTION TEST REQUIRES AUDIO' : undefined,
      message: geminiAudioKey ? 'Key configured. Live connection test requires audio input.' : 'GEMINI_AUDIO_API_KEY is not configured.'
    },
    groq: {
      provider: 'Groq (LLaMA 3)',
      purpose: 'Clinical conversational reasoning, adaptive questioning, and summary drafting',
      configured: Boolean(groqKey),
      status: groqKey ? 'CONFIGURED' : 'NOT_CONFIGURED',
      message: groqKey ? 'Key configured. Run test to verify live connection.' : 'GROQ_API_KEY is not configured.'
    },
  };

  return res.json(response);
}

/**
 * POST /api/v1/integrations/ai/test
 * POST /api/integrations/ai/test
 * Performs minimal real API health check against specified or all providers.
 * NEVER returns API keys or full response dumps.
 */
export async function testAiIntegration(req: Request, res: Response) {
  const { provider = 'all' } = req.body || {};
  const { groqKey, geminiDocKey, geminiAudioKey } = getAiKeys();

  const results: Record<string, AiProviderInfo> = {};

  // Test Gemini Document AI
  if (provider === 'all' || provider === 'geminiDocument') {
    if (!geminiDocKey) {
      results.geminiDocument = {
        provider: 'Google Gemini Document AI',
        purpose: 'Prescription/report extraction and medical OCR understanding',
        configured: false,
        status: 'NOT_CONFIGURED',
        message: 'GEMINI_DOCUMENT_API_KEY is not configured in backend environment.',
      };
    } else {
      const startTime = Date.now();
      const candidateModels = [
        process.env.GEMINI_DOCUMENT_MODEL || 'gemini-3.5-flash',
        'gemini-3.6-flash',
        'gemini-3.8-flash',
        'gemini-flash-latest'
      ];
      let success = false;
      let usedModel = candidateModels[0];
      let lastStatus = 0;
      let lastError = '';

      for (const model of candidateModels) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 9000);
          const resp = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiDocKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: 'Health check' }] }]
              }),
              signal: controller.signal
            }
          );
          clearTimeout(timeout);
          lastStatus = resp.status;
          usedModel = model;

          if (resp.ok) {
            success = true;
            break;
          } else {
            const errData = await resp.json().catch(() => ({}));
            lastError = errData?.error?.message || `HTTP ${resp.status}`;
          }
        } catch (err: any) {
          lastError = err.name === 'AbortError' ? 'Timeout after 9s' : err.message;
        }
      }

      const latencyMs = Date.now() - startTime;
      if (success) {
        results.geminiDocument = {
          provider: 'Google Gemini Document AI',
          purpose: 'Prescription/report extraction and medical OCR understanding',
          configured: true,
          status: 'CONNECTED',
          httpStatus: 200,
          model: usedModel,
          latencyMs,
          message: 'Provider connected and responding.',
        };
      } else {
        results.geminiDocument = {
          provider: 'Google Gemini Document AI',
          purpose: 'Prescription/report extraction and medical OCR understanding',
          configured: true,
          status: 'CONNECTION_FAILED',
          httpStatus: lastStatus || 503,
          model: usedModel,
          latencyMs,
          message: `Provider connection failed (${lastError}).`,
        };
      }
    }
  }

  // Test Gemini Audio AI
  if (provider === 'all' || provider === 'geminiAudio') {
    if (!geminiAudioKey) {
      results.geminiAudio = {
        provider: 'Google Gemini Audio',
        purpose: 'Multilingual speech-to-text and voice clinical interaction',
        configured: false,
        status: 'NOT_CONFIGURED',
        message: 'GEMINI_AUDIO_API_KEY is not configured in backend environment.',
      };
    } else {
      // Audio test cannot be fabricated without audio input per Spec 7
      results.geminiAudio = {
        provider: 'Google Gemini Audio',
        purpose: 'Multilingual speech-to-text and voice clinical interaction',
        configured: true,
        status: 'CONFIGURED',
        connectionStatus: 'CONNECTION TEST REQUIRES AUDIO',
        message: 'CONFIGURED — CONNECTION TEST REQUIRES AUDIO (Live verification occurs during voice input).',
      };
    }
  }

  // Test Groq Clinical Engine
  if (provider === 'all' || provider === 'groq') {
    if (!groqKey) {
      results.groq = {
        provider: 'Groq (LLaMA 3)',
        purpose: 'Clinical conversational reasoning, adaptive questioning, and summary drafting',
        configured: false,
        status: 'NOT_CONFIGURED',
        message: 'GROQ_API_KEY is not configured in backend environment.',
      };
    } else {
      const startTime = Date.now();
      const model = process.env.GROQ_MODEL || 'qwen/qwen3.8-27b';
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 9000);
        const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${groqKey}`
          },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: 'Ping' }],
            max_tokens: 5
          }),
          signal: controller.signal,
        });
        clearTimeout(timeout);
        const latencyMs = Date.now() - startTime;

        if (resp.ok) {
          results.groq = {
            provider: 'Groq (LLaMA 3)',
            purpose: 'Clinical conversational reasoning, adaptive questioning, and summary drafting',
            configured: true,
            status: 'CONNECTED',
            httpStatus: 200,
            model,
            latencyMs,
            message: 'Provider connected and responding.',
          };
        } else {
          const errData = await resp.json().catch(() => ({}));
          results.groq = {
            provider: 'Groq (LLaMA 3)',
            purpose: 'Clinical conversational reasoning, adaptive questioning, and summary drafting',
            configured: true,
            status: 'CONNECTION_FAILED',
            httpStatus: resp.status,
            model,
            latencyMs,
            message: `Provider rejected request (${errData?.error?.message || `HTTP ${resp.status}`}).`,
          };
        }
      } catch (err: any) {
        results.groq = {
          provider: 'Groq (LLaMA 3)',
          purpose: 'Clinical conversational reasoning, adaptive questioning, and summary drafting',
          configured: true,
          status: 'CONNECTION_FAILED',
          message: err.name === 'AbortError' ? 'Request timed out after 9s.' : 'Network connection failure.',
        };
      }
    }
  }

  return res.json(results);
}
