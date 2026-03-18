import { useState, useRef, useCallback } from "react";

type SessionLanguage = "EN" | "FR" | "AR";

const LANGUAGE_TO_LOCALE: Record<SessionLanguage, string> = {
  EN: "en-US",
  FR: "fr-FR",
  AR: "ar-SA",
};

interface UseTranscriptionReturn {
  transcript: string;
  isTranscribing: boolean;
  startTranscription: (language?: SessionLanguage) => void;
  stopTranscription: () => void;
  resetTranscription: () => void;
  error: string | null;
}

// Check if SpeechRecognition is supported
const SpeechRecognitionAPI = 
  typeof window !== "undefined" 
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition 
    : null;

export function useTranscription(): UseTranscriptionReturn {
  const [transcript, setTranscript] = useState("");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  const startTranscription = useCallback((language?: SessionLanguage) => {
    if (!SpeechRecognitionAPI) {
      setError("Speech recognition not supported in this browser");
      return;
    }

    try {
      // Create new recognition instance
      const recognition = new SpeechRecognitionAPI();
      recognitionRef.current = recognition;

      // Configure recognition
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = LANGUAGE_TO_LOCALE[language ?? "EN"];

      recognition.onstart = () => {
        setIsTranscribing(true);
        setError(null);
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = "";
        let interimTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript + " ";
          } else {
            interimTranscript += result[0].transcript;
          }
        }

        setTranscript((prev) => prev + finalTranscript);
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        if (event.error === "not-allowed") {
          setError("Microphone permission denied");
        } else if (event.error === "no-speech") {
          // No speech detected, can ignore
        } else {
          setError(`Error: ${event.error}`);
        }
        setIsTranscribing(false);
      };

      recognition.onend = () => {
        setIsTranscribing(false);
      };

      recognition.start();
    } catch (err) {
      console.error("Failed to start transcription:", err);
      setError("Failed to start speech recognition");
    }
  }, []);

  const stopTranscription = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore errors on stop
      }
    }
    setIsTranscribing(false);
  }, []);

  const resetTranscription = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore errors
      }
      recognitionRef.current = null;
    }
    setTranscript("");
    setIsTranscribing(false);
    setError(null);
  }, []);

  return {
    transcript,
    isTranscribing,
    startTranscription,
    stopTranscription,
    resetTranscription,
    error,
  };
}

export const isTranscriptionSupported = !!SpeechRecognitionAPI;
