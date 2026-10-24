// This adapter is the only place that knows the browser recognition API.
// A future provider can implement the same interface without changing forms.
export type TranscriptionOptions = { onText: (text: string) => void; onError: () => void; onEnd: () => void };
export type Transcription = { stop: () => void };
export interface SpeechProvider { supported: () => boolean; transcribe: (options: TranscriptionOptions) => Transcription }
interface RecognitionResult { isFinal: boolean; 0: { transcript: string } }
interface RecognitionEvent { resultIndex: number; results: { length: number; [index: number]: RecognitionResult } }
interface Recognition {
  lang: string; continuous: boolean; interimResults: boolean;
  onresult: ((event: RecognitionEvent) => void) | null; onerror: (() => void) | null; onend: (() => void) | null;
  start: () => void; stop: () => void; abort: () => void;
}
type SpeechWindow = Window & { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
const constructor = () => typeof window === "undefined" ? undefined : (window as SpeechWindow).SpeechRecognition ?? (window as SpeechWindow).webkitSpeechRecognition;
export const speech: SpeechProvider = {
  supported: () => !!constructor(),
  transcribe(options) {
    const RecognitionApi = constructor(); if (!RecognitionApi) throw new Error("Speech unavailable");
    const recognition = new RecognitionApi(); recognition.lang = "mn-MN"; recognition.continuous = true; recognition.interimResults = false;
    recognition.onresult = event => {
      for (let index = event.resultIndex; index < event.results.length; index++) {
        if (event.results[index].isFinal) options.onText(event.results[index][0].transcript);
      }
    };
    recognition.onerror = options.onError; recognition.onend = options.onEnd; recognition.start();
    return { stop: () => { recognition.stop(); } };
  },
};
export const transcribe = (options: TranscriptionOptions) => speech.transcribe(options);
