import type { Mode } from "@/types/session";

export interface ModeConfig {
  name: Mode;
  thinkSeconds: number;
  speakSeconds: number;
  descriptor: string;
}

export const MODES: ModeConfig[] = [
  {
    name: "EXPLANATION",
    thinkSeconds: 30,
    speakSeconds: 60,
    descriptor: "Clarity and structure",
  },
  {
    name: "STORY",
    thinkSeconds: 30,
    speakSeconds: 60,
    descriptor: "Narrative arc",
  },
  {
    name: "DEBATE",
    thinkSeconds: 20,
    speakSeconds: 60,
    descriptor: "Argumentation",
  },
  {
    name: "ELEVATOR",
    thinkSeconds: 15,
    speakSeconds: 45,
    descriptor: "Concise persuasion",
  },
  {
    name: "SPEED",
    thinkSeconds: 10,
    speakSeconds: 45,
    descriptor: "Quick thinking",
  },
  {
    name: "MANUAL",
    thinkSeconds: 30,
    speakSeconds: 60,
    descriptor: "Custom timing",
  },
];

export const DEFAULT_MODE = MODES[0];

export function getModeConfig(mode: Mode): ModeConfig {
  return MODES.find((m) => m.name === mode) ?? DEFAULT_MODE;
}

export function getNextMode(currentMode: Mode): Mode {
  const currentIndex = MODES.findIndex((m) => m.name === currentMode);
  const nextIndex = (currentIndex + 1) % MODES.length;
  return MODES[nextIndex].name;
}
