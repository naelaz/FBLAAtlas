import { FinnChatMessage } from "../types/finn";

type AskFinnInput = {
  message: string;
  userName?: string;
  schoolName?: string;
  history?: FinnChatMessage[];
};

type FinnFunctionResponse = {
  content?: string;
  output?: string;
  result?: unknown;
  payload?: unknown;
  error?: {
    message?: string;
  };
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

const FINN_FUNCTION_URL = process.env.EXPO_PUBLIC_FINN_FUNCTION_URL?.trim() ?? "";
const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY?.trim() ?? "";
const OPENAI_MODEL = process.env.EXPO_PUBLIC_OPENAI_MODEL?.trim() || "gpt-4o-mini";

function hasFunctionBackend(): boolean {
  return Boolean(FINN_FUNCTION_URL);
}

function hasOpenAi(): boolean {
  return Boolean(OPENAI_API_KEY);
}

function buildSystemPrompt(schoolName?: string): string {
  const school = schoolName?.trim() || "your school";
  return [
    "You are Finn, an expert FBLA coach and student mentor.",
    "Voice: concise, practical, and encouraging.",
    "Prioritize actionable next steps for FBLA members.",
    `Context: student life and FBLA preparation at ${school}.`,
    "Focus on FBLA events, testing strategy, presentation coaching, networking, chapter leadership, and conference readiness.",
  ].join(" ");
}

function buildFallbackReply(input: AskFinnInput): string {
  const message = input.message.trim().toLowerCase();
  const name = input.userName?.split(" ")[0] || "there";

  if (message.includes("event") || message.includes("competition")) {
    return `Good question, ${name}. Pick one event, run one timed practice round today, and score yourself against the rubric.`;
  }
  if (message.includes("presentation") || message.includes("speech")) {
    return "Use this structure: hook, problem, solution, measurable outcome, close. Then run one timed rehearsal.";
  }
  if (message.includes("test") || message.includes("study")) {
    return "Run a 25-minute study block, then write 3 key takeaways and 1 weak topic to review next.";
  }
  return `I got your message: "${input.message.trim()}". Tell me your FBLA event and deadline, and I will build a focused prep plan.`;
}

function parseFunctionText(payload: FinnFunctionResponse): string {
  const nested = payload.result ?? payload.payload;
  if (typeof nested === "string" && nested.trim().length > 0) {
    return nested.trim();
  }
  if (typeof payload.content === "string" && payload.content.trim().length > 0) {
    return payload.content.trim();
  }
  if (typeof payload.output === "string" && payload.output.trim().length > 0) {
    return payload.output.trim();
  }
  if (nested && typeof nested === "object") {
    return JSON.stringify(nested);
  }
  throw new Error("Empty response");
}

function parseOpenAiText(payload: OpenAIResponse): string {
  const text = payload.choices?.[0]?.message?.content?.trim() ?? "";
  if (!text) {
    throw new Error(payload.error?.message ?? "Empty OpenAI response");
  }
  return text;
}

export function isFinnConfigured(): boolean {
  return hasFunctionBackend() || hasOpenAi();
}

export async function askFinn(input: AskFinnInput): Promise<string> {
  const safeMessage = input.message.trim();
  if (!safeMessage) {
    return "Send a question and I will help you plan your next FBLA steps.";
  }

  const history = (input.history ?? []).slice(-10).map((item) => ({
    role: item.role,
    content: item.text,
  }));

  if (hasFunctionBackend()) {
    try {
      const response = await fetch(FINN_FUNCTION_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          task: "finn_chat",
          messages: [
            { role: "system", content: buildSystemPrompt(input.schoolName) },
            ...history,
            {
              role: "user",
              content: input.userName ? `${input.userName}: ${safeMessage}` : safeMessage,
            },
          ],
        }),
      });

      const data = (await response.json()) as FinnFunctionResponse;
      console.log("Finn function response:", data);
      if (response.ok) {
        return parseFunctionText(data);
      }
    } catch (error) {
      console.warn("Finn function request failed:", error);
    }
  }

  if (hasOpenAi()) {
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: OPENAI_MODEL,
          temperature: 0.5,
          messages: [
            { role: "system", content: buildSystemPrompt(input.schoolName) },
            ...history,
            {
              role: "user",
              content: input.userName ? `${input.userName}: ${safeMessage}` : safeMessage,
            },
          ],
        }),
      });

      const data = (await response.json()) as OpenAIResponse;
      console.log("Finn OpenAI response:", data);
      if (!response.ok) {
        throw new Error(data.error?.message ?? "OpenAI request failed");
      }
      return parseOpenAiText(data);
    } catch (error) {
      console.warn("Finn OpenAI request failed:", error);
    }
  }

  return buildFallbackReply(input);
}
