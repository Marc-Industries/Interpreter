import express from "express";
import http from "http";
import path from "path";
import { WebSocketServer, WebSocket } from "ws";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

const PORT = 3000;
const app = express();
app.use(express.json({ limit: "25mb" }));

// Server-side Gemini Client
function getGeminiClient(reqApiKey?: string): GoogleGenAI {
  const apiKey = reqApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    throw new Error("API Key Gemini non configurata. Inserisci la tua chiave API nelle impostazioni.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build"
      }
    }
  });
}

const getSystemInstruction = (sourceLang: string = 'Polacca', targetLang: string = 'Italiana') => `Agisci come un interprete simultaneo professionista e altamente adattivo. Il tuo compito è convertire uno stream continuo in lingua ${sourceLang} in lingua ${targetLang}.

REGOLAMENTO E COMPORTAMENTO DELL'IA:
1. GESTIONE DEL PARLATO INFORMALE E NON SCANDITO:
   - L'audio o testo in ingresso proviene da una conversazione reale, veloce, informale e spesso biascicata o con pronuncia non scandita.
   - NON cercare di tradurre parola per parola. Usa il CONTESTO complessivo della frase o del discorso per ricostruire le parole pronunciate male, troncate o mangiate.
   - Ignora gli intercalari irrilevanti, le esitazioni, i colpi di tosse o i rumori di fondo. Traduci solo il significato logico e compiuto.
   - Traduci mantenendo un registro naturale, colloquiale e fluido, coerente con il tono originale dei parlanti.

2. FLUSSO CONTINUO E LATENZA ZERO:
   - Mantieni la latenza al minimo assoluto. Traduci non appena un'unità di senso (frase o sotto-frase) è completa.
   - La tua risposta deve contenere ESCLUSIVAMENTE la traduzione in lingua ${targetLang}. NON aggiungere commenti, NON fare domande, NON inserire preamboli.

3. ROBUSTEZZA AL RUMORE:
   - Se una parte del discorso è del tutto incomprensibile a causa del rumore di fondo o sovrapposizioni vocali, tralasciala e riprendi immediatamente dal primo blocco comprensibile senza bloccarti.`;

// Helper function for robust Gemini generation with retry and model fallback
async function generateWithFallback(
  ai: GoogleGenAI,
  contents: any,
  systemInstruction?: string,
  temperature: number = 0.2
) {
  const modelsToTry = ["gemini-3.6-flash", "gemini-3.1-flash-lite"];
  let lastError: any = null;

  for (const model of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction,
          temperature,
        },
      });
      return response;
    } catch (err: any) {
      lastError = err;
      const isQuotaOrRateLimit =
        err?.status === 429 ||
        err?.message?.includes("429") ||
        err?.message?.includes("RESOURCE_EXHAUSTED") ||
        err?.message?.includes("Quota exceeded");

      if (isQuotaOrRateLimit) {
        console.warn(`[Gemini API] Quota/429 per ${model}, tento il modello di riserva...`);
        // Wait 800ms before trying the fallback model
        await new Promise((resolve) => setTimeout(resolve, 800));
        continue;
      }
      // If it's a different fatal error, break immediately
      throw err;
    }
  }

  throw lastError;
}

// REST Endpoint: Healthcheck
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "Interprete Live" });
});

// REST Endpoint: Text or Audio chunk translation
app.post("/api/translate", async (req, res) => {
  try {
    const { text, audioBase64, mimeType, contextHistory, sourceLang, targetLang } = req.body;
    const reqApiKey = req.headers["x-gemini-api-key"] as string | undefined;

    if (!text && !audioBase64) {
      return res.status(400).json({ error: "Fornire testo o audio in ingresso." });
    }

    const ai = getGeminiClient(reqApiKey);
    const systemInstruction = getSystemInstruction(sourceLang, targetLang);
    
    // Construct contents
    const parts: any[] = [];
    
    if (contextHistory && Array.isArray(contextHistory) && contextHistory.length > 0) {
      const recentHistory = contextHistory.slice(-4).join(" | ");
      parts.push({ text: `[Contesto recente conversazione: ${recentHistory}]\n` });
    }

    if (audioBase64) {
      parts.push({
        inlineData: {
          mimeType: mimeType || "audio/webm;codecs=opus",
          data: audioBase64
        }
      });
      parts.push({ text: `Traduci l'audio parlato in ${targetLang} secondo le istruzioni di sistema.` });
    } else {
      parts.push({ text: `Testo da tradurre: "${text}"` });
    }

    const response = await generateWithFallback(
      ai,
      { parts },
      systemInstruction,
      0.2
    );

    const translatedText = response.text ? response.text.trim() : "";
    
    return res.json({
      success: true,
      originalText: text || "",
      translation: translatedText,
      timestamp: Date.now()
    });
  } catch (err: any) {
    console.error("Errore nella traduzione Gemini:", err);
    let errorMsg = err.message || "Errore del server durante la traduzione.";
    if (
      err?.status === 429 ||
      errorMsg.includes("429") ||
      errorMsg.includes("RESOURCE_EXHAUSTED") ||
      errorMsg.includes("Quota exceeded")
    ) {
      errorMsg = "Quota o limite di richieste Gemini superato (20 richieste/min). Attendi qualche secondo per la richiesta successiva.";
    } else if (errorMsg.includes("401") || errorMsg.includes("API key") || errorMsg.includes("UNAUTHENTICATED")) {
      errorMsg = "Chiave API Gemini non valida o non autorizzata (401). Verifica la chiave nelle impostazioni.";
    }
    return res.status(200).json({ success: false, error: errorMsg });
  }
});

