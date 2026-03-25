import { useState, useRef, useCallback } from "react";
import fixWebmDuration from "fix-webm-duration";
import type { SessionAudio, AudioErrorCode } from "@/types/session";

function isWebKitRecorderEnvironment(): boolean {
  if (typeof navigator === "undefined") return false;

  const ua = navigator.userAgent;
  const isIOS =
    /iPad|iPhone|iPod/i.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (isIOS) return true;

  return /Safari/i.test(ua) && !/Chrome|Chromium|CriOS|Edg|OPR|Firefox|FxiOS/i.test(ua);
}

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
  const preferredMimeTypeRef = useRef<string>("");
  const isWebKitRef = useRef<boolean>(false);

  const startRecording = useCallback(async (): Promise<void> => {
    // Stop any previous recorder to prevent stale chunks leaking into the new recording
    const prevRecorder = mediaRecorderRef.current;
    if (prevRecorder && prevRecorder.state !== "inactive") {
      try {
        prevRecorder.ondataavailable = null;
        prevRecorder.onstop = null;
        prevRecorder.onerror = null;
        prevRecorder.stop();
        prevRecorder.stream?.getTracks().forEach((t) => t.stop());
      } catch {
        // Ignore cleanup errors
      }
    }

    // Reset state
    chunksRef.current = [];
    startTimeRef.current = 0;
    mediaRecorderRef.current = null;

    let stream: MediaStream | null = null;

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
      stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      
      console.log("Microphone permission granted, creating MediaRecorder...");
      
      const isWebKit = isWebKitRecorderEnvironment();
      isWebKitRef.current = isWebKit;

      // Safari/WebKit is more reliable with mp4 first.
      const mimeCandidates = isWebKit
        ? [
            "audio/mp4;codecs=mp4a.40.2",
            "audio/mp4",
            "audio/webm;codecs=opus",
            "audio/webm",
            "audio/ogg",
          ]
        : [
            "audio/webm;codecs=opus",
            "audio/webm",
            "audio/mp4",
            "audio/ogg",
          ];

      const mimeType =
        mimeCandidates.find((candidate) => MediaRecorder.isTypeSupported(candidate)) ?? "";
      preferredMimeTypeRef.current = mimeType;

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
        stream?.getTracks().forEach((track) => track.stop());
        setIsRecording(false);
        setAudio({
          available: false,
          errorCode: "REC_START_FAIL",
        });
      };

      const waitForRecorderStart = new Promise<void>((resolveStart, rejectStart) => {
        let settled = false;
        let startTimeout: number | null = null;

        const cleanupStartWait = () => {
          if (startTimeout !== null) {
            clearTimeout(startTimeout);
          }
          mediaRecorder.removeEventListener("start", onStart);
          mediaRecorder.removeEventListener("error", onStartError);
        };

        const onStart = () => {
          if (settled) return;
          settled = true;
          startTimeRef.current = Date.now();
          cleanupStartWait();
          resolveStart();
        };

        const onStartError = () => {
          if (settled) return;
          settled = true;
          cleanupStartWait();
          rejectStart(new Error("MediaRecorder failed to start"));
        };

        startTimeout = window.setTimeout(() => {
          if (settled) return;
          settled = true;
          cleanupStartWait();
          if (mediaRecorder.state === "recording") {
            startTimeRef.current = Date.now();
            resolveStart();
          } else {
            rejectStart(new Error("MediaRecorder start timed out"));
          }
        }, 1500);

        mediaRecorder.addEventListener("start", onStart, { once: true });
        mediaRecorder.addEventListener("error", onStartError, { once: true });
      });

      // Safari/WebKit can be fragile with tiny timeslices.
      if (isWebKit) {
        mediaRecorder.start();
      } else {
        mediaRecorder.start(250);
      }
      await waitForRecorderStart;
      setIsRecording(true);
      
      setAudio({
        available: true,
        recordingStartedAt: new Date().toISOString(),
      });
      
      console.log("Recording started successfully");
    } catch (error) {
      console.error("Failed to start recording:", error);
      stream?.getTracks().forEach((track) => track.stop());
      
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
      startTimeRef.current = 0;
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

    const startedAt = startTimeRef.current > 0 ? startTimeRef.current : Date.now();
    
    return new Promise((resolve) => {
      let resolved = false;
      let finalized = false;
      let stopEventReceived = false;
      let safetyTimer: number | null = null;

      const stopTracks = () => {
        if (recorder.stream) {
          recorder.stream.getTracks().forEach((track) => track.stop());
        }
      };
      
      const cleanup = () => {
        if (!resolved) {
          resolved = true;
          if (safetyTimer !== null) {
            clearTimeout(safetyTimer);
          }
          mediaRecorderRef.current = null;
          setIsRecording(false);
          resolve();
        }
      };

      const finalize = () => {
        if (finalized) return;
        finalized = true;
        console.log("MediaRecorder stopped, processing data...");

        try {
          // Create blob from chunks
          const firstTypedChunk = chunksRef.current.find((chunk) => chunk.type && chunk.type.length > 0);
          const blobType =
            firstTypedChunk?.type ||
            recorder.mimeType ||
            preferredMimeTypeRef.current ||
            (isWebKitRef.current ? "audio/mp4" : "audio/webm");
          const rawBlob = new Blob(chunksRef.current, { type: blobType });
          const durationMs = Date.now() - startedAt;

          console.log("Recorded blob size:", rawBlob.size, "chunks:", chunksRef.current.length);

          // Only save if we have actual audio data
          if (rawBlob.size > 0 && chunksRef.current.length > 0) {
            const saveBlob = (blob: Blob) => {
              const fileUri = URL.createObjectURL(blob);
              setAudio((prev) => ({
                ...prev,
                available: true,
                fileUri,
                durationMs,
                recordingEndedAt: new Date().toISOString(),
              }));
              console.log("Recording saved successfully");
              stopTracks();
              chunksRef.current = [];
              cleanup();
            };

            // Fix WebM duration metadata (MediaRecorder omits it, causing Infinity duration on playback)
            if (blobType.includes("webm")) {
              fixWebmDuration(rawBlob, durationMs)
                .then((fixedBlob: Blob) => saveBlob(fixedBlob))
                .catch((err: unknown) => {
                  console.warn("fix-webm-duration failed, using raw blob:", err);
                  saveBlob(rawBlob);
                });
            } else {
              saveBlob(rawBlob);
            }
            return; // cleanup called inside saveBlob
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
        stopTracks();
        chunksRef.current = [];
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
        stopTracks();
        chunksRef.current = [];
        cleanup();
      };

      // Set up one-time handler for stop event
      const handleStop = () => {
        stopEventReceived = true;
        // Give Safari/WebKit a short window for any late dataavailable event.
        const finalizeDelayMs = isWebKitRef.current ? 250 : 0;
        setTimeout(() => finalize(), finalizeDelayMs);
      };

      recorder.onstop = handleStop;
      recorder.onerror = handleError;
      safetyTimer = window.setTimeout(() => {
        if (!stopEventReceived) {
          console.warn("MediaRecorder stop timed out, finalizing with available chunks");
        }
        finalize();
      }, 2000);

      // Stop recorder. Final dataavailable should be delivered by the browser.
      try {
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
      } catch {
        // Ignore errors on cleanup
      }
    }
    
    if (recorder?.stream) {
      recorder.stream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
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
