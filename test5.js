import { GoogleGenAI } from "@google/genai";
import fs from "fs";
const ai = new GoogleGenAI({});
try {
  const response = await ai.models.generateContent({
    model: "gemini-3.6-flash",
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: "audio/ogg",
            data: fs.readFileSync("test.ogg").toString("base64")
          }
        },
        { text: "what is this?" }
      ]
    },
  });
  console.log("Success with valid audio/ogg:", response.text);
} catch (e) {
  console.error("Error with valid audio/ogg:", e.message);
}

try {
  const response = await ai.models.generateContent({
    model: "gemini-3.6-flash",
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: "audio/ogg;codecs=opus",
            data: fs.readFileSync("test.ogg").toString("base64")
          }
        },
        { text: "what is this?" }
      ]
    },
  });
  console.log("Success with audio/ogg;codecs=opus:", response.text);
} catch (e) {
  console.error("Error with audio/ogg;codecs=opus:", e.message);
}
