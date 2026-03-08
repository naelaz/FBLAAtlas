import { ConferenceLevel } from "../types/fblaDashboard";

export type PracticeDifficulty = "beginner" | "intermediate" | "advanced" | "competition_ready";

export type PracticeEventCategory =
  | "Business Admin"
  | "Finance"
  | "Technology"
  | "Marketing"
  | "Communication"
  | "Entrepreneurship"
  | "Hospitality"
  | "Career Dev";

export type PracticeEventType =
  | "objective_test"
  | "presentation"
  | "report"
  | "role_play"
  | "team"
  | "portfolio"
  | "project";

export type FblaEventDefinition = {
  id: string;
  name: string;
  category: PracticeEventCategory;
  eventType: PracticeEventType;
  teamEvent: boolean;
  defaultTimeLimitMinutes: number;
  description: string;
  topicAreas: string[];
  judgingCriteria: string[];
  materialsAllowed: string[];
  conferenceLevels: ConferenceLevel[];
};

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function event(
  name: string,
  category: PracticeEventCategory,
  eventType: PracticeEventType,
  options?: Partial<Omit<FblaEventDefinition, "id" | "name" | "category" | "eventType">>,
): FblaEventDefinition {
  return {
    id: slugify(name),
    name,
    category,
    eventType,
    teamEvent: Boolean(options?.teamEvent),
    defaultTimeLimitMinutes: options?.defaultTimeLimitMinutes ?? 60,
    description:
      options?.description ??
      `${name} practice hub based on FBLA event competencies, rubrics, and conference readiness expectations.`,
    topicAreas: options?.topicAreas ?? ["Core concepts", "Applied scenarios", "FBLA standards"],
    judgingCriteria:
      options?.judgingCriteria ?? ["Content accuracy", "Professionalism", "Execution quality"],
    materialsAllowed: options?.materialsAllowed ?? ["Scratch paper", "Calculator (if permitted)", "Digital notes"],
    conferenceLevels: options?.conferenceLevels ?? ["DLC", "SLC", "NLC"],
  };
}

