import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export interface AttendanceStats {
  className: string;
  totalStudents: number;
  defaulters: number;
  criteria: number;
  studentData: {
    name: string;
    percentage: number;
  }[];
}

export async function generateAIInsight(stats: AttendanceStats): Promise<string> {
  const prompt = `
    You are an AI assistant for a teacher. Analyze the following attendance data for a class.
    
    Class Name: ${stats.className}
    Total Students: ${stats.totalStudents}
    Defaulters (below ${stats.criteria}%): ${stats.defaulters}
    Criteria: ${stats.criteria}%
    
    Student Data:
    ${JSON.stringify(stats.studentData, null, 2)}
    
    Task: Write a short, professional 2-3 sentence summary/insight for the teacher. 
    Highlight the overall performance, mention if the class is doing well, and optionally point out if specific students are severely falling behind without listing every single name.
    
    Keep it concise, encouraging but professional, and suitable to be printed on a formal Attendance Report PDF.
    DO NOT use markdown formatting like asterisks or bullet points. Just plain text.
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error("Failed to generate AI insight:", error);
    return "AI Insight could not be generated at this time.";
  }
}
