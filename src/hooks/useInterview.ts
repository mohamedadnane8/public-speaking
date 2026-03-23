import { useState, useCallback } from "react";
import type { InterviewQuestion } from "@/types/interview";
import {
  parseResume,
  fetchRandomQuestion,
  fetchCategories,
  ResumeUploadError,
} from "@/lib/interviewApi";

export interface ResumeState {
  fileName: string | null;
  isUploaded: boolean;
  isParsing: boolean;
  parseError: string | null;
  cooldownUntil: string | null;
}

const INITIAL_RESUME_STATE: ResumeState = {
  fileName: null,
  isUploaded: false,
  isParsing: false,
  parseError: null,
  cooldownUntil: null,
};

export function useInterview() {
  const [resumeState, setResumeState] = useState<ResumeState>(INITIAL_RESUME_STATE);
  const [currentQuestion, setCurrentQuestion] = useState<InterviewQuestion | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);
  const [isFetchingQuestion, setIsFetchingQuestion] = useState(false);

  const uploadResume = useCallback(async (file: File) => {
    setResumeState((prev) => ({
      ...prev,
      isParsing: true,
      parseError: null,
    }));

    try {
      const result = await parseResume(file);
      setResumeState({
        fileName: result.fileName,
        isUploaded: true,
        isParsing: false,
        parseError: null,
        cooldownUntil: null,
      });

      // Load categories after successful upload
      try {
        const cats = await fetchCategories();
        setCategories(cats);
      } catch {
        // Non-critical: categories can be loaded later
      }

      return result;
    } catch (err) {
      const error = err as ResumeUploadError;
      setResumeState((prev) => ({
        ...prev,
        isParsing: false,
        parseError: error.message,
        cooldownUntil: error.nextAllowedAt ?? prev.cooldownUntil,
      }));
      throw error;
    }
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      const cats = await fetchCategories();
      setCategories(cats);
      return cats;
    } catch {
      return [];
    }
  }, []);

  const fetchNextQuestion = useCallback(async () => {
    setIsFetchingQuestion(true);
    try {
      const difficulty = selectedDifficulty ?? undefined;
      const question = await fetchRandomQuestion(difficulty);
      setCurrentQuestion(question);
      return question;
    } finally {
      setIsFetchingQuestion(false);
    }
  }, [selectedDifficulty]);

  const checkResumeStatus = useCallback(async () => {
    // Try to fetch a question — if 404, no resume uploaded
    try {
      await fetchRandomQuestion();
      setResumeState((prev) => ({
        ...prev,
        isUploaded: true,
      }));
      // Also load categories
      try {
        const cats = await fetchCategories();
        setCategories(cats);
      } catch {
        // ignore
      }
      return true;
    } catch (err) {
      const error = err as ResumeUploadError;
      if (error.code === "no_questions") {
        return false;
      }
      // Some other error — assume no resume
      return false;
    }
  }, []);

  const reset = useCallback(() => {
    setCurrentQuestion(null);
  }, []);

  return {
    resumeState,
    currentQuestion,
    categories,
    selectedCategory,
    selectedDifficulty,
    isFetchingQuestion,
    setSelectedCategory,
    setSelectedDifficulty,
    uploadResume,
    loadCategories,
    fetchNextQuestion,
    checkResumeStatus,
    reset,
  };
}
