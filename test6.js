import { GoogleGenAI } from "@google/genai";
import fs from "fs";
const ai = new GoogleGenAI({});
try {
  // Send just a random string as base64 instead of a valid media file
  const response = await ai.models.generateContent({
    model: "gemini-3.6-flash",
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: "audio/webm;codecs=opus",
            data: Buffer.from("random string data").toString("base64")
          }
        },
        { text: "what is this?" }
      ]
    },
  });
  console.log("Success:", response.text);
} catch (e) {
  console.error("Error:", e.message);
}
