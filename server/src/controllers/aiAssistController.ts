import { Request, Response } from 'express';
import { getAiKeys } from './integrationController';

/**
 * Controlled clinical system prompt for patient-facing health inquiries.
 * Strict boundary: NEVER diagnose, NEVER prescribe, flag red flags immediately.
 */
const CLINICAL_CHAT_SYSTEM_PROMPT = `You are the MediKiosk AI Health Assistant.
You provide preliminary health information, symptom clarification, medical term explanation, and consultation preparation for patients visiting an outpatient clinic.

STRICT MEDICAL & ETHICAL SAFETY BOUNDARIES:
1. You are NOT a doctor and cannot provide a definitive medical diagnosis.
2. NEVER prescribe medication, recommend specific drug dosages, or alter existing prescriptions.
3. NEVER claim absolute certainty about any medical condition.
4. For any emergency or red-flag symptoms (such as severe chest pain radiating to the jaw/arm, sudden weakness or numbness on one side, severe shortness of breath, sudden severe headache, coughing blood, high fever with stiff neck, or loss of consciousness):
   - Immediately and prominently instruct the patient to seek urgent in-person emergency medical care or alert hospital staff.
5. Emphasize that all guidance must be confirmed with a licensed healthcare professional during their OPD visit.
6. Provide supportive, clear, easy-to-understand explanations of medical concepts.`;

/**
 * 1. CHAT ASSIST — GROQ API
 */
