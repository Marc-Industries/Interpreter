export interface AudioDevice {
  deviceId: string;
  label: string;
  kind: MediaDeviceKind;
  isBluetooth?: boolean;
}

export interface LanguageOption {
  name: string; // e.g., "Italiano"
  code: string; // e.g., "it-IT"
}

export interface AudioSettings {
  apiKey: string;
  sourceLang: LanguageOption;
  targetLang: LanguageOption;
  selectedDeviceId: string;
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;
  enableAutoTts: boolean;
  ttsRate: number; // 0.8 to 1.2
  ttsPitch: number; // 0.5 to 1.5
  selectedVoiceURI: string;
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
