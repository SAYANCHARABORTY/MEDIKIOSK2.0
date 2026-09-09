export interface AdaptiveHpiResult {
  chiefComplaint: string;
  duration: string;
  associatedSymptoms: string[];
  socratesHpi: {
    site?: string;
    onset?: string;
    character?: string;
    radiation?: string;
    associatedSymptoms?: string[];
    timing?: string;
    exacerbatingFactors?: string;
    relievingFactors?: string;
    severity?: number;
  };
  followUpQuestions: string[];
  clinicalAttentionFlags: string[];
}

export interface GeneratedSummaryResult {
  chiefComplaintSummary: string;
  hpiSummary: string;
  pastMedicalSummary: string;
  medicationsSummary: string;
  allergiesSummary: string;
  rosSummary: string;
  investigationsSummary: string;
  ayushSummary?: string;
  clinicalAttentionFlags: string[];
}

export async function processAdaptiveClinicalHistory(
  patientInput: string,
  currentContext: Record<string, unknown>,
  language: string = 'en'
): Promise<AdaptiveHpiResult> {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey || apiKey.trim() === '') {
    throw new Error(
      'GROQ_CLINICAL_NOT_CONFIGURED: GROQ_API_KEY is not configured in backend environment. AI conversational adaptive questioning is unavailable.'
    );
  }

  try {
    const systemPrompt = `You are an AI Clinical Assistant for MediKiosk (pre-consultation case-taking).
Your purpose is to structure the patient's symptoms into clinical terminology for physician review.
CRITICAL SAFETY RULES:
1. NEVER diagnose or prescribe.
2. Structure the input into Chief Complaint, Duration, and SOCRATES HPI (Site, Onset, Character, Radiation, Associated symptoms, Timing, Exacerbating/relieving factors, Severity 1-10).
3. If red flags are present (e.g. chest pain + shortness of breath/radiation to arm, sudden severe headache, altered sensorium, severe respiratory distress), flag them in 'clinicalAttentionFlags'.
4. Suggest 2-3 focused follow-up questions in the patient's language (${language}).

Return ONLY a JSON object:
{
  "chiefComplaint": "string",
  "duration": "string",
  "associatedSymptoms": ["string"],
  "socratesHpi": {
    "site": "string or null",
    "onset": "string or null",
    "character": "string or null",
    "radiation": "string or null",
    "associatedSymptoms": ["string"],
    "timing": "string or null",
    "exacerbatingFactors": "string or null",
    "relievingFactors": "string or null",
    "severity": number between 1 and 10
  },
  "followUpQuestions": ["string"],
  "clinicalAttentionFlags": ["string"]
}`;

    const modelName = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Patient reported: "${patientInput}". Context: ${JSON.stringify(currentContext)}`
          }
        ],
        temperature: 0.1,
        max_tokens: 800,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Groq API Error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('Groq returned empty response content.');
    }

    return JSON.parse(content);
  } catch (err: any) {
    console.error('[GroqClinical Error]', err.message);
    throw new Error(`Clinical processing failed: ${err.message}`);
  }
}

export async function generatePhysicianClinicalSummary(
  encounterData: Record<string, unknown>
): Promise<GeneratedSummaryResult> {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey || apiKey.trim() === '') {
    throw new Error(
      'GROQ_CLINICAL_NOT_CONFIGURED: GROQ_API_KEY is not configured in backend environment. AI clinical summary generation is unavailable.'
    );
  }

  try {
    const prompt = `You are a clinical documentation assistant for a physician in an Indian OPD.
Given the patient's intake data, synthesize a concise, structured, physician-ready clinical summary.
DO NOT invent data. All sections must be draft summaries for physician review.

Return JSON:
{
  "chiefComplaintSummary": "concise clinical summary",
  "hpiSummary": "SOCRATES chronological summary",
  "pastMedicalSummary": "past medical/surgical summary",
  "medicationsSummary": "current and past medication history summary",
  "allergiesSummary": "allergy list with reactions",
  "rosSummary": "positive and pertinent negative findings across review of systems",
  "investigationsSummary": "summary of previous investigations or document findings",
  "ayushSummary": "AYUSH assessment summary if applicable or null",
  "clinicalAttentionFlags": ["concise red flags for immediate review"]
}`;

    const modelName = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: JSON.stringify(encounterData) }
        ],
        temperature: 0.1,
        max_tokens: 800,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Groq API Error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    return JSON.parse(content);
  } catch (err: any) {
    console.error('[GroqSummary Error]', err.message);
    throw new Error(`Summary generation failed: ${err.message}`);
  }
}
