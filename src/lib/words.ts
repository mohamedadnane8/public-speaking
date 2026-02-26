// Refined topic list - single powerful words
export const WORDS = [
  // Core Human Values
  "Courage", "Clarity", "Presence", "Balance", "Growth",
  "Vision", "Purpose", "Wisdom", "Truth", "Beauty",
  "Harmony", "Freedom", "Strength", "Kindness", "Patience",
  "Focus", "Trust", "Hope", "Joy", "Peace",
  "Love", "Passion", "Grace", "Humility", "Resilience",

  // Identity & Self
  "Identity", "Ego", "Self-Worth", "Confidence", "Doubt",
  "Authenticity", "Insecurity", "Discipline", "Integrity", "Vulnerability",
  "Selfishness", "Maturity", "Awareness", "Intention", "Character",
  "Values", "Morality", "Belief", "Perception", "Mindset",
  "Habits", "Instinct", "Impulse", "Control", "Independence",

  // Success & Ambition
  "Ambition", "Mastery", "Excellence", "Consistency", "Progress",
  "Momentum", "Drive", "Failure", "Success", "Sacrifice",
  "Potential", "Commitment", "Legacy", "Impact", "Risk",
  "Competition", "Leadership", "Responsibility", "Accountability", "Visionary",
  "Perseverance", "Strategy", "Productivity", "Execution",

  // Emotional Depth
  "Fear", "Anxiety", "Shame", "Pride", "Envy",
  "Gratitude", "Jealousy", "Guilt", "Loneliness", "Contentment",
  "Compassion", "Empathy", "Forgiveness", "Rejection", "Abandonment",
  "Heartbreak", "Betrayal", "Redemption",

  // Social & Communication
  "Charisma", "Influence", "Persuasion", "Dialogue", "Listening",
  "Conflict", "Respect", "Boundaries", "Community", "Reputation",
  "Honesty", "Diplomacy", "Authority", "Negotiation", "Transparency",
  "Humor", "Silence", "Expression", "Storytelling",

  // Philosophy & Abstract
  "Time", "Meaning", "Existence", "Destiny", "Fate",
  "Chaos", "Order", "Power", "Illusion",
  "Reality", "Consciousness", "Mortality", "Faith",
  "Justice", "Ethics", "Dignity", "Honor", "Mercy",
  "Liberty", "Evolution",

  // Growth & Transformation
  "Transformation", "Awakening", "Discovery", "Change", "Transition",
  "Reinvention", "Adaptation", "Beginning", "Ending",
  "Journey", "Mistake", "Lesson", "Recovery",
  "Healing", "Breakthrough",

  // Power & Influence
  "Dominance", "Submission", "Status",
  "Hierarchy", "Leverage",

  // Inner Conflict
  "Temptation", "Addiction", "Obsession", "Procrastination",
  "Escape", "Denial", "Resistance", "Limits",
  "Self-Sabotage", "Pressure", "Expectation",

  // Modern Themes
  "Social Media", "AI", "Capitalism", "Privacy",
  "Viral", "Fame", "Relevance",
  "Disruption", "Innovation", "Distraction", "Attention",

  // Relationships
  "Marriage", "Friendship", "Family", "Attraction", "Commitment",
  "Devotion", "Intimacy", "Loyalty", "Sacrifice",
  "Communication", "Partnership",

  // Strength & Discipline
  "Routine", "Determination", "Grit",
  "Endurance", "Tolerance",
  "Moderation", "Simplicity",

  // Creative & Intellectual
  "Creativity", "Inspiration", "Imagination", "Logic", "Reason",
  "Intellect", "Analysis", "Thinking", "Discovery", "Art",
  "Design",
];

export function getRandomWord(): string {
  const randomIndex = Math.floor(Math.random() * WORDS.length);
  return WORDS[randomIndex];
}
