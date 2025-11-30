import { GoogleGenAI } from "@google/genai";

export const generateEncouragingFeedback = async (studentName: string, videoTitle: string, kelas: string): Promise<string> => {
  // Default message to return if AI fails, Key is missing, or Timeout occurs
  const defaultMessage = "Tugas berhasil diterima! Semangat terus berkarya.";

  try {
    // GUIDELINE FIX: API Key must be obtained exclusively from process.env.API_KEY
    const apiKey = process.env.API_KEY;

    if (!apiKey) {
      console.warn("API Key not found in Environment Variables (API_KEY). Returning default feedback.");
      return defaultMessage;
    }

    const ai = new GoogleGenAI({ apiKey });
    const model = 'gemini-2.5-flash';

    const prompt = `
      Seorang siswa bernama "${studentName}" dari kelas "${kelas}" baru saja mengumpulkan tugas vlog berjudul "${videoTitle}".
      Buatlah pesan penyemangat yang sangat singkat (maksimal 1 kalimat) dalam Bahasa Indonesia untuk mengonfirmasi penerimaan tugas. 
      Jangan mengkritik video, cukup akui pengumpulan tugas dengan antusias dan positif.
    `;

    // Add timeout to prevent infinite loading (increased to 15 seconds)
    const timeoutPromise = new Promise<string>((_, reject) => 
      setTimeout(() => reject(new Error("Gemini API Timeout")), 15000)
    );

    const apiCallPromise = ai.models.generateContent({
      model,
      contents: prompt,
    });

    const response = await Promise.race([apiCallPromise, timeoutPromise]) as any;

    return response.text?.trim() || defaultMessage;
  } catch (error) {
    console.error("Gemini API error (Safe Fallback):", error);
    return defaultMessage;
  }
};