// REST Endpoint: Text-To-Speech Gemini optional fallback
app.post("/api/tts", async (req, res) => {
  try {
    const { text, voiceName = "Aoede" } = req.body;
    const reqApiKey = req.headers["x-gemini-api-key"] as string | undefined;

    if (!text) {
      return res.status(400).json({ error: "Testo mancante per TTS" });
    }

    const ai = getGeminiClient(reqApiKey);
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: `Leggi in modo caldo, fluido, chiaro e morbido: ${text}` }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName }
          }
        }
      }
    });

    const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (audioData) {
      return res.json({ success: true, audioBase64: audioData, sampleRate: 24000 });
    } else {
      return res.status(200).json({ success: false, fallbackToLocal: true, error: "Sintesi vocale non generata." });
    }
  } catch (err: any) {
    console.error("Errore TTS Gemini:", err);
    let errorMsg = err.message || "Errore nella generazione audio TTS.";
    if (
      err?.status === 429 ||
      errorMsg.includes("429") ||
      errorMsg.includes("RESOURCE_EXHAUSTED") ||
      errorMsg.includes("Quota exceeded")
    ) {
      errorMsg = "Quota TTS Gemini superata, passaggio automatico alla voce di sistema.";
    } else if (errorMsg.includes("401") || errorMsg.includes("API key")) {
      errorMsg = "Chiave API Gemini non autorizzata per la sintesi vocale.";
    }
    return res.status(200).json({ success: false, fallbackToLocal: true, error: errorMsg });
  }
});

async function startServer() {
  const server = http.createServer(app);

  // Setup WebSocket Server for continuous real-time audio/text streaming
  const wss = new WebSocketServer({ server, path: "/api/ws" });

  wss.on("connection", (ws: WebSocket) => {
    console.log("✈️ Client connesso a WebSocket di traduzione live");
    let sessionActive = true;
    let liveSession: any = null;

    ws.on("message", async (data: Buffer | string) => {
      if (!sessionActive) return;

      try {
        const payload = JSON.parse(data.toString());
        const { type, text, audioBase64, mimeType, id } = payload;

        if (type === "start_live_session") {
          try {
            const ai = getGeminiClient();
            liveSession = await (ai.live as any).connect({
              model: "gemini-2.0-flash-exp",
              config: {
                responseModalities: ["TEXT", "AUDIO"],
                systemInstruction: { parts: [{ text: getSystemInstruction() }] },
                generationConfig: {
                  temperature: 0.2,
                  speechConfig: {
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } }
                  }
                }
              }
            });

            // Receive stream loop from Gemini Live
            (async () => {
              try {
                for await (const message of liveSession.receive()) {
                  if (!sessionActive || ws.readyState !== WebSocket.OPEN) break;
                  if (message.serverContent) {
                    const parts = message.serverContent.modelTurn?.parts;
                    if (parts) {
                      for (const part of parts) {
                        if (part.text) {
                          ws.send(JSON.stringify({ type: "live_text", text: part.text }));
                        }
                        if (part.inlineData) {
                          ws.send(JSON.stringify({ type: "live_audio", audioBase64: part.inlineData.data }));
                        }
                      }
                    }
                  }
                }
              } catch (e) {
                console.warn("Stream Gemini Live disconnesso:", e);
              }
            })();

            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: "live_session_started", mode: "live_gemini" }));
            }
          } catch (err: any) {
            console.warn("Gemini Live non disponibile, modalità rapida attiva:", err?.message);
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: "live_session_started", mode: "standard_ws_fallback" }));
            }
          }
        } else if (type === "audio_chunk" && liveSession) {
          try {
            await liveSession.send({
              realtimeInput: {
                mediaChunks: [
                  {
                    mimeType: mimeType || "audio/pcm;rate=16000",
                    data: audioBase64
                  }
                ]
              }
            });
          } catch (err) {
            console.warn("Errore invio audio a Gemini Live:", err);
          }
        } else if (type === "translate_text") {
          const ai = getGeminiClient();
          const response = await generateWithFallback(
            ai,
            `Traduci: "${text}"`,
            getSystemInstruction(),
            0.2
          );

          const translation = response.text ? response.text.trim() : "";
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: "translation_result",
              id,
              originalText: text,
              translation,
              timestamp: Date.now()
            }));
          }
        } else if (type === "translate_audio") {
          const ai = getGeminiClient();
          const response = await generateWithFallback(
            ai,
            {
              parts: [
                { inlineData: { mimeType: mimeType || "audio/pcm;rate=16000", data: audioBase64 } },
                { text: "Traduci l'audio parlato in testo." }
              ]
            },
            getSystemInstruction(),
            0.2
          );

          const translation = response.text ? response.text.trim() : "";
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: "translation_result",
              id,
              translation,
              timestamp: Date.now()
            }));
          }
        } else if (type === "ping") {
          ws.send(JSON.stringify({ type: "pong", timestamp: Date.now() }));
        }
      } catch (err: any) {
        console.error("Errore elaborazione messaggio WS:", err);
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: "error",
            message: err.message || "Errore nella traduzione WebSocket."
          }));
        }
      }
    });

    ws.on("error", (err) => {
      console.warn("⚠️ Avviso connessione WebSocket (disconnessione o errore di rete):", err.message);
    });

    ws.on("close", () => {
      sessionActive = false;
      if (liveSession) {
        try { liveSession.close(); } catch {}
      }
      console.log("🔌 Client disconnesso da WebSocket traduzione");
    });
  });

  // Vite development middleware or production static serving
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server Interprete PL-IT in esecuzione su http://0.0.0.0:${PORT}`);
  });
}

export default app;

if (process.env.VERCEL !== "1" && !process.env.VERCEL_ENV) {
  startServer();
}
