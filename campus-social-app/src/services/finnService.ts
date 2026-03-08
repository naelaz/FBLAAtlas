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

function buildFallbackReply(input: AskFinnInput): string {
  const message = input.message.trim().toLowerCase();
  const name = input.userName?.split(" ")[0] || "there";

  if (message.includes("event")) {
    return `Good question, ${name}. Open Events and filter by category. Then join 1 event this week so you gain XP and stay visible on the feed.`;
  }
  if (message.includes("xp") || message.includes("tier") || message.includes("leaderboard")) {
    return `To climb faster: post consistently, comment on classmates' posts, and join events. That combo is usually the fastest path to the next tier.`;
  }
  if (message.includes("club")) {
    return "Pick 2 clubs: one for leadership and one for skills. Start by introducing yourself in each club thread and showing up at the next meeting.";
  }
  if (message.includes("study") || message.includes("homework") || message.includes("fbla")) {
    return "Try this plan: 1) 25-minute focused block, 2) 5-minute reset, 3) repeat 3 rounds. End with a quick summary card so review is easier tomorrow.";
  }

  return `I can help with events, XP/tier strategy, clubs, and FBLA prep. Tell me your goal for this week and I will map it into 3 concrete steps.`;
}

export function isFinnConfigured(): boolean {
  return looksLikeRealOpenAiKey(OPENAI_API_KEY);
}

export async function askFinn(input: AskFinnInput): Promise<string> {
  const safeMessage = input.message.trim();
  if (!safeMessage) {
    return "Send a question and I will help you plan your next steps.";
  }

  if (!isFinnConfigured()) {
    return buildFallbackReply(input);
  }

  const history = (input.history ?? [])
    .slice(-10)
    .map((item) => ({
      role: item.role,
      content: item.text,
    }));

  try {
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
              ? `${input.userName}: ${safeMessage}`
              : safeMessage,
          },
        ],
      }),
    });

    const data = (await response.json()) as OpenAIResponse;

    if (!response.ok) {
      return buildFallbackReply(input);
    }

    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) {
      return buildFallbackReply(input);
    }

    return text;
  } catch {
    return buildFallbackReply(input);
  }
}
