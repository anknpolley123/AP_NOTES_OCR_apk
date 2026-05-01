
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

export const recognizeText = async (base64Image: string, language: string = "auto"): Promise<string> => {
  try {
    const model = ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            { 
              text: `Act as a highly accurate OCR engine. 
              Extract all text from this image with the following rules:
              1. Language: ${language === "auto" ? "Detect automatically" : language}.
              2. Preserve the natural reading order and layout structure.
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

export const improveHandwriting = async (text: string): Promise<string> => {
  try {
    const model = ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            { 
              text: `I will provide you with text extracted from handwriting via OCR. 
              The OCR might have mistakes (typos, misread letters, merged words). 
              Your task is to:
              1. Correct spelling and grammatical errors that likely originated from handwriting misinterpretation.
              2. Reconstruct the logical flow of sentences.
              3. Maintain the original meaning and tone.
              4. Fix formatting to be clean and readable.
              5. Return ONLY the improved text.
              
              Raw text: ${text}` 
            }
          ],
        },
      ],
    });

    const response = await model;
    return response.text || text;
  } catch (error) {
    console.error("Handwriting Improvement Error:", error);
    return text;
  }
};

export const cleanOcrText = async (text: string, style: 'clean' | 'formal' | 'bullet_points'): Promise<string> => {
  try {
    const prompt = {
      clean: "Clean up this OCR text. Fix common misinterpretations, remove noise (random symbols), and ensure proper spacing. Return ONLY the cleaned text.",
      formal: "Reformat this OCR text into a formal document style. Correct any typos and clarify the language while maintaining the content. Return ONLY the formal text.",
      bullet_points: "Convert the key information from this OCR text into a well-structured list of bullet points. Return ONLY the bullet points."
    }[style];

    const model = ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [{ text: `${prompt}\n\nText: ${text}` }],
        },
      ],
    });

    const response = await model;
    return response.text || text;
  } catch (error) {
    console.error("OCR Cleaning Error:", error);
    return text;
  }
};
