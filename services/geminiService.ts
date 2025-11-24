import { GoogleGenAI, Type, Schema } from "@google/genai";
import { CategoryType } from "../types";

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("API_KEY not found in environment variables.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const analyzeExpenseWithGemini = async (
  description: string,
  amount: number
): Promise<{ category: string; tip: string } | null> => {
  const ai = getAiClient();
  if (!ai) return null;

  // Create a list of valid categories for the model
  const categories = Object.values(CategoryType);

  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      category: {
        type: Type.STRING,
        enum: categories,
        description: "A categoria que melhor se ajusta à despesa.",
      },
      tip: {
        type: Type.STRING,
        description: "Uma dica financeira muito curta ou comentário engraçado sobre esse gasto (máx 15 palavras).",
      },
    },
    required: ["category", "tip"],
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Analise esta despesa: "${description}" no valor de R$ ${amount}.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.3,
      },
    });

    const text = response.text;
    if (!text) return null;

    return JSON.parse(text);
  } catch (error) {
    console.error("Erro ao chamar Gemini:", error);
    return null;
  }
};