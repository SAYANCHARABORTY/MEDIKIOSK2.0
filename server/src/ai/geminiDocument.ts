import fs from 'fs';
import path from 'path';

export interface DocumentExtractionResult {
  diagnoses: string[];
  medications: Array<{
    name: string;
    dosage: string;
    frequency: string;
    duration?: string;
  }>;
  investigations: Array<{
    testName: string;
    resultValue: string;
    unit?: string;
    referenceRange?: string;
    flag?: 'NORMAL' | 'LOW' | 'HIGH' | 'ATTENTION';
  }>;
  facility?: string;
  doctor?: string;
  documentDate?: string;
  clinicalAttentionFlags?: string[];
}

export async function processMedicalDocument(
  filePath: string,
  mimeType: string,
  documentType: string
): Promise<DocumentExtractionResult> {
  const apiKey = process.env.GEMINI_DOCUMENT_API_KEY || process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey.trim() === '') {
    throw new Error(
      'DOCUMENT_AI_NOT_CONFIGURED: GEMINI_DOCUMENT_API_KEY is not configured in backend environment. Real AI document extraction is disabled. Please enter details manually.'
    );
  }

  // Verify file exists
  if (!fs.existsSync(filePath)) {
    throw new Error(`DOCUMENT_FILE_NOT_FOUND: Could not locate file at ${filePath}`);
  }

  try {
    const fileBuffer = fs.readFileSync(filePath);
    const base64Data = fileBuffer.toString('base64');

    const prompt = `You are a specialized medical document extraction engine for Indian OPDs.
Extract clinical entities strictly as written from this ${documentType}.
CRITICAL CLINICAL SAFETY RULES:
1. NEVER independently diagnose. Extract ONLY diagnoses/conditions explicitly written in the source text.
2. If laboratory values are outside provided reference range, flag as 'LOW', 'HIGH', or 'ATTENTION'. Do NOT declare a definitive disease diagnosis.
3. DO NOT invent or guess missing information.
Return ONLY valid JSON matching this exact structure:
{
  "diagnoses": ["string"],
  "medications": [
    {
      "name": "string",
      "dosage": "string",
      "frequency": "string",
      "duration": "string or null"
    }
  ],
  "investigations": [
    {
      "testName": "string",
      "resultValue": "string",
      "unit": "string or null",
      "referenceRange": "string or null",
      "flag": "NORMAL" | "LOW" | "HIGH" | "ATTENTION"
    }
  ],
  "facility": "string or null",
  "doctor": "string or null",
  "documentDate": "YYYY-MM-DD or null",
  "clinicalAttentionFlags": ["string"]
}`;

    const candidateModels = [
      process.env.GEMINI_DOCUMENT_MODEL || 'gemini-3.5-flash',
      'gemini-3.6-flash',
      'gemini-3.8-flash',
      'gemini-flash-latest'
    ];

    let lastError: string | null = null;
    let candidateText: string | null = null;

    for (const modelName of candidateModels) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
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
                        mimeType: mimeType || 'application/pdf',
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
          candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (candidateText) {
            break;
          }
        } else {
          const errorText = await response.text();
          console.warn(`[GeminiDocumentAI] Model ${modelName} returned status ${response.status}:`, errorText.slice(0, 120));
          lastError = `HTTP ${response.status}: ${errorText}`;
        }
      } catch (err: any) {
        lastError = err.message;
      }
    }

    if (!candidateText) {
      throw new Error(`Gemini Document AI failed across candidate models. ${lastError || 'Empty response.'}`);
    }

    // Strip optional markdown fencing if present
    const cleanJson = candidateText.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
    const parsed: DocumentExtractionResult = JSON.parse(cleanJson);
    return parsed;
  } catch (err: any) {
    console.error('[GeminiDocumentAI Error]', err.message);
    throw new Error(`Document processing failed: ${err.message}`);
  }
}