export async function handleGroqChatAssist(req: Request, res: Response) {
  const { message, history = [], language = 'en' } = req.body;

  if (!message || typeof message !== 'string' || message.trim() === '') {
    return res.status(400).json({ error: 'Message is required' });
  }

  const { groqKey } = getAiKeys();
  if (!groqKey) {
    console.error('[AI] Groq Chat Assist failed: GROQ_AUTH_ERROR (Missing GROQ_API_KEY)');
    return res.status(503).json({
      error: 'AI service is currently unavailable.',
      code: 'GROQ_AUTH_ERROR',
      provider: 'Groq'
    });
  }

  console.log('[AI] Groq request started');
  const startTime = Date.now();

  try {
    const model = process.env.GROQ_MODEL || 'qwen/qwen3.8-27b';

    // Check for red flags in user message
    const lower = message.toLowerCase();
    const isEmergency = 
      (lower.includes('chest pain') && (lower.includes('arm') || lower.includes('breath') || lower.includes('sweat'))) ||
      (lower.includes('stroke') || lower.includes('facial droop') || lower.includes('paralysis') || lower.includes('slurred speech')) ||
      (lower.includes('severe breathlessness') || lower.includes('cannot breathe') || lower.includes('choking')) ||
      (lower.includes('coughing blood') || lower.includes('vomiting blood'));

    // Format chat messages
    const formattedMessages = [
      { role: 'system', content: `${CLINICAL_CHAT_SYSTEM_PROMPT}\nPatient preferred language: ${language}. Respond warmly, clearly, and concisely in the patient's language.` },
      ...history.slice(-6).map((h: any) => ({
        role: h.role === 'user' ? 'user' : 'assistant',
        content: String(h.content || '')
      })),
      { role: 'user', content: message }
    ];

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqKey}`
      },
      body: JSON.stringify({
        model,
        messages: formattedMessages,
        temperature: 0.2,
        max_tokens: 800
      })
    });

    if (!groqRes.ok) {
      const errBody = await groqRes.text();
      console.error(`[AI] Groq API returned error status ${groqRes.status}:`, errBody);
      if (groqRes.status === 401 || groqRes.status === 403) {
        return res.status(502).json({
          error: 'AI service is currently unavailable.',
          code: 'GROQ_AUTH_ERROR',
          provider: 'Groq'
        });
      }
      if (groqRes.status === 429) {
        return res.status(429).json({
          error: 'AI service is experiencing high traffic. Please try again shortly.',
          code: 'RATE_LIMITED',
          provider: 'Groq'
        });
      }
      return res.status(502).json({
        error: 'AI service is currently unavailable.',
        code: 'PROVIDER_UNAVAILABLE',
        provider: 'Groq'
      });
    }

    const data = await groqRes.json();
    const replyText = data.choices?.[0]?.message?.content || 'Thank you. Please consult your physician for personalized medical advice.';
    const latencyMs = Date.now() - startTime;

    console.log(`[AI] Groq response received (${latencyMs}ms)`);

    return res.json({
      reply: replyText,
      isEmergency,
      provider: 'Groq',
      model,
      latencyMs,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    console.error('[AI] Groq request error:', err.message);
    return res.status(500).json({
      error: 'AI service is currently unavailable.',
      code: 'PROVIDER_UNAVAILABLE',
      provider: 'Groq'
    });
  }
}

/**
 * 2. DOCUMENT & RESULT CHAT — GEMINI DOCUMENT API
 */
export async function handleDocumentChatAssist(req: Request, res: Response) {
  const { question, documentContext, extractedData, history = [], language = 'en' } = req.body;

  if (!question || typeof question !== 'string' || question.trim() === '') {
    return res.status(400).json({ error: 'Question is required' });
  }

  const { geminiDocKey } = getAiKeys();
  if (!geminiDocKey) {
    console.error('[AI] Gemini Document Chat failed: GEMINI_DOCUMENT_AUTH_ERROR (Missing GEMINI_DOCUMENT_API_KEY)');
    return res.status(503).json({
      error: 'Unable to process this document. Document AI is not configured.',
      code: 'GEMINI_DOCUMENT_AUTH_ERROR',
      provider: 'Gemini Document'
    });
  }

  console.log('[AI] Gemini Document request started');
  const startTime = Date.now();

  try {
    const langInstructions = language === 'bn' 
      ? 'LANGUAGE: The patient preferred language is Bengali (বাংলা). Provide your entire response clearly in natural Bengali script.'
      : language === 'hi'
      ? 'LANGUAGE: The patient preferred language is Hindi (हिन्दी). Provide your entire response clearly in natural Devanagari Hindi script.'
      : 'LANGUAGE: The patient preferred language is English.';

    const prompt = `You are a medical document reading and explanation assistant for patients at MediKiosk.
The patient is asking questions about their uploaded medical document, lab report, or prescription.

${langInstructions}

GROUNDING RULES:
1. Base your answer EXCLUSIVELY on the visible document information provided below.
2. Clearly distinguish between:
   - "Document Extracted": What is explicitly stated in the document.
   - "AI Explanation": Educational context explaining what the test or term generally means in simple language.
   - "Physician Verification": Clearly state that this interpretation must be verified with their doctor.
3. NEVER formulate a new diagnosis or prescribe medications.
4. If the question asks about something NOT in the document, explicitly reply: "This information is not visible in the provided document. Please ask your doctor."
5. Never fabricate values or test results.

DOCUMENT INFORMATION:
${documentContext || (extractedData ? JSON.stringify(extractedData, null, 2) : 'No document text available')}

PATIENT QUESTION:
"${question}"

Provide a clear, reassuring, structured explanation with headings or bullet points in the patient's preferred language.`;

    const candidateModels = [
      process.env.GEMINI_DOCUMENT_MODEL || 'gemini-3.5-flash',
      'gemini-3.6-flash',
      'gemini-3.8-flash',
      'gemini-flash-latest'
    ];

    let lastError = null;
    let answer = null;
    let successfulModel = '';

    for (const modelName of candidateModels) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiDocKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  parts: [{ text: prompt }]
                }
              ],
              generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 800
              }
            })
          }
        );

        if (response.ok) {
          const data = await response.json();
          answer = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (answer) {
            successfulModel = modelName;
            break;
          }
        } else {
          const errText = await response.text();
          console.warn(`[AI] Gemini Document model ${modelName} returned ${response.status}:`, errText.slice(0, 100));
          lastError = `${response.status}: ${errText}`;
        }
      } catch (e: any) {
        lastError = e.message;
      }
    }

    if (!answer) {
      console.error('[AI] Gemini Document error across candidates:', lastError);
      return res.status(502).json({
        error: 'Unable to process this document.',
        code: 'PROVIDER_UNAVAILABLE',
        provider: 'Gemini Document'
      });
    }

    const latencyMs = Date.now() - startTime;
    console.log(`[AI] Gemini Document response received (${latencyMs}ms)`);

    return res.json({
      answer,
      provider: 'Gemini Document',
      provenance: 'AI_EXPLANATION',
      latencyMs,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    console.error('[AI] Gemini Document error:', err.message);
    return res.status(500).json({
      error: 'Unable to process this document.',
      code: 'PROVIDER_UNAVAILABLE',
      provider: 'Gemini Document'
    });
  }
}

/**
 * 3. VOICE ASSIST — GEMINI AUDIO API
 */
