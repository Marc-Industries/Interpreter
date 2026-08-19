import { GoogleGenAI } from "@google/genai";
const ai = new GoogleGenAI({});
try {
  const response = await ai.models.generateContent({
    model: "gemini-3.6-flash",
    contents: "hello",
  });
  console.log("Success:", response.text);
} catch (e) {
  console.error("Error with 3.6:", e.message);
}
try {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: "hello",
  });
  console.log("Success:", response.text);
} catch (e) {
  console.error("Error with 2.5:", e.message);
}
