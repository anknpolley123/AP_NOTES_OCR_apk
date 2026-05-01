
import { GoogleGenAI } from "@google/genai";

let aiClient: GoogleGenAI | null = null;

function getAIClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

export interface SummaryOptions {
  length: 'short' | 'medium' | 'detailed';
  format: 'bullet points' | 'paragraph';
}

export const summarizeText = async (text: string, options: SummaryOptions = { length: 'medium', format: 'bullet points' }): Promise<string> => {
  try {
    const ai = getAIClient();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Summarize the following note text.
Length: ${options.length}
Format: ${options.format}
Maintain a professional yet helpful tone.

Note content:
${text}`,
    });
    return response.text || "Failed to generate summary.";
  } catch (error) {
    console.error("Summarization error:", error);
    throw new Error("AI service is currently unavailable.");
  }
};

export const refineText = async (text: string): Promise<string> => {
  try {
    const ai = getAIClient();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Refine the following note text to improve grammar, clarity, and flow. Preserve the original meaning and style, but make it more polished.\n\nNote content:\n${text}`,
    });
    return response.text || "Failed to refine text.";
  } catch (error) {
    console.error("Refinement error:", error);
    throw new Error("AI service is currently unavailable.");
  }
};

export const extractActions = async (text: string): Promise<string> => {
  try {
    const ai = getAIClient();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Extract any actionable items, tasks, or follow-ups from the following note text. Format them as a Markdown checklist (- [ ] task). If no tasks are found, say "No clear tasks identified."\n\nNote content:\n${text}`,
    });
    return response.text || "Failed to extract actions.";
  } catch (error) {
    console.error("Action extraction error:", error);
    throw new Error("AI service is currently unavailable.");
  }
};

export const generateDocument = async (prompt: string, type: string): Promise<string> => {
  try {
    const ai = getAIClient();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate a full ${type} based on the following prompt. 
The output should be in Markdown format, well-structured with headers, subheaders, and detailed content. 
Be comprehensive and professional.

Prompt:
${prompt}`,
    });
    return response.text || "Failed to generate document.";
  } catch (error) {
    console.error("Document generation error:", error);
    throw new Error("AI service is currently unavailable.");
  }
};

export const generateImage = async (prompt: string): Promise<string> => {
  try {
    const ai = getAIClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [{
        parts: [
          {
            text: prompt,
          },
        ],
      }],
      config: {
        imageConfig: {
          aspectRatio: "1:1",
        },
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image data found in response.");
  } catch (error) {
    console.error("Image generation error:", error);
    if (error instanceof Error) {
       throw error;
    }
    throw new Error("AI service is currently unavailable for image generation.");
  }
};

export const translateText = async (text: string, targetLanguage: string): Promise<string> => {
  try {
    const ai = getAIClient();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Translate the following text to ${targetLanguage}. Maintain the original tone and markdown formatting if present.\n\nText:\n${text}`,
    });
    return response.text || "Failed to translate text.";
  } catch (error) {
    console.error("Translation error:", error);
    throw new Error("AI service is currently unavailable.");
  }
};

export const autoFormatText = async (text: string): Promise<string> => {
  try {
    const ai = getAIClient();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Transform the following messy notes or text into a professional document with clear headers, bullet points, and structure. Use bolding for emphasis. Keep it clean and formatted with Markdown.\n\nText:\n${text}`,
    });
    return response.text || "Failed to auto-format.";
  } catch (error) {
    console.error("Auto-format error:", error);
    throw new Error("AI service is currently unavailable.");
  }
};

export const transcribeAudio = async (base64Audio: string, mimeType: string = "audio/wav"): Promise<string> => {
  try {
    const ai = getAIClient();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                data: base64Audio,
                mimeType: mimeType.split(';')[0],
              },
            },
            {
              text: "Transcribe the audio accurately. Extract all spoken words into text. If there's music or noise, ignore it and focus on speech. Return only the transcription.",
            },
          ],
        },
      ],
    });
    return response.text || "No transcription available.";
  } catch (error) {
    console.error("Transcription error:", error);
    throw new Error("AI transcription failed. Please try a shorter or clearer recording.");
  }
};

export const spellCheckText = async (text: string): Promise<string> => {
  try {
    const ai = getAIClient();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Fix any spelling and grammatical errors in the following text. Preserve the original tone and strictly return the corrected text only.\n\nText:\n${text}`,
    });
    return response.text || text;
  } catch (error) {
    console.error("Spell check error:", error);
    return text;
  }
};
