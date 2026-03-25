import type { SessionDifficulty, SessionLanguage } from "@/types/session";
import { API_BASE_URL } from "./apiClient";

interface BackendRandomWordResponse {
  word: string;
}

export async function fetchRandomWordFromBackend(options: {
  language: SessionLanguage;
  difficulty: SessionDifficulty;
  excludedWords?: string[];
}): Promise<string> {
  const params = new URLSearchParams();
  params.set("language", options.language);
  params.set("difficulty", options.difficulty);

  for (const word of options.excludedWords ?? []) {
    if (word.trim().length > 0) {
      params.append("exclude", word);
    }
  }

  const response = await fetch(`${API_BASE_URL}/api/words/random?${params.toString()}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Word endpoint failed (${response.status})`);
  }

  const data = (await response.json()) as BackendRandomWordResponse;
  if (!data?.word || typeof data.word !== "string") {
    throw new Error("Word endpoint returned invalid payload");
  }

  return data.word;
}
