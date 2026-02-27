import { useState, useRef, useCallback } from "react";
import type { SessionAudio, AudioErrorCode } from "@/types/session";

interface UseAudioRecorderReturn {
  audio: SessionAudio | null;
  isRecording: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  resetRecording: () => void;
}

export function useAudioRecorder(): UseAudioRecorderReturn {
  const [audio, setAudio] = useState<SessionAudio | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  
  // Use refs to avoid stale closures
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);

  const startRecording = useCallback(async (): Promise<void> => {
    // Reset state
    chunksRef.current = [];
    startTimeRef.current = Date.now();
    mediaRecorderRef.current = null;
    
    try {
      // Check if in secure context (required for getUserMedia)
      if (!window.isSecureContext) {
        console.error("Audio recording requires HTTPS or localhost");
        setAudio({
          available: false,
          errorCode: "REC_START_FAIL",
        });
        return;
      }

      // Check if MediaRecorder is supported
      if (!window.MediaRecorder) {
        console.error("MediaRecorder not supported in this browser");
        setAudio({
          available: false,
          errorCode: "REC_START_FAIL",
        });
        return;
      }

      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error("getUserMedia not supported in this browser");
        setAudio({
          available: false,
          errorCode: "REC_START_FAIL",
        });
        return;
      }

      console.log("Requesting microphone permission...");
      
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      
      console.log("Microphone permission granted, creating MediaRecorder...");
      
      // Determine supported MIME type
      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/mp4")
        ? "audio/mp4"
        : MediaRecorder.isTypeSupported("audio/ogg")
        ? "audio/ogg"
        : "";

      console.log("Using MIME type:", mimeType || "default");

      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mediaRecorder;

      // Set up data handler
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      // Handle errors
      mediaRecorder.onerror = (event) => {
        console.error("MediaRecorder error:", event);
        stream.getTracks().forEach((track) => track.stop());
        setIsRecording(false);
        setAudio({
          available: false,
          errorCode: "REC_START_FAIL",
        });
      };

      // Start recording
      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      
      setAudio({
        available: true,
        recordingStartedAt: new Date().toISOString(),
      });
      
      console.log("Recording started successfully");
    } catch (error) {
      console.error("Failed to start recording:", error);
      
      // Determine error type
      let errorCode: AudioErrorCode = "REC_START_FAIL";
      if (error instanceof DOMException) {
        if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
          errorCode = "MIC_PERMISSION";
        } else if (error.name === "NotFoundError") {
          errorCode = "NO_AUDIO";
        }
      }
      
      setAudio({
        available: false,
        errorCode,
      });
      setIsRecording(false);
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<void> => {
    const recorder = mediaRecorderRef.current;
    
    console.log("Stopping recording, recorder state:", recorder?.state);
    
    if (!recorder) {
      console.log("No recorder found");
      setIsRecording(false);
      return;
    }

    // If already inactive, just clean up
    if (recorder.state === "inactive") {
      console.log("Recorder already inactive");
      setIsRecording(false);
      return;
    }

    const startedAt = startTimeRef.current;
    
    return new Promise((resolve) => {
      let resolved = false;
      
      const cleanup = () => {
        if (!resolved) {
          resolved = true;
          setIsRecording(false);
          resolve();
        }
      };

      // Set up one-time handler for stop event
      const handleStop = () => {
        console.log("MediaRecorder stopped, processing data...");
        try {
          // Stop all tracks to release microphone
          if (recorder.stream) {
            recorder.stream.getTracks().forEach((track) => track.stop());
          }

          // Create blob from chunks
          const blobType = recorder.mimeType || "audio/webm";
          const blob = new Blob(chunksRef.current, { type: blobType });
          const durationMs = Date.now() - startedAt;
          
          console.log("Recorded blob size:", blob.size, "chunks:", chunksRef.current.length);
          
          // Only save if we have actual audio data
          if (blob.size > 0 && chunksRef.current.length > 0) {
            const fileUri = URL.createObjectURL(blob);
            
            setAudio((prev) => ({
              ...prev,
              available: true,
              fileUri,
              durationMs,
              recordingEndedAt: new Date().toISOString(),
            }));
            console.log("Recording saved successfully");
          } else {
            setAudio((prev) => ({
              ...prev,
              available: false,
              errorCode: "NO_AUDIO",
            }));
            console.log("No audio data recorded");
          }
        } catch (error) {
          console.error("Error stopping recording:", error);
          setAudio((prev) => ({
            ...prev,
            available: false,
            errorCode: "REC_STOP_FAIL",
          }));
        }
        
        cleanup();
      };

      // Handle errors during stop
      const handleError = (event: Event) => {
        console.error("MediaRecorder error during stop:", event);
        setAudio((prev) => ({
          ...prev,
          available: false,
          errorCode: "REC_STOP_FAIL",
        }));
        cleanup();
      };

      recorder.onstop = handleStop;
      recorder.onerror = handleError;

      // Request final data and stop
      try {
        recorder.requestData();
        recorder.stop();
      } catch (error) {
        console.error("Error calling stop:", error);
        handleError(error as Event);
      }
    });
  }, []);

  const resetRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    
    if (recorder && recorder.state !== "inactive") {
      try {
        recorder.stop();
      } catch (e) {
        // Ignore errors on cleanup
      }
    }
    
    if (recorder?.stream) {
      recorder.stream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {
          // Ignore errors on cleanup
        }
      });
    }
    
    mediaRecorderRef.current = null;
    chunksRef.current = [];
    setIsRecording(false);
    setAudio(null);
  }, []);

  return {
    audio,
    isRecording,
    startRecording,
    stopRecording,
    resetRecording,
  };
}
