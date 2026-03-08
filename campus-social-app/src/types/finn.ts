export type FinnRole = "user" | "assistant";

export type FinnChatMessage = {
  id: string;
  role: FinnRole;
  text: string;
  createdAt: number;
  pending?: boolean;
  error?: boolean;
};

