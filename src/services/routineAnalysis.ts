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

const NVIDIA_API_KEY = import.meta.env.VITE_NVIDIA_API_KEY;
const NVIDIA_MODEL = "meta/llama-3.2-11b-vision-instruct";
const NVIDIA_ENDPOINT = "https://integrate.api.nvidia.com/v1/chat/completions";

export async function analyzeRoutine(file: File): Promise<AnalysisResponse> {
  // Convert file to base64
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

  console.log(`Attempting analysis with NVIDIA NIM...`);

  for (let retry = 0; retry < 3; retry++) {
    try {
      if (retry > 0) {
        await new Promise(r => setTimeout(r, 1000 * retry));
        console.log(`Retrying analysis with NVIDIA NIM (attempt ${retry + 1})...`);
      }

      const response = await fetch(NVIDIA_ENDPOINT, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${NVIDIA_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: NVIDIA_MODEL,
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
        throw new Error(errorData?.error?.message || `NVIDIA API error: ${response.status} ${response.statusText}`);
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

      console.log(`Analysis successful with NVIDIA NIM`);
      return parsed as AnalysisResponse;
    } catch (err: any) {
      console.warn(`Analysis failed with NVIDIA NIM:`, err.message);
      if (retry === 2) throw err;
    }
  }

  throw new Error("Routine analysis failed after 3 attempts with NVIDIA NIM.");
}