export const FBLA_EVENT_DEFINITIONS: FblaEventDefinition[] = [
  event("Business Calculations", "Business Admin", "objective_test", {
    topicAreas: ["Arithmetic and business formulas", "Interest calculations", "Spreadsheet style calculations"],
  }),
  event("Business Communication", "Communication", "presentation", {
    defaultTimeLimitMinutes: 7,
    topicAreas: ["Professional communication", "Written correspondence", "Audience adaptation"],
    judgingCriteria: ["Clarity", "Delivery", "Professional format"],
  }),
  event("Business Ethics", "Business Admin", "objective_test", {
    topicAreas: ["Ethical frameworks", "Corporate responsibility", "Decision analysis"],
  }),
  event("Business Law", "Business Admin", "objective_test", {
    topicAreas: ["Contracts", "Liability", "Employment law fundamentals"],
  }),
  event("Business Math", "Business Admin", "objective_test", {
    topicAreas: ["Ratios", "Percentages", "Financial calculations"],
  }),
  event("Economics", "Finance", "objective_test", {
    topicAreas: ["Microeconomics", "Macroeconomics", "Policy impacts"],
  }),
  event("Financial Math", "Finance", "objective_test", {
    topicAreas: ["Interest", "Amortization", "Investment returns"],
  }),
  event("Intro to Business", "Business Admin", "objective_test", {
    topicAreas: ["Business ownership", "Operations", "Management basics"],
  }),
  event("Intro to Business Communication", "Communication", "objective_test", {
    topicAreas: ["Business writing", "Interpersonal communication", "Presentation basics"],
  }),
  event("Intro to Financial Math", "Finance", "objective_test", {
    topicAreas: ["Budgeting", "Simple/compound interest", "Personal finance basics"],
  }),
  event("Management Decision Making", "Business Admin", "role_play", {
    defaultTimeLimitMinutes: 20,
    topicAreas: ["Managerial problem solving", "Case analysis", "Strategic tradeoffs"],
    judgingCriteria: ["Decision quality", "Reasoning", "Communication"],
  }),
  event("Organizational Behavior", "Business Admin", "objective_test", {
    topicAreas: ["Motivation", "Team dynamics", "Leadership styles"],
  }),
  event("Personal Finance", "Finance", "objective_test", {
    topicAreas: ["Budgeting", "Credit", "Saving and investing"],
  }),
  event("Accounting I", "Finance", "objective_test", {
    topicAreas: ["Accounting cycle", "Journal entries", "Financial statements"],
  }),
  event("Accounting II", "Finance", "objective_test", {
    topicAreas: ["Advanced accounting procedures", "Adjustments", "Analysis"],
  }),
  event("Banking and Financial Systems", "Finance", "objective_test", {
    topicAreas: ["Banking operations", "Financial institutions", "Regulation"],
  }),
  event("Financial Statement Analysis", "Finance", "objective_test", {
    topicAreas: ["Ratio analysis", "Trend analysis", "Interpretation"],
  }),
  event("Insurance and Risk Management", "Finance", "objective_test", {
    topicAreas: ["Risk identification", "Insurance products", "Mitigation strategies"],
  }),
  event("Securities and Investments", "Finance", "objective_test", {
    topicAreas: ["Investment vehicles", "Portfolio risk", "Market fundamentals"],
  }),
  event("Agribusiness Management", "Business Admin", "objective_test"),
  event("Emerging Business Issues", "Business Admin", "team", {
    teamEvent: true,
    defaultTimeLimitMinutes: 15,
    topicAreas: ["Current business trends", "Innovation impacts", "Team analysis"],
  }),
  event("Global Business", "Business Admin", "objective_test"),
  event("Government and Public Administration", "Business Admin", "objective_test"),
  event("Healthcare Administration", "Business Admin", "objective_test"),
  event("Hospitality Management", "Hospitality", "objective_test"),
  event("Human Resource Management", "Business Admin", "objective_test"),
  event("Network Design", "Technology", "project", {
    defaultTimeLimitMinutes: 30,
    topicAreas: ["Network planning", "Security", "Scalability"],
    judgingCriteria: ["Design quality", "Technical accuracy", "Documentation"],
  }),
  event("Organizational Leadership", "Career Dev", "presentation", {
    defaultTimeLimitMinutes: 7,
    topicAreas: ["Leadership strategy", "Team impact", "Communication"],
  }),
  event("Public Administration", "Business Admin", "objective_test"),
  event("Sports and Entertainment Management", "Marketing", "objective_test"),
  event("Supply Chain Management", "Business Admin", "objective_test"),
  event("Interview Skills", "Career Dev", "role_play", {
    defaultTimeLimitMinutes: 15,
    topicAreas: ["Interview prep", "Professionalism", "Behavioral responses"],
  }),
  event("Job Interview", "Career Dev", "role_play", {
    defaultTimeLimitMinutes: 15,
  }),
  event("Parliamentary Procedure", "Career Dev", "team", {
    teamEvent: true,
    defaultTimeLimitMinutes: 20,
    topicAreas: ["Motions", "Procedure flow", "Debate protocol"],
  }),
  event("Broadcasting and Digital Media Production", "Communication", "team", {
    teamEvent: true,
    defaultTimeLimitMinutes: 15,
  }),
  event("Client Service", "Communication", "role_play", {
    defaultTimeLimitMinutes: 15,
    topicAreas: ["Customer scenarios", "Service recovery", "Professional communication"],
  }),
  event("Digital Animation", "Technology", "project", {
    defaultTimeLimitMinutes: 10,
    topicAreas: ["Storyboarding", "Animation principles", "Post production"],
  }),
  event("Digital Video Production", "Communication", "project", {
    defaultTimeLimitMinutes: 10,
  }),
  event("Electronic Career Portfolio", "Career Dev", "portfolio", {
    defaultTimeLimitMinutes: 10,
    topicAreas: ["Personal branding", "Artifacts", "Professional readiness"],
  }),
  event("Graphic Design", "Communication", "project"),
  event("Introduction to Public Speaking", "Communication", "presentation", {
    defaultTimeLimitMinutes: 4,
  }),
  event("Public Speaking", "Communication", "presentation", {
    defaultTimeLimitMinutes: 7,
  }),
  event("Sales Presentation", "Marketing", "presentation", {
    defaultTimeLimitMinutes: 7,
    topicAreas: ["Needs discovery", "Value proposition", "Closing techniques"],
  }),
  event("Social Media Strategies", "Marketing", "presentation", {
    defaultTimeLimitMinutes: 7,
  }),
  event("Computer Applications", "Technology", "objective_test"),
  event("Computer Game and Simulation Programming", "Technology", "project", {
    defaultTimeLimitMinutes: 10,
  }),
  event("Coding and Programming", "Technology", "project", {
    defaultTimeLimitMinutes: 10,
  }),
  event("Cybersecurity", "Technology", "objective_test"),
  event("Data Analysis", "Technology", "objective_test"),
  event("Database Design and Applications", "Technology", "project", {
    defaultTimeLimitMinutes: 10,
  }),
  event("Desktop Application Programming", "Technology", "project", {
    defaultTimeLimitMinutes: 10,
  }),
  event("Introduction to Information Technology", "Technology", "objective_test"),
  event("Mobile Application Development", "Technology", "project", {
    defaultTimeLimitMinutes: 10,
  }),
  event("Web Site Design", "Technology", "project", {
    defaultTimeLimitMinutes: 10,
  }),
  event("Word Processing", "Technology", "objective_test"),
  event("Business Plan", "Entrepreneurship", "report", {
    defaultTimeLimitMinutes: 15,
    topicAreas: ["Business model", "Financial plan", "Execution strategy"],
  }),
  event("E-business", "Entrepreneurship", "report", {
    defaultTimeLimitMinutes: 15,
  }),
  event("Entrepreneurship", "Entrepreneurship", "presentation", {
    defaultTimeLimitMinutes: 7,
  }),
  event("Introduction to Entrepreneurship", "Entrepreneurship", "objective_test"),
  event("Hotel and Lodging Management", "Hospitality", "objective_test"),
  event("Restaurant and Food Service Management", "Hospitality", "objective_test"),
  event("Tourism and Travel Management", "Hospitality", "objective_test"),
  event("Advertising", "Marketing", "objective_test"),
  event("Fashion Merchandising", "Marketing", "objective_test"),
  event("Food Marketing", "Marketing", "objective_test"),
  event("Marketing", "Marketing", "objective_test"),
  event("Retail Management", "Marketing", "objective_test"),
  event("Sports and Entertainment Marketing", "Marketing", "objective_test"),
  event("Introduction to Business Concepts", "Business Admin", "objective_test"),
  event("Introduction to Business Presentation", "Communication", "presentation", {
    defaultTimeLimitMinutes: 4,
  }),
  event("Introduction to Parliamentary Procedure", "Career Dev", "objective_test"),
  event("Introduction to Social Media Strategy", "Marketing", "objective_test"),
  event("Financial Consulting", "Finance", "presentation", {
    defaultTimeLimitMinutes: 7,
    topicAreas: ["Client discovery", "Financial planning", "Recommendation delivery"],
  }),
  event("Community Service Project", "Business Admin", "project", {
    defaultTimeLimitMinutes: 10,
  }),
  event("Public Service Announcement", "Business Admin", "presentation", {
    defaultTimeLimitMinutes: 4,
  }),
  event("Virtual Business Management", "Business Admin", "project", {
    defaultTimeLimitMinutes: 10,
  }),
  event("Career Exploration Insights", "Career Dev", "project"),
  event("Future Business Educator", "Career Dev", "presentation", {
    defaultTimeLimitMinutes: 7,
  }),
  event("Future Business Leader", "Career Dev", "presentation", {
    defaultTimeLimitMinutes: 7,
  }),
  event("FBLA Principles and Procedures", "Career Dev", "objective_test"),
  event("Who's Who in FBLA", "Career Dev", "project"),
  event("Introduction to Artificial Intelligence", "Technology", "objective_test", {
    topicAreas: ["AI fundamentals", "Ethics", "Applied business AI use cases"],
  }),
  event("Start-Up Business Plan", "Entrepreneurship", "report", {
    defaultTimeLimitMinutes: 15,
  }),
  event("Hospitality and Event Management", "Hospitality", "objective_test"),
  event("Travel and Tourism", "Hospitality", "objective_test"),
  event("FBLA Competitive Events", "Career Dev", "objective_test"),
  event("Help Desk", "Technology", "role_play", {
    defaultTimeLimitMinutes: 15,
    topicAreas: ["Technical troubleshooting", "Customer communication", "Issue documentation"],
  }),
  event("FBLA Business Achievement Awards - Bronze", "Career Dev", "project", {
    conferenceLevels: ["DLC", "SLC", "NLC"],
    defaultTimeLimitMinutes: 20,
    topicAreas: ["Leadership development", "Career preparation", "FBLA engagement"],
  }),
  event("FBLA Business Achievement Awards - Silver", "Career Dev", "project", {
    conferenceLevels: ["DLC", "SLC", "NLC"],
    defaultTimeLimitMinutes: 20,
  }),
  event("FBLA Business Achievement Awards - Gold", "Career Dev", "project", {
    conferenceLevels: ["DLC", "SLC", "NLC"],
    defaultTimeLimitMinutes: 20,
  }),
  event("FBLA Business Achievement Awards - Americanism", "Career Dev", "project", {
    conferenceLevels: ["DLC", "SLC", "NLC"],
    defaultTimeLimitMinutes: 20,
  }),
];

export const CONFERENCE_LEVELS: ConferenceLevel[] = ["DLC", "SLC", "NLC"];

export const FBLA_COMPETITIVE_EVENTS = FBLA_EVENT_DEFINITIONS.map((event) => event.name) as string[];

export const FBLA_EVENT_CATEGORY_FILTERS: Array<"All" | PracticeEventCategory> = [
  "All",
  "Business Admin",
  "Finance",
  "Technology",
  "Marketing",
  "Communication",
  "Entrepreneurship",
  "Hospitality",
  "Career Dev",
];

export const FBLA_EVENT_BY_ID = new Map(FBLA_EVENT_DEFINITIONS.map((event) => [event.id, event]));

export function getFblaEventById(eventId: string): FblaEventDefinition | null {
  return FBLA_EVENT_BY_ID.get(eventId) ?? null;
}

export function getFblaEventByName(name: string): FblaEventDefinition | null {
  const lowered = name.trim().toLowerCase();
  return (
    FBLA_EVENT_DEFINITIONS.find((event) => event.name.toLowerCase() === lowered) ?? null
  );
}

