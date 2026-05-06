import type { DayOfWeek } from '@/types/attendance';

export interface ExtractedSubject {
  name: string;
  code: string;
  teacherName: string;
  semester: string;
  section?: string;
}

export interface ExtractedScheduleSlot {
  subjectName: string;
  subjectCode: string;
  day: DayOfWeek;
  startTime: string;
  endTime: string;
}

export interface AnalysisResponse {
  semesters: string[];
  sections: string[];
  subjects: ExtractedSubject[];
  schedule: ExtractedScheduleSlot[];
}

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

const GROQ_MODELS = [
  "llama-4-scout-17b-16e-instruct",
  "llama-4-maverick-17b-128e-instruct",
];

const OPENROUTER_MODELS = [
  "google/gemini-2.0-flash-001",
  "google/gemini-2.0-flash-lite-001",
  "openai/gpt-4o-mini"
];

const OPENAI_MODELS = [
  "gpt-4o-mini",
  "gpt-4o"
];

export async function analyzeRoutine(
  file: File, 
  preferredProvider: 'groq' | 'openrouter' | 'openai' = 'groq'
): Promise<AnalysisResponse> {
  // Define the order of providers to try, starting with the user's preference
  const providers: ('groq' | 'openrouter' | 'openai')[] = [preferredProvider];
  
  // Add other available providers as fallbacks
  if (!providers.includes('groq')) providers.push('groq');
  if (!providers.includes('openai')) providers.push('openai');
  if (!providers.includes('openrouter')) providers.push('openrouter');

  let lastError: any = null;

  // Convert file to base64 once
  const reader = new FileReader();
  const fileData = await new Promise<string>((resolve) => {
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.readAsDataURL(file);
  });

  const prompt = `
    Analyze this class routine/timetable image and extract:
    1. All UNIQUE subjects (Theory and Practical are distinct).
    2. The complete day-wise schedule mapping.

    STRICT JSON FORMAT:
    {
      "semesters": ["Semester 4", ...],
      "sections": ["Section A", ...],
      "subjects": [
        {
          "name": "Subject Name",
          "code": "CODE",
          "teacherName": "Prof Name",
          "semester": "Semester",
          "section": "Sec"
        }
      ],
      "schedule": [
        {
          "subjectName": "Subject Name",
          "subjectCode": "CODE",
          "day": "Mon",
          "startTime": "HH:MM",
          "endTime": "HH:MM"
        }
      ]
    }
    
    ACCURACY RULES:
    - THEORY vs PRACTICAL: If a subject has (T) and (P) or "Theory" and "Lab" in the routine, you MUST create TWO separate entries in the "subjects" array. Add "(T)" to the theory one and "(P)" or "(L)" to the practical one in BOTH Name and Code.
    - DEDUPLICATION: Do not list the same Subject+Code combination twice in the "subjects" array.
    - TIME FORMAT: Always use 24-hour format (e.g., "09:00", "15:30"). If the routine says "1:00", determine if it's AM or PM based on context (usually PM for classes).
    - DAYS: Use exactly "Mon", "Tue", "Wed", "Thu", "Fri".
    - HALLUCINATION GUARD: Only extract text that is actually visible. If a cell is empty or says "Lunch" / "Break", ignore it for the schedule array.
    - NESTED CELLS: If one time slot has multiple subjects (e.g., different sections), pick the one most relevant to the provided semester/section if possible, or include all if they look like separate classes.
    
    IMPORTANT: Return ONLY valid JSON. No markdown backticks.
  `;

  // Try each provider in order
  for (const provider of providers) {
    let apiKey: string | undefined;
    let models: string[];
    let endpoint: string;

    switch (provider) {
      case 'groq':
        apiKey = GROQ_API_KEY;
        models = GROQ_MODELS;
        endpoint = "https://api.groq.com/openai/v1/chat/completions";
        break;
      case 'openrouter':
        apiKey = OPENROUTER_API_KEY;
        models = OPENROUTER_MODELS;
        endpoint = "https://openrouter.ai/api/v1/chat/completions";
        break;
      case 'openai':
        apiKey = OPENAI_API_KEY;
        models = OPENAI_MODELS;
        endpoint = "https://api.openai.com/v1/chat/completions";
        break;
      default:
        continue;
    }

    if (!apiKey || apiKey.includes("your_")) {
      console.warn(`Skipping provider ${provider}: API Key is missing or invalid.`);
      continue;
    }

    console.log(`Attempting analysis with provider: ${provider}...`);

    for (const model of models) {
      for (let retry = 0; retry < 2; retry++) {
        try {
          if (retry > 0) {
            await new Promise(r => setTimeout(r, 1000 * retry * retry));
            console.log(`Retrying analysis with provider ${provider} / model ${model} (attempt ${retry + 1})...`);
          }

          const headers: any = {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          };

          if (provider === 'openrouter') {
            headers["HTTP-Referer"] = window.location.origin;
            headers["X-Title"] = "PresentIQ";
          }

          const response = await fetch(endpoint, {
            method: "POST",
            headers,
            body: JSON.stringify({
              model: model,
              messages: [
                {
                  role: "user",
                  content: [
                    { type: "text", text: prompt },
                    {
                      type: "image_url",
                      image_url: {
                        url: `data:${file.type};base64,${fileData}`,
                      },
                    },
                  ],
                },
              ],
              temperature: 0.1,
              max_tokens: 4096,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(
              errorData?.error?.message || `${provider} API error: ${response.status} ${response.statusText}`
            );
          }

          const data = await response.json();
          const text = data.choices?.[0]?.message?.content || "";

          // Clean the response text from any markdown blocks
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (!jsonMatch) {
            throw new Error("Failed to parse AI response. Unexpected format.");
          }

          const parsed = JSON.parse(jsonMatch[0]);
          
          if (!parsed.schedule) parsed.schedule = [];
          if (!parsed.subjects) parsed.subjects = [];

          console.log(`Analysis successful with provider: ${provider}`);
          return parsed as AnalysisResponse;
        } catch (err: any) {
          console.warn(`Analysis failed with ${provider}/${model}:`, err.message);
          lastError = err;
          
          // Don't retry if it's an auth error, just move to next provider
          if (err.message.includes("401") || err.message.includes("403")) {
            break; 
          }
        }
      }
    }
  }

  throw new Error(`Routine analysis failed after trying all available AI providers. Last error: ${lastError?.message || "Internal Error"}. Please ensure at least one API key is correct.`);
}

