
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface SummaryOptions {
  length: 'short' | 'medium' | 'detailed';
  format: 'bullet points' | 'paragraph';
}

export const summarizeText = async (text: string, options: SummaryOptions = { length: 'medium', format: 'bullet points' }): Promise<string> => {
  try {
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
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            text: prompt,
          },
        ],
      },
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
    throw new Error("No image was generated.");
  } catch (error) {
    console.error("Image generation error:", error);
    throw new Error("AI service is currently unavailable for image generation.");
  }
};
