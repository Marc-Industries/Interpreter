export interface AudioDevice {
  deviceId: string;
  label: string;
  kind: MediaDeviceKind;
  isBluetooth?: boolean;
}

export interface AudioSettings {
  selectedDeviceId: string;
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;
  enableAutoTts: boolean;
  ttsRate: number; // 0.8 to 1.2
  ttsPitch: number; // 0.5 to 1.5 (default 0.95 for warm/soft tone)
  selectedVoiceURI: string; // Browser voice identifier
  geminiVoiceName: 'Aoede' | 'Kore' | 'Puck' | 'Charon' | 'Fenrir'; // Gemini voice preset
  useGeminiTts: boolean;
  translationEngine: 'gemini-flash' | 'websocket-live';
}

export type TranslationState = 'idle' | 'listening' | 'processing' | 'speaking' | 'error';

export interface TranslationItem {
  id: string;
  timestamp: number;
  originalText: string;
  translatedText: string;
  isFinal: boolean;
  audioDuration?: number;
}
