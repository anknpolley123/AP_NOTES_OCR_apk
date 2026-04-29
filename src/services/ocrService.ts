
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

export const recognizeText = async (base64Image: string): Promise<string> => {
  try {
    const model = ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            { 
              text: `Act as a highly accurate OCR engine. 
              Extract all text from this image with the following rules:
              1. Preserve the natural reading order and layout structure.
              2. If the image is blurry or has low contrast, use context to infer the most likely words.
              3. Identify and extract both printed and handwritten text. 
              4. If no clear text is found, return as much legible text as possible.
              5. Only output the extracted text content, no conversational filler.` 
            },
            {
              inlineData: {
                data: base64Image.split(',')[1],
                mimeType: "image/jpeg",
              },
            },
          ],
        },
      ],
    });

    const response = await model;
    return response.text || "No legible text detected.";
  } catch (error) {
    console.error("OCR Error:", error);
    return "The scanner encountered an issue. Please ensure the image is well-lit and try again.";
  }
};
