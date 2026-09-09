import { Request, Response } from 'express';
import { processAdaptiveClinicalHistory } from '../ai/groqClinical';
import { processAudioSpeech } from '../ai/geminiAudio';

export async function handleClinicalChat(req: Request, res: Response) {
  const { input, context, language = 'en' } = req.body;

  if (!input) {
    return res.status(400).json({ error: 'Clinical input is required.' });
  }

  try {
    const result = await processAdaptiveClinicalHistory(input, context || {}, language);
    return res.json({
      success: true,
      data: result
    });
  } catch (err: any) {
    // Return real error state per spec 71 & 100
    return res.status(503).json({
      success: false,
      error: err.message,
      code: 'CLINICAL_AI_UNAVAILABLE'
    });
  }
}

export async function handleAudioSpeech(req: Request, res: Response) {
  const { audioBase64, mimeType = 'audio/webm', language = 'en' } = req.body;

  if (!audioBase64) {
    return res.status(400).json({ error: 'audioBase64 is required.' });
  }

  try {
    const buffer = Buffer.from(audioBase64, 'base64');
    const result = await processAudioSpeech(buffer, mimeType, language);
    return res.json({
      success: true,
      data: result
    });
  } catch (err: any) {
    return res.status(503).json({
      success: false,
      error: err.message,
      code: 'SPEECH_SERVICE_UNAVAILABLE'
    });
  }
}
