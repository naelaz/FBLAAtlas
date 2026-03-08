import { FinnChatMessage } from "../types/finn";

type AskFinnInput = {
  message: string;
  userName?: string;
  schoolName?: string;
  history?: FinnChatMessage[];
};

type OpenAIResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
};

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY?.trim() ?? "";
const OPENAI_MODEL = process.env.EXPO_PUBLIC_OPENAI_MODEL?.trim() || "gpt-4o-mini";
const OPENAI_ENDPOINT = "https://api.openai.com/v1/chat/completions";

function looksLikeRealOpenAiKey(key: string): boolean {
  if (!key || key.length < 24) {
    return false;
  }
  if (key.includes("REPLACE_")) {
    return false;
  }
  return key.startsWith("sk-");
}

function buildSystemPrompt(schoolName?: string): string {
  const school = schoolName?.trim() || "your school";
  return [
    "You are Finn, a friendly AI assistant in FBLA Atlas.",
    "Voice: encouraging, supportive, light humor, like a helpful older student mentor.",
    "Keep advice practical and concise.",
    `Context: student life at ${school}.`,
    "You can help with XP tiers, leaderboard strategy, school events, clubs, homework planning, and study tips.",
    "If the user asks for harmful, unsafe, or cheating behavior, refuse and redirect to safe alternatives.",
  ].join(" ");
}

export function isFinnConfigured(): boolean {
  return looksLikeRealOpenAiKey(OPENAI_API_KEY);
}

export async function askFinn(input: AskFinnInput): Promise<string> {
  if (!isFinnConfigured()) {
    throw new Error("Live AI is disabled: set EXPO_PUBLIC_OPENAI_API_KEY in .env.");
  }

  const history = (input.history ?? [])
    .slice(-10)
    .map((item) => ({
      role: item.role,
      content: item.text,
    }));

  const response = await fetch(OPENAI_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.7,
      max_tokens: 350,
      messages: [
        { role: "system", content: buildSystemPrompt(input.schoolName) },
        ...history,
        {
          role: "user",
          content: input.userName
            ? `${input.userName}: ${input.message.trim()}`
            : input.message.trim(),
        },
      ],
    }),
  });

  const data = (await response.json()) as OpenAIResponse;

  if (!response.ok) {
    const message = data.error?.message || `OpenAI request failed (${response.status}).`;
    throw new Error(message);
  }

  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) {
    throw new Error("Finn could not generate a response. Please try again.");
  }

  return text;
}
