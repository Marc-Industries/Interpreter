import { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { TranslationView } from './components/TranslationView';
import { SettingsModal } from './components/SettingsModal';
import { HistoryDrawer } from './components/HistoryDrawer';
import { InstallPrompt } from './components/InstallPrompt';
import { MicPermissionModal } from './components/MicPermissionModal';
import { AudioDevice, AudioSettings, TranslationItem, TranslationState } from './types';
import {
  getAudioInputDevices,
  enableBackgroundStandbyProtection,
  disableBackgroundStandbyProtection,
  speakTargetText,
  primeSpeechSynthesis,
  stopSpeechSynthesis,
  blobToBase64,
} from './utils/audioUtils';

// Fallback interface for Web Speech Recognition API
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

export default function App() {
  // App State
  const [isListening, setIsListening] = useState(false);
  const [state, setState] = useState<TranslationState>('idle');
  const [sourceText, setSourceText] = useState('');
  const [interimSourceText, setInterimSourceText] = useState('');
  const [targetText, setTargetText] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  // Settings & Devices
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  
  const [settings, setSettings] = useState<AudioSettings>(() => {
    const saved = localStorage.getItem('appSettings');
    const defaultSettings: AudioSettings = {
      apiKey: '',
      sourceLang: { name: 'Polacco', code: 'pl-PL' },
      targetLang: { name: 'Italiano', code: 'it-IT' },
      selectedDeviceId: '',
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      enableAutoTts: true,
      ttsRate: 1.0,
      ttsPitch: 0.95,
      selectedVoiceURI: '',
    };
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Migrations from older string format or undefined
        if (!parsed.sourceLang || typeof parsed.sourceLang !== 'object') parsed.sourceLang = defaultSettings.sourceLang;
        if (!parsed.targetLang || typeof parsed.targetLang !== 'object') parsed.targetLang = defaultSettings.targetLang;
        return { ...defaultSettings, ...parsed };
      } catch (e) {
        return defaultSettings;
      }
    }
    return defaultSettings;
  });

  // Save settings to localStorage when they change
  useEffect(() => {
    localStorage.setItem('appSettings', JSON.stringify(settings));
  }, [settings]);

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isMicModalOpen, setIsMicModalOpen] = useState(false);

  // History Log
  const [history, setHistory] = useState<TranslationItem[]>([]);

  // Refs for speech recognition, media recorder, audio analyzer and timers
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const translateDebounceTimerRef = useRef<any>(null);
  const lastProcessedTextRef = useRef<string>('');
  const isTranslatingRef = useRef<boolean>(false);
  const isListeningRef = useRef<boolean>(false);
  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);
  const accumulatedSourceRef = useRef<string>('');
  const audioQueueRef = useRef<{ audio: HTMLAudioElement; onEnd: () => void }[]>([]);
  const isPlayingAudioRef = useRef<boolean>(false);

  const enqueueGeminiAudio = useCallback((audio: HTMLAudioElement, onEnd: () => void) => {
    const playNext = () => {
      if (audioQueueRef.current.length === 0) {
        isPlayingAudioRef.current = false;
        return;
      }
      isPlayingAudioRef.current = true;
      const current = audioQueueRef.current.shift()!;
      
      const handleDone = () => {
        current.onEnd();
        playNext();
      };

      current.audio.onended = handleDone;
      current.audio.onerror = handleDone;
      current.audio.play().catch((e) => {
        console.warn('Errore riproduzione audio queue:', e);
        handleDone();
      });
    };

    audioQueueRef.current.push({ audio, onEnd });
    if (!isPlayingAudioRef.current) {
      playNext();
    }
  }, []);

  // Refresh audio devices list
  const refreshDevices = useCallback(async () => {
    const list = await getAudioInputDevices();
    setDevices(list);
    // Auto select bluetooth device if found and no device manually set
    if (!settings.selectedDeviceId) {
      const btDevice = list.find((d) => d.isBluetooth);
      if (btDevice) {
        setSettings((prev) => ({ ...prev, selectedDeviceId: btDevice.deviceId }));
      }
    }
  }, [settings.selectedDeviceId]);

  useEffect(() => {
    refreshDevices();
  }, [refreshDevices]);

  // Request Microphone Permission directly
  const requestMicrophonePermission = useCallback(async (): Promise<boolean> => {
    try {
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: settings.echoCancellation,
          noiseSuppression: settings.noiseSuppression,
          autoGainControl: settings.autoGainControl,
          ...(settings.selectedDeviceId ? { deviceId: { exact: settings.selectedDeviceId } } : {}),
        },
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      stream.getTracks().forEach((t) => t.stop());
      setErrorMsg(null);
      setIsMicModalOpen(false);
      refreshDevices();
      return true;
    } catch (err: any) {
      console.warn('Richiesta permesso microfono fallita:', err);
      return false;
    }
  }, [refreshDevices, settings]);

  // Find active selected device object
  const activeDevice = devices.find((d) => d.deviceId === settings.selectedDeviceId) || null;

  // Handle Translate Call to Server
  const handleTranslateText = useCallback(
    async (textToTranslate: string) => {
      const trimmed = textToTranslate.trim();
      if (!trimmed) return;

      // Avoid repeating exact same translation in rapid succession
      if (trimmed === lastProcessedTextRef.current && isTranslatingRef.current) return;

      isTranslatingRef.current = true;
      lastProcessedTextRef.current = trimmed;
      setState('processing');
      setErrorMsg(null);

      // Immediately clear Polish input state to prevent phrase accumulation loops
      setSourceText(trimmed);
      setInterimSourceText('');

      try {
        const recentHistoryTexts = history.slice(-3).map((h) => `${h.originalText} => ${h.translatedText}`);

        const response = await fetch('/api/translate', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            ...(settings.apiKey ? { 'x-gemini-api-key': settings.apiKey } : {})
          },
          body: JSON.stringify({
            text: trimmed,
            contextHistory: recentHistoryTexts,
            sourceLang: settings.sourceLang?.name || 'Polacco',
            targetLang: settings.targetLang?.name || 'Italiano',
          }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Errore nella chiamata di traduzione');
        }

        const translation = data.translation || '';
        setTargetText(translation);

        // Clear Polish text after translation is received
        setSourceText('');

        // Add to history
        const newItem: TranslationItem = {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          timestamp: Date.now(),
          originalText: trimmed,
          translatedText: translation,
          isFinal: true,
        };

        setHistory((prev) => [newItem, ...prev]);

      // Helper to isolate mic during TTS playback to prevent audio loopback
      const setMicTrackState = (enabled: boolean) => {
        if (streamRef.current) {
          streamRef.current.getAudioTracks().forEach((track) => {
            track.enabled = enabled;
          });
        }
      };

      // Trigger Auto TTS immediately
      if (settings.enableAutoTts && translation) {
        setState('speaking');
        setMicTrackState(false); // Temporarily mute mic while app is speaking

        const clearItalianAfterSpeech = () => {
          setMicTrackState(!isMuted); // Re-enable mic when speech finishes
          setTargetText('');
          if (isListeningRef.current) setState('listening');
          else setState('idle');
        };

        // Default WebSpeech - Instantaneous
        speakTargetText(
          translation,
          settings.ttsRate,
          settings.ttsPitch,
          settings.targetLang?.code || 'it-IT',
          settings.selectedVoiceURI,
          () => setState('speaking'),
          clearItalianAfterSpeech
        );
      } else {
          // Clear Italian text after 2.5s if auto-tts is off
          setTimeout(() => {
            setTargetText('');
          }, 2500);
          setState(isListeningRef.current ? 'listening' : 'idle');
        }
      } catch (err: any) {
        console.error('Errore traduzione:', err);
        const errMsg = err.message || 'Errore di traduzione';
        setErrorMsg(errMsg);
        setState('error');
        setTimeout(() => {
          if (isListeningRef.current) {
            setState('listening');
            setErrorMsg(null);
          } else {
            setState('idle');
          }
        }, 4000);
      } finally {
        isTranslatingRef.current = false;
      }
    },
    [history, settings.enableAutoTts, settings.ttsRate, settings.ttsPitch, settings.selectedVoiceURI, settings.apiKey, settings.sourceLang, settings.targetLang, isMuted]
  );

  // Audio Visualizer setup
  const setupAudioAnalyzer = useCallback((stream: MediaStream) => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      const analyzer = audioCtx.createAnalyser();
      analyzer.fftSize = 64;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyzer);

      audioContextRef.current = audioCtx;
      analyzerRef.current = analyzer;

      const dataArray = new Uint8Array(analyzer.frequencyBinCount);
      const updateLevel = () => {
        if (!analyzerRef.current) return;
        analyzerRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
        requestAnimationFrame(updateLevel);
      };
      updateLevel();
    } catch (e) {
      console.warn('Audio analyzer non avviato:', e);
    }
  }, []);

  // Continuous Speech & Audio Listener setup
  const startAudioListening = useCallback(async () => {
    try {
      // 1. Obtain Microphone Stream for Hardware Filters & Audio Level Visualizer
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: settings.echoCancellation,
          noiseSuppression: settings.noiseSuppression,
          autoGainControl: settings.autoGainControl,
          ...(settings.selectedDeviceId ? { deviceId: { exact: settings.selectedDeviceId } } : {}),
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      setupAudioAnalyzer(stream);

      // 2. Setup Web Speech Recognition
      const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;

      if (SpeechRecognitionClass) {
        if (recognitionRef.current) {
          try { recognitionRef.current.stop(); } catch {}
        }

        const recognition = new SpeechRecognitionClass();
        recognition.lang = settings.sourceLang?.code || 'pl-PL';
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        recognition.onresult = (event: any) => {
          let finalTranscript = '';
          let interimTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += ' ' + event.results[i][0].transcript;
            } else {
              interimTranscript += ' ' + event.results[i][0].transcript;
            }
          }

          if (finalTranscript.trim()) {
            accumulatedSourceRef.current = (accumulatedSourceRef.current + ' ' + finalTranscript.trim()).trim();
            setSourceText(accumulatedSourceRef.current);
            setInterimSourceText('');

            // Wait for a natural pause in speech (900ms) to ensure full sentences are translated together
            clearTimeout(translateDebounceTimerRef.current);
            translateDebounceTimerRef.current = setTimeout(() => {
              const fullText = accumulatedSourceRef.current.trim();
              if (fullText) {
                accumulatedSourceRef.current = '';
                handleTranslateText(fullText);
              }
            }, 900);
          } else if (interimTranscript.trim()) {
            setInterimSourceText(interimTranscript.trim());
            clearTimeout(translateDebounceTimerRef.current);
            translateDebounceTimerRef.current = setTimeout(() => {
              const fullText = accumulatedSourceRef.current.trim();
              if (fullText) {
                accumulatedSourceRef.current = '';
                handleTranslateText(fullText);
              }
            }, 1200);
          }
        };

        recognition.onerror = (event: any) => {
          console.warn('SpeechRecognition warning:', event.error);
          if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
            setErrorMsg('Permesso microfono negato dal browser o piattaforma.');
            setIsMicModalOpen(true);
            isListeningRef.current = false;
            setIsListening(false);
            setState('idle');
          }
        };

        recognition.onend = () => {
          // Standard continuous restart if listening is still active
          if (isListeningRef.current && recognitionRef.current) {
            try {
              recognitionRef.current.start();
            } catch {
              // Already running or stopped intentionally
            }
          }
        };

        recognition.start();
        recognitionRef.current = recognition;
      } else {
        // Fallback: MediaRecorder chunking
        const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = async (e) => {
          if (e.data.size > 0 && isListeningRef.current) {
            const base64 = await blobToBase64(e.data);
            setState('processing');

            try {
              const res = await fetch('/api/translate', {
                method: 'POST',
                headers: { 
                  'Content-Type': 'application/json',
                  ...(settings.apiKey ? { 'x-gemini-api-key': settings.apiKey } : {})
                },
                body: JSON.stringify({
                  audioBase64: base64,
                  mimeType: 'audio/webm;codecs=opus',
                  sourceLang: settings.sourceLang?.name || 'Polacco',
                  targetLang: settings.targetLang?.name || 'Italiano',
                }),
              });
              const data = await res.json();
              if (data.success && data.translation) {
                setTargetText(data.translation);
                if (settings.enableAutoTts) {
                  speakTargetText(data.translation, settings.ttsRate, settings.ttsPitch, settings.targetLang?.code || 'it-IT', settings.selectedVoiceURI);
                }
              }
            } catch (err) {
              console.error('Errore audio chunk translation:', err);
            } finally {
              if (isListeningRef.current) setState('listening');
            }
          }
        };

        recorder.start(4000);
      }
    } catch (err: any) {
      console.error('Impossibile accedere al microfono:', err);
      const isDenied =
        err?.name === 'NotAllowedError' ||
        err?.name === 'PermissionDeniedError' ||
        err?.message?.toLowerCase().includes('not allowed') ||
        err?.message?.toLowerCase().includes('denied') ||
        err?.message?.toLowerCase().includes('permission');

      if (isDenied) {
        setErrorMsg('Impossibile accedere al microfono: Permesso non consentito dal browser o dall\'iframe.');
        setIsMicModalOpen(true);
      } else {
        setErrorMsg('Impossibile accedere al microfono. Verifica le impostazioni del dispositivo.');
      }
      isListeningRef.current = false;
      setIsListening(false);
      setState('idle');
    }
  }, [handleTranslateText, settings, setupAudioAnalyzer]);

  // Toggle Listening Session
  const handleToggleListening = () => {
    if (isListeningRef.current) {
      // STOP
      isListeningRef.current = false;
      setIsListening(false);
      setState('idle');
      disableBackgroundStandbyProtection();

      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
        recognitionRef.current = null;
      }
      if (mediaRecorderRef.current) {
        try { mediaRecorderRef.current.stop(); } catch {}
        mediaRecorderRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      stopSpeechSynthesis();
    } else {
      // START
      isListeningRef.current = true;
      setIsListening(true);
      setState('listening');
      setErrorMsg(null);
      primeSpeechSynthesis();
      enableBackgroundStandbyProtection();
      startAudioListening();
    }
  };

  // Mute / Unmute
  const handleToggleMute = () => {
    setIsMuted(!isMuted);
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = isMuted; // Toggle enabled
      });
    }
  };

  // Clear display texts
  const handleClearTexts = () => {
    setSourceText('');
    setInterimSourceText('');
    setTargetText('');
    lastProcessedTextRef.current = '';
    setErrorMsg(null);
  };

  // Re-play last Italian speech
  const handleRepeatItalianSpeech = () => {
    if (targetText) {
      speakTargetText(targetText, settings.ttsRate, settings.ttsPitch, settings.selectedVoiceURI);
    }
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      disableBackgroundStandbyProtection();
      stopSpeechSynthesis();
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-zinc-100 flex flex-col font-sans selection:bg-emerald-500/30">
      {/* Header */}
      <Header
        isListening={isListening}
        activeDevice={activeDevice}
        historyCount={history.length}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
      />

      {/* Main View */}
      <main className="flex-1 flex flex-col">
        <TranslationView
          isListening={isListening}
          state={state}
          sourceText={sourceText}
          interimSourceText={interimSourceText}
          targetText={targetText}
          audioLevel={audioLevel}
          isMuted={isMuted}
          ttsRate={settings.ttsRate}
          enableAutoTts={settings.enableAutoTts}
          onToggleAutoTts={() => setSettings((s) => ({ ...s, enableAutoTts: !s.enableAutoTts }))}
          onToggleListening={handleToggleListening}
          onToggleMute={handleToggleMute}
          onClearTexts={handleClearTexts}
          onRepeatItalianSpeech={handleRepeatItalianSpeech}
          onSourceTextChange={(text) => setSourceText(text)}
          onRequestMicPermission={() => setIsMicModalOpen(true)}
          errorMsg={errorMsg}
        />
      </main>

      {/* Microphone Permission Modal */}
      <MicPermissionModal
        isOpen={isMicModalOpen}
        onClose={() => setIsMicModalOpen(false)}
        onRequestPermission={requestMicrophonePermission}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        devices={devices}
        onUpdateSettings={(newPartial) => setSettings((prev) => ({ ...prev, ...newPartial }))}
        onRefreshDevices={refreshDevices}
      />

      {/* History Drawer */}
      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={history}
        onClearHistory={() => setHistory([])}
        ttsRate={settings.ttsRate}
        ttsPitch={settings.ttsPitch}
        selectedVoiceURI={settings.selectedVoiceURI}
      />

      {/* PWA Install Banner */}
      <InstallPrompt />
    </div>
  );
}
