import { AudioDevice, AudioSettings } from '../types';

let wakeLock: WakeLockSentinel | null = null;
let silentAudioElement: HTMLAudioElement | null = null;
let audioCtx: AudioContext | null = null;

// Enumerate available microphones and detect Bluetooth headsets
export async function getAudioInputDevices(): Promise<AudioDevice[]> {
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      return [];
    }

    // Request temporary permission to get full device labels
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
    } catch {
      // Permission might already be granted or denied
    }

    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioInputs = devices.filter(d => d.kind === 'audioinput');

    return audioInputs.map(d => {
      const labelLower = d.label.toLowerCase();
      const isBluetooth = 
        labelLower.includes('bluetooth') ||
        labelLower.includes('buds') ||
        labelLower.includes('headset') ||
        labelLower.includes('earphones') ||
        labelLower.includes('airpods') ||
        labelLower.includes('cuffie') ||
        labelLower.includes('auricolari') ||
        labelLower.includes('hands-free') ||
        labelLower.includes('handsfree') ||
        labelLower.includes('wireless') ||
        labelLower.includes('bt');

      return {
        deviceId: d.deviceId,
        label: d.label || `Microfono ${d.deviceId.slice(0, 5)}...`,
        kind: d.kind,
        isBluetooth
      };
    });
  } catch (err) {
    console.error('Errore enumerazione dispositivi audio:', err);
    return [];
  }
}

// Get user media stream with constraints
export async function getMicrophoneStream(settings: AudioSettings): Promise<MediaStream> {
  const constraints: MediaStreamConstraints = {
    audio: {
      echoCancellation: settings.echoCancellation,
      noiseSuppression: settings.noiseSuppression,
      autoGainControl: settings.autoGainControl,
      ...(settings.selectedDeviceId ? { deviceId: { exact: settings.selectedDeviceId } } : {})
    }
  };

  try {
    return await navigator.mediaDevices.getUserMedia(constraints);
  } catch (err) {
    console.warn('Fai fallback a vincoli generici per il microfono:', err);
    return await navigator.mediaDevices.getUserMedia({ audio: true });
  }
}

// Background Hack: Silent Audio Loop + MediaSession API
// Prevents mobile OS (iOS/Android) from putting JS & mic to sleep when locked/in background
export function enableBackgroundStandbyProtection(
  onStateChange?: (active: boolean) => void
) {
  try {
    // 1. Silent Audio Element
    if (!silentAudioElement) {
      silentAudioElement = new Audio();
      // Ultra-short silent WAV base64
      silentAudioElement.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
      silentAudioElement.loop = true;
      silentAudioElement.volume = 0.01; // nearly silent
    }

    silentAudioElement.play().catch(e => {
      console.log('Autoplay per audio silente bloccato fino a interazione utente:', e);
    });

    // 2. MediaSession API
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: 'Traduzione Simultanea Attiva',
        artist: 'Polacco ➔ Italiano',
        album: 'Interprete Bluetooth Live',
        artwork: [
          { src: '/icon.svg', sizes: '512x512', type: 'image/svg+xml' }
        ]
      });

      navigator.mediaSession.setActionHandler('play', () => {
        if (silentAudioElement) silentAudioElement.play();
        if (onStateChange) onStateChange(true);
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        if (onStateChange) onStateChange(false);
      });
    }

    // 3. Screen Wake Lock
    requestWakeLock();

  } catch (err) {
    console.warn('Mantenimento background parziale:', err);
  }
}

export function disableBackgroundStandbyProtection() {
  if (silentAudioElement) {
    silentAudioElement.pause();
  }
  releaseWakeLock();
}

export async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator && !wakeLock) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => {
        wakeLock = null;
      });
    }
  } catch (err) {
    console.warn('Wake lock non supportato o rifiutato:', err);
  }
}

export function releaseWakeLock() {
  if (wakeLock) {
    wakeLock.release().catch(() => {});
    wakeLock = null;
  }
}

