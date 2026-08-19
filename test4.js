import { GoogleGenAI } from "@google/genai";
const ai = new GoogleGenAI({});
try {
  const response = await ai.models.generateContent({
    model: "gemini-3.6-flash",
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: "audio/webm",
            data: Buffer.from("test").toString("base64")
          }
        },
        { text: "what is this?" }
      ]
    },
  });
  console.log("Success with audio/webm:", response.text);
} catch (e) {
  console.error("Error with audio/webm:", e.message);
}

try {
  const response = await ai.models.generateContent({
    model: "gemini-3.6-flash",
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: "audio/mp3",
            data: Buffer.from("test").toString("base64")
          }
        },
        { text: "what is this?" }
      ]
    },
  });
  console.log("Success with audio/mp3:", response.text);
} catch (e) {
  console.error("Error with audio/mp3:", e.message);
}
