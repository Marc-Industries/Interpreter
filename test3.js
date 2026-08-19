import { GoogleGenAI } from "@google/genai";
const ai = new GoogleGenAI({});
try {
  const response = await ai.models.generateContent({
    model: "gemini-3.6-flash",
    contents: "hello",
    config: {
      systemInstruction: "You are a helpful assistant"
    }
  });
  console.log("Success with string config:", response.text);
} catch (e) {
  console.error("Error string config:", e.message);
}
