type PartialResultCallback = (text: string) => void;

interface SpeechAdapter {
  requestPermission: () => Promise<boolean>;
  start: (language: string) => Promise<void>;
  stop: () => Promise<void>;
  setPartialCallback: (cb: PartialResultCallback | null) => void;
}

function createWebAdapter(): SpeechAdapter {
  let recognition: any = null;
  let callback: PartialResultCallback | null = null;

  const SpeechRecognitionCtor =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  return {
    requestPermission: async () => {
      if (!SpeechRecognitionCtor) return false;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
        return true;
      } catch {
        return false;
      }
    },
    start: async (language: string) => {
      if (!SpeechRecognitionCtor) throw new Error('Web Speech API not available');
      recognition = new SpeechRecognitionCtor();
      recognition.lang = language;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript && callback) {
          callback(finalTranscript);
        }
      };
      recognition.start();
    },
    stop: async () => {
      if (recognition) {
        try { recognition.stop(); } catch { /* ignore */ }
        recognition = null;
      }
    },
    setPartialCallback: (cb: PartialResultCallback | null) => {
      callback = cb;
    },
  };
}

async function createNativeAdapter(): Promise<SpeechAdapter> {
  const { SpeechRecognition } = await import('@capgo/capacitor-speech-recognition');
  let callback: PartialResultCallback | null = null;
  let listener: any = null;

  return {
    requestPermission: async () => {
      try {
        const result = await SpeechRecognition.requestPermissions();
        return result.speechRecognition === 'granted';
      } catch {
        return false;
      }
    },
    start: async (language: string) => {
      await SpeechRecognition.start({
        language,
        maxResults: 3,
        partialResults: true,
      });
    },
    stop: async () => {
      await SpeechRecognition.stop();
    },
    setPartialCallback: (cb: PartialResultCallback | null) => {
      if (listener) {
        listener.remove();
        listener = null;
      }
      callback = cb;
      if (cb) {
        listener = SpeechRecognition.addListener('partialResults', (data: any) => {
          const match = data.matches?.[0];
          if (match && callback) {
            callback(match);
          }
        });
      }
    },
  };
}

export async function createSpeechAdapter(): Promise<SpeechAdapter> {
  if ((window as any).Capacitor?.isNativePlatform()) {
    return createNativeAdapter();
  }
  const web = createWebAdapter();
  const available = !!(window as any).SpeechRecognition || !!(window as any).webkitSpeechRecognition;
  if (!available) {
    console.warn('Speech recognition not available on this platform');
  }
  return web;
}
