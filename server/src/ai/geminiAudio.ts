export interface AudioTranscriptionResult {
  transcript: string;
  originalTranscript: string;
  detectedLanguage: string;
  translatedEnglish?: string;
  confidence?: number;
  timestamp: string;
}

export async function processAudioSpeech(
  audioBuffer: Buffer,
  mimeType: string,
  preferredLanguage: string = 'en'
): Promise<AudioTranscriptionResult> {
  const apiKey = process.env.GEMINI_AUDIO_API_KEY || process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey.trim() === '') {
    throw new Error(
      'AUDIO_AI_NOT_CONFIGURED: GEMINI_AUDIO_API_KEY is not configured in backend environment. Speech-to-text service is unavailable. Please continue by typing your answer.'
    );
  }

  try {
    const base64Audio = audioBuffer.toString('base64');
    const prompt = `You are a medical speech-to-text and translation engine for MediKiosk.
The user speaks in an Indian regional language (e.g. Bengali, Hindi, or English).
1. Transcribe the exact spoken words into 'originalTranscript'. Do NOT invent or alter symptoms.
2. If the language is not English (e.g. Bengali or Hindi), translate the clinical statement into clear English as 'translatedEnglish'.
3. Detect the ISO-639-1 language code as 'detectedLanguage'.
4. Set 'transcript' to the translatedEnglish if present, otherwise originalTranscript.

Return ONLY a valid JSON object:
{
  "originalTranscript": "string",
  "detectedLanguage": "en|hi|bn|...",
  "translatedEnglish": "string",
  "transcript": "string",
  "confidence": 0.95
}`;

    const candidateModels = [
      process.env.GEMINI_AUDIO_MODEL || 'gemini-3.5-flash',
      'gemini-3.6-flash',
      'gemini-3.8-flash',
      'gemini-flash-latest'
    ];

    let lastError: string | null = null;
    let text: string | null = null;

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
                        mimeType: mimeType || 'audio/webm',
                        data: base64Audio
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
          text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) break;
        } else {
          const errorText = await response.text();
          console.warn(`[GeminiAudio] Model ${modelName} returned status ${response.status}:`, errorText.slice(0, 120));
          lastError = `HTTP ${response.status}: ${errorText}`;
        }
      } catch (err: any) {
        lastError = err.message;
      }
    }

    if (!text) {
      throw new Error(`Gemini Audio returned empty transcription or error: ${lastError || 'Empty response.'}`);
    }

    const cleanJson = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
    const result = JSON.parse(cleanJson);
    return {
      transcript: result.transcript || result.originalTranscript || '',
      originalTranscript: result.originalTranscript || result.transcript || '',
      detectedLanguage: result.detectedLanguage || preferredLanguage,
      translatedEnglish: result.translatedEnglish || undefined,
      confidence: result.confidence || 0.95,
      timestamp: new Date().toISOString()
    };
  } catch (err: any) {
    console.error('[GeminiAudio Error]', err.message);
    throw new Error(`Voice processing is temporarily unavailable. ${err.message}`);
  }
}
