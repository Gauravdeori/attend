export interface ExtractedSubject {
  name: string;
  code: string;
  teacherName: string;
  semester: string;
  section?: string;
}

export interface AnalysisResponse {
  semesters: string[];
  sections: string[];
  subjects: ExtractedSubject[];
}

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;

export async function analyzeRoutine(file: File): Promise<AnalysisResponse> {
  if (!OPENROUTER_API_KEY) {
    throw new Error("OpenRouter API Key is missing. Please add VITE_OPENROUTER_API_KEY to your .env file.");
  }

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
    Analyze this class routine and extract all UNIQUE subjects. 
    Each subject should appear ONLY ONCE in the output, even if it appears in multiple sections or time slots.
    
    Return the data in a strict JSON format with the following structure:
    {
      "semesters": ["Semester 1", "Semester 3", ...],
      "sections": ["Section A", "Section B", ...],
      "subjects": [
        {
          "name": "Subject Name",
          "code": "CODE123",
          "teacherName": "Professor Name",
          "semester": "Semester Name",
          "section": "Section Name (optional)"
        }
      ]
    }
    
    CRITICAL RULES:
    - If a subject has BOTH a Theory (T) and Practical (P) component, treat them as TWO SEPARATE subjects. Append "(T)" or "(P)" to the subject name to distinguish them. For example: "Data Structures (T)" and "Data Structures (P)".
    - If the code is the same for Theory and Practical, append "(T)" or "(P)" to the code too. For example: "CS301(T)" and "CS301(P)".
    - Apart from Theory/Practical distinction, each unique subject must appear ONLY ONCE.
    - If a subject appears in multiple sections, pick any one section — do NOT duplicate it.
    - If a teacher name or code is missing, leave it as an empty string.
    IMPORTANT: Return ONLY the JSON object, no markdown or extra text.
  `;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": window.location.origin,
      "X-Title": "MyAttendanceHub",
    },
    body: JSON.stringify({
      model: "google/gemma-3-12b-it:free",
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
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData?.error?.message || `OpenRouter API error: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || "";

  // Clean the response text from any markdown blocks
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to parse AI response. Unexpected format.");
  }

  return JSON.parse(jsonMatch[0]) as AnalysisResponse;
}