export async function handleVoiceAssist(req: Request, res: Response) {
  const { geminiAudioKey } = getAiKeys();
  if (!geminiAudioKey) {
    console.error('[AI] Gemini Audio failed: GEMINI_AUDIO_AUTH_ERROR (Missing GEMINI_AUDIO_API_KEY)');
    return res.status(503).json({
      error: 'Voice service is currently unavailable.',
      code: 'GEMINI_AUDIO_AUTH_ERROR',
      provider: 'Gemini Audio'
    });
  }

  // Expect audio in req.file (from multer) or base64 in req.body.audioBase64
  let audioBuffer: Buffer | null = null;
  let mimeType = 'audio/webm';

  if (req.file) {
    audioBuffer = req.file.buffer || require('fs').readFileSync(req.file.path);
    mimeType = req.file.mimetype || mimeType;
  } else if (req.body.audioBase64) {
    audioBuffer = Buffer.from(req.body.audioBase64, 'base64');
    mimeType = req.body.mimeType || mimeType;
  }

  if (!audioBuffer) {
    return res.status(400).json({
      error: 'Audio input is required.',
      code: 'INVALID_REQUEST'
    });
  }

  console.log('[AI] Gemini Audio request started');
  const startTime = Date.now();
  const language = req.body?.language || req.query?.language || 'auto';

  try {
    const base64Data = audioBuffer.toString('base64');
    const langRequirement = language && language !== 'auto'
      ? `The user prefers the response in ${language === 'bn' ? 'Bengali (বাংলা)' : language === 'hi' ? 'Hindi (हिन्दी)' : 'English'}. Provide "responseText" in that language.`
      : `Provide "responseText" in the same language that the patient spoke.`;

    const prompt = `You are MediKiosk Voice Health Assistant.
The patient is speaking their health inquiry or symptoms in an Indian language (e.g. Hindi, Bengali, Tamil, English, etc.).
Task:
1. Accurately transcribe the exact spoken words into "originalTranscript". NEVER fabricate or guess symptoms.
2. Detect the ISO language code as "detectedLanguage" (e.g. 'hi', 'bn', 'en', etc.).
3. Translate the spoken words into clear medical English as "translatedEnglish".
4. Formulate a brief, helpful, comforting response answering their health inquiry or explaining next steps for their OPD visit as "responseText". ${langRequirement} Follow the medical safety rule: NEVER diagnose or prescribe.
5. If emergency symptoms are mentioned, explicitly flag "isEmergency": true.

Return ONLY a valid JSON object:
{
  "originalTranscript": "exact words spoken",
  "detectedLanguage": "language code",
  "translatedEnglish": "English translation",
  "responseText": "safe healthcare guidance response",
  "isEmergency": false
}`;

    const candidateModels = [
      process.env.GEMINI_AUDIO_MODEL || 'gemini-3.5-flash',
      'gemini-3.6-flash',
      'gemini-3.8-flash',
      'gemini-flash-latest'
    ];

    let rawText = null;
    let lastError = null;

    for (const modelName of candidateModels) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiAudioKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    { text: prompt },
                    {
                      inlineData: {
                        mimeType,
                        data: base64Data
                      }
                    }
                  ]
                }
              ],
              generationConfig: {
                temperature: 0.1,
                responseMimeType: 'application/json'
              }
            })
          }
        );

        if (response.ok) {
          const data = await response.json();
          rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) break;
        } else {
          const errText = await response.text();
          console.warn(`[AI] Gemini Audio model ${modelName} returned ${response.status}:`, errText.slice(0, 100));
          lastError = `${response.status}: ${errText}`;
        }
      } catch (e: any) {
        lastError = e.message;
      }
    }

    if (!rawText) {
      console.error('[AI] Gemini Audio error across candidates:', lastError);
      return res.status(502).json({
        error: 'Voice service is currently unavailable.',
        code: 'PROVIDER_UNAVAILABLE',
        provider: 'Gemini Audio'
      });
    }

    const parsed = JSON.parse(rawText);
    const latencyMs = Date.now() - startTime;
    console.log(`[AI] Gemini Audio response received (${latencyMs}ms)`);

    return res.json({
      originalTranscript: parsed.originalTranscript || '',
      detectedLanguage: parsed.detectedLanguage || 'en',
      translatedEnglish: parsed.translatedEnglish || parsed.originalTranscript || '',
      responseText: parsed.responseText || 'Your voice input has been recorded for your consultation.',
      isEmergency: Boolean(parsed.isEmergency),
      provider: 'Gemini Audio',
      latencyMs,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    console.error('[AI] Gemini Audio error:', err.message);
    return res.status(500).json({
      error: 'Voice service is currently unavailable.',
      code: 'PROVIDER_UNAVAILABLE',
      provider: 'Gemini Audio'
    });
  }
}