// Speech Synthesis Queue & Playback (Italian output)
let currentSpeechUtterance: SpeechSynthesisUtterance | null = null;

// Helper to get available voices for target language
export function getAvailableVoices(langCode: string): SpeechSynthesisVoice[] {
  if (!('speechSynthesis' in window)) return [];
  const voices = window.speechSynthesis.getVoices();
  const targetPrefix = langCode.split('-')[0].toLowerCase();
  const targetVoices = voices.filter(v => v.lang.toLowerCase().startsWith(targetPrefix));
  
  // Sort voices to put higher quality, soft or natural voices at top
  return targetVoices.sort((a, b) => {
    const aName = a.name.toLowerCase();
    const bName = b.name.toLowerCase();
    const isSoftA = aName.includes('google') || aName.includes('natural') || aName.includes('alice') || aName.includes('federica') || aName.includes('siri') || aName.includes('premium');
    const isSoftB = bName.includes('google') || bName.includes('natural') || bName.includes('alice') || bName.includes('federica') || bName.includes('siri') || bName.includes('premium');
    if (isSoftA && !isSoftB) return -1;
    if (!isSoftA && isSoftB) return 1;
    return a.name.localeCompare(b.name);
  });
}

// Prime / Unlock Speech Synthesis on user interaction
export function primeSpeechSynthesis() {
  if ('speechSynthesis' in window) {
    try {
      window.speechSynthesis.resume();
      const u = new SpeechSynthesisUtterance(' ');
      u.volume = 0.01;
      u.rate = 2.0;
      window.speechSynthesis.speak(u);
    } catch (e) {
      console.warn('Impossibile preparare sintesi vocale:', e);
    }
  }
}

let speechQueueCount = 0;

export function speakTargetText(
  text: string,
  rate: number = 1.0,
  pitch: number = 0.95,
  langCode: string = 'it-IT',
  voiceURI?: string,
  onStart?: () => void,
  onEnd?: () => void
) {
  if (!('speechSynthesis' in window) || !text.trim()) {
    if (onEnd) onEnd();
    return;
  }

  // Ensure speech synthesis is resumed if paused by browser
  if (window.speechSynthesis.paused) {
    window.speechSynthesis.resume();
  }

  // Do NOT cancel active speech! Allow WebSpeech API to queue utterances naturally
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = langCode;
  utterance.rate = Math.max(0.7, Math.min(1.3, rate));
  utterance.pitch = Math.max(0.5, Math.min(1.5, pitch));

  // Find preferred voice
  const targetVoices = getAvailableVoices(langCode);
  let chosenVoice: SpeechSynthesisVoice | undefined;

  if (voiceURI) {
    chosenVoice = targetVoices.find(v => v.voiceURI === voiceURI || v.name === voiceURI);
  }

  if (!chosenVoice && targetVoices.length > 0) {
    chosenVoice = targetVoices[0];
  }

  if (!chosenVoice) {
    const allVoices = window.speechSynthesis.getVoices();
    const targetPrefix = langCode.split('-')[0].toLowerCase();
    chosenVoice = allVoices.find(v => v.lang.toLowerCase().startsWith(targetPrefix));
  }

  if (chosenVoice) {
    utterance.voice = chosenVoice;
  }

  speechQueueCount++;

  utterance.onstart = () => {
    if (onStart) onStart();
  };

  const handleFinish = () => {
    speechQueueCount = Math.max(0, speechQueueCount - 1);
    if (speechQueueCount === 0) {
      currentSpeechUtterance = null;
      if (onEnd) onEnd();
    }
  };

  utterance.onend = handleFinish;

  utterance.onerror = (e) => {
    console.warn('Errore sintesi vocale:', e);
    handleFinish();
  };

  currentSpeechUtterance = utterance;

  // Queue utterance seamlessly
  try {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('Errore riproduzione speak:', err);
    handleFinish();
  }
}

export function stopSpeechSynthesis() {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

// Base64 helper for PCM/Audio blobs
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1] || '';
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
