import { GoogleGenAI, Type } from "@google/genai";
import { Segment, AssessmentResult } from "../types";

const getApiKey = () => {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    console.warn("GEMINI_API_KEY is missing. Please set it in your environment variables.");
  }
  return key || "MISSING_API_KEY";
};

const ai = new GoogleGenAI({ apiKey: getApiKey() });

export async function transcribeAudio(audioBlob: Blob): Promise<Segment[]> {
  console.log("Starting transcription for blob:", audioBlob.type, audioBlob.size);
  
  const reader = new FileReader();
  const base64Promise = new Promise<string>((resolve, reject) => {
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(audioBlob);
  });

  const base64Data = await base64Promise;
  
  // Fallback mime type if empty
  const mimeType = audioBlob.type || 'audio/mpeg';

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType,
              },
            },
            {
              text: "Transcribe this English audio and provide the start and end timestamps for each sentence in JSON format. The output should be an array of objects: { text: string, start: number, end: number }. Ensure the timestamps are accurate to the millisecond. Return ONLY the JSON array.",
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING },
              start: { type: Type.NUMBER },
              end: { type: Type.NUMBER },
            },
            required: ["text", "start", "end"],
          },
        },
      },
    });

    if (!response.text) {
      throw new Error("Gemini returned an empty response.");
    }

    const segments: any[] = JSON.parse(response.text);
    console.log("Transcription successful, segments found:", segments.length);
    return segments.map((s, i) => ({
      ...s,
      id: `seg-${i}`,
    }));
  } catch (error: any) {
    console.error("Gemini Transcription Error:", error);
    if (error.message?.includes("API_KEY_INVALID")) {
      throw new Error("Invalid Gemini API Key. Please check your secrets.");
    }
    throw new Error(`Failed to call Gemini API: ${error.message || "Unknown error"}`);
  }
}

export async function assessPronunciation(
  userAudioBlob: Blob,
  referenceText: string
): Promise<AssessmentResult> {
  console.log("Starting assessment for text:", referenceText);
  
  const reader = new FileReader();
  const base64Promise = new Promise<string>((resolve, reject) => {
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(userAudioBlob);
  });

  const base64Data = await base64Promise;
  const mimeType = userAudioBlob.type || 'audio/webm';

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType,
              },
            },
            {
              text: `Compare this user recording with the reference text: "${referenceText}". Evaluate the pronunciation accuracy, fluency, and prosody. Provide a score from 0 to 100 and a list of words that were mispronounced or had issues. Return the result in JSON format.`,
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER },
            feedback: { type: Type.STRING },
            issues: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ["score", "feedback", "issues"],
        },
      },
    });

    if (!response.text) {
      throw new Error("Gemini returned an empty response.");
    }

    return JSON.parse(response.text) as AssessmentResult;
  } catch (error: any) {
    console.error("Gemini Assessment Error:", error);
    throw new Error(`Failed to assess pronunciation: ${error.message || "Unknown error"}`);
  }
}
