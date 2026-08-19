# 🎙️ Interprete PL-IT (Real-Time Voice Translator)

Una Progressive Web App (PWA) mobile-first progettata per la traduzione simultanea e continua **Speech-to-Speech** e **Speech-to-Text**, originariamente ottimizzata per le lingue Polacco 🇵🇱 e Italiano 🇮🇹, ma adattabile ad altre lingue. 

Costruita con **React**, **Node.js/Express**, e alimentata dall'intelligenza artificiale di **Google Gemini API**, questa applicazione è ideale per conversazioni dal vivo utilizzando auricolari Bluetooth.

![App Preview](https://placehold.co/800x400/18181b/ffffff?text=Interprete+PL-IT+PWA)

## ✨ Funzionalità Principali

- 🚀 **Traduzione in Tempo Reale**: Registra flussi audio continui e li traduce sfruttando i modelli Gemini (elaborazione server-side sicura).
- 🎧 **Ottimizzazione Bluetooth**: Rileva e seleziona automaticamente i dispositivi di input Bluetooth (es. auricolari/cuffie).
- 📱 **PWA (Progressive Web App)**: Installabile direttamente sulla schermata Home di iOS e Android per un'esperienza nativa e full-screen.
- 🔋 **Protezione Standby (Wake Lock)**: Impedisce lo spegnimento dello schermo durante le sessioni di ascolto attivo.
- 🗣️ **Sintesi Vocale (TTS)**: Riproduzione vocale automatica della traduzione con voci di sistema o tramite API IA (Text-To-Speech).
- 📜 **Cronologia Locale**: Salvataggio automatico delle traduzioni recenti direttamente nel browser (Local Storage).
- 🎛️ **Interfaccia Avanzata**: Visualizzatore spettro audio (Web Audio API), impostazioni complete e un design dark mode ottimizzato con Tailwind CSS.

## 🛠️ Architettura Tecnica

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide Icons.
- **Backend**: Node.js, Express.js (per offuscare la chiave API e gestire le richieste).
- **Integrazione IA**: `@google/genai` (SDK ufficiale Gemini).
- **API Browser Native**: `MediaRecorder`, `Web Audio API`, `Screen Wake Lock API`, `Web Speech API` (per TTS di sistema).

## 🚀 Prerequisiti

- [Node.js](https://nodejs.org/) (versione 18 o superiore)
- Una chiave API valida per [Google Gemini](https://aistudio.google.com/)

## 💻 Installazione e Avvio Locale

1. **Clona il repository**
   ```bash
   git clone https://github.com/tuo-username/interprete-pl-it.git
   cd interprete-pl-it
   ```

2. **Installa le dipendenze**
   ```bash
   npm install
   ```

3. **Configura le Variabili d'Ambiente**
   Crea un file `.env` nella directory principale e inserisci la tua API Key di Gemini:
   ```env
   GEMINI_API_KEY=la_tua_chiave_api_qui
   ```

4. **Avvia il server di sviluppo**
   ```bash
   npm run dev
   ```
   L'applicazione sarà disponibile all'indirizzo `http://localhost:3000`.

## 📦 Build per la Produzione

Per compilare l'applicazione per la produzione (bundle del frontend e del backend server-side in CommonJS):

```bash
npm run build
npm start
```

Il comando `npm run build` sfrutta **Vite** per compilare la Single Page Application in `dist/` ed **esbuild** per compilare il backend (`server.ts`) in un singolo file eseguibile `dist/server.cjs`.

## 🔒 Sicurezza e Gestione API Key

L'applicazione segue le best-practice di sicurezza implementando le chiamate a Gemini **esclusivamente lato server**. 
- Le registrazioni audio (`MediaRecorder`) vengono convertite in Base64 dal client e inviate al backend Node.js (`/api/translate`).
- Il backend gestisce la comunicazione con le API di Gemini, prevenendo l'esposizione della chiave segreta nel codice sorgente del browser.
- È comunque presente un'opzione (nelle impostazioni della UI) per inserire una chiave API custom (es. BYOK - Bring Your Own Key) che sovrascrive temporaneamente quella di default.

## 🤝 Contribuire

I contributi sono benvenuti! Se vuoi migliorare il progetto:
1. Fai un Fork del repository
2. Crea un branch per la tua feature (`git checkout -b feature/AmazingFeature`)
3. Fai commit dei tuoi cambiamenti (`git commit -m 'Add some AmazingFeature'`)
4. Fai Push sul branch (`git push origin feature/AmazingFeature`)
5. Apri una Pull Request

## 📄 Licenza

Distribuito sotto licenza MIT. Vedi `LICENSE` per maggiori informazioni.
