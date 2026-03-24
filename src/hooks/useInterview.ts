import { useState, useCallback } from "react";
import type { InterviewQuestion } from "@/types/interview";
import {
  parseResume,
  fetchRandomQuestion,
  fetchBehavioralQuestion,
  fetchCategories,
  ResumeUploadError,
} from "@/lib/interviewApi";

export interface ResumeState {
  fileName: string | null;
  isUploaded: boolean;
  isParsing: boolean;
  parseError: string | null;
  detectedLanguage: string | null;
  detectedField: string | null;
  questionsGenerated: number | null;
  /** Weekly rate limit */
  uploadsUsed: number | null;
  maxUploadsPerWeek: number | null;
  nextSlotAt: string | null;
}

const INITIAL_RESUME_STATE: ResumeState = {
  fileName: null,
  isUploaded: false,
  isParsing: false,
  parseError: null,
  detectedLanguage: null,
  detectedField: null,
  questionsGenerated: null,
  uploadsUsed: null,
  maxUploadsPerWeek: null,
  nextSlotAt: null,
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
        detectedLanguage: result.detectedLanguage,
        detectedField: result.detectedField,
        questionsGenerated: result.questionsGenerated,
        uploadsUsed: null,
        maxUploadsPerWeek: null,
        nextSlotAt: null,
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
        uploadsUsed: error.uploadsUsed ?? prev.uploadsUsed,
        maxUploadsPerWeek: error.maxUploadsPerWeek ?? prev.maxUploadsPerWeek,
        nextSlotAt: error.nextSlotAt ?? prev.nextSlotAt,
      }));
      throw error;
    }
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      const cats = await fetchCategories();
      // Always include Behavioral (static pool, separate from resume questions)
      const withBehavioral = cats.includes("Behavioral") ? cats : [...cats, "Behavioral"];
      setCategories(withBehavioral);
      return withBehavioral;
    } catch {
      // Even if API fails, Behavioral is always available
      setCategories(["Behavioral"]);
      return ["Behavioral"];
    }
  }, []);

  const fetchNextQuestion = useCallback(async (language?: string) => {
    setIsFetchingQuestion(true);
    try {
      const difficulty = selectedDifficulty ?? undefined;

      if (selectedCategory === "Behavioral") {
        // Behavioral questions come from a separate static pool
        const bq = await fetchBehavioralQuestion(language, difficulty);
        const question: InterviewQuestion = {
          id: `behavioral-${Date.now()}`,
          question: bq.question,
          category: "Behavioral",
          difficulty: bq.difficulty,
          thinkingSeconds: bq.thinkingSeconds,
          answeringSeconds: bq.answeringSeconds,
        };
        setCurrentQuestion(question);
        return question;
      }

      const category = selectedCategory ?? undefined;
      const question = await fetchRandomQuestion(difficulty, category);
      setCurrentQuestion(question);
      return question;
    } finally {
      setIsFetchingQuestion(false);
    }
  }, [selectedDifficulty, selectedCategory]);

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
        const withBehavioral = cats.includes("Behavioral") ? cats : [...cats, "Behavioral"];
        setCategories(withBehavioral);
      } catch {
        setCategories(["Behavioral"]);
      }
      return true;
    } catch (err) {
      const error = err as ResumeUploadError;
      if (error.code === "no_questions") {
        // No resume questions yet, but Behavioral is always available
        setCategories(["Behavioral"]);
        return false;
      }
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
