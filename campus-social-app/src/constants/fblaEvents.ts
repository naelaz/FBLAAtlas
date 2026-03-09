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

export type PracticeEventFormatCategory =
  | "objective_test_only"
  | "role_play"
  | "presentation"
  | "speech"
  | "mixed"
  | "job_interview";

export type PracticeHubMode = "objective_test" | "presentation" | "flashcards" | "mock_judge";

export type PracticePhaseKey = "prep" | "setup" | "present" | "qa" | "speak" | "interview";

export type PracticePhaseTiming = {
  key: PracticePhaseKey;
  label: string;
  durationSeconds: number;
  untimed?: boolean;
  minuteWarning?: boolean;
};

export type ObjectiveTestConfig = {
  questionCount: number;
  timeLimitMinutes: number;
};

export type PresentationFlowConfig = {
  phases: PracticePhaseTiming[];
  coachingTitle: string;
  coachingBullets: string[];
};

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
  practiceCategory: PracticeEventFormatCategory;
  allowedPracticeModes: PracticeHubMode[];
  objectiveTest?: ObjectiveTestConfig;
  presentationFlow?: PresentationFlowConfig;
};

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function phase(
  key: PracticePhaseKey,
  label: string,
  minutes: number,
  options?: { untimed?: boolean; minuteWarning?: boolean },
): PracticePhaseTiming {
  return {
    key,
    label,
    durationSeconds: Math.max(0, Math.round(minutes * 60)),
    untimed: Boolean(options?.untimed),
    minuteWarning: Boolean(options?.minuteWarning),
  };
}

function totalTimedMinutes(phases: PracticePhaseTiming[]): number {
  const seconds = phases.reduce((sum, item) => {
    if (item.untimed) {
      return sum;
    }
    return sum + item.durationSeconds;
  }, 0);
  return Math.max(1, Math.round(seconds / 60));
}

const ROLE_PLAY_COACHING = [
  "Read the scenario carefully - identify the core business problem",
  "You will play the role of a business professional - know your role",
  "Plan your opening (who you are, what you're there to solve)",
  "Outline your key points and proposed solution",
  "Anticipate what the judge (playing a client/manager) will push back on",
  "You have notecards - use them for key numbers and facts only",
  "When time is up you will walk in and begin immediately",
];

const PRESENTATION_SETUP_COACHING = [
  "Arrange your materials and devices on the table",
  "Connect to any tech you need - have a backup plan if internet fails",
  "Do NOT speak to judges during setup",
  "Get your opening sentence ready in your head",
  "When setup time ends your presentation begins automatically",
];

const SPEECH_PHASE_COACHING = [
  "Stand tall, feet shoulder width apart",
  "Speak to the back of the room - project your voice",
  "Eye contact: move your gaze across all judges evenly",
  "Do not read from notes - glance only",
  "Pace yourself - 2 minutes goes faster than you think",
  "Strong opening line, strong closing line - judges remember both",
];

const FUTURE_BUSINESS_LEADER_COACHING = [
  "You just finished your test - now prepare your speech",
  "Review your prepared speech outline in your head",
  "FBL speech topics are announced in advance - you should know your topic",
  "10 minutes to organize your thoughts and mentally rehearse",
  "Strong opening, 2-3 key points, powerful close",
  "No notes allowed during the speech itself",
];

function defaultModes(practiceCategory: PracticeEventFormatCategory): PracticeHubMode[] {
  switch (practiceCategory) {
    case "objective_test_only":
      return ["objective_test", "flashcards"];
    case "role_play":
      return ["presentation", "flashcards", "mock_judge"];
    case "presentation":
      return ["presentation", "flashcards", "mock_judge"];
    case "speech":
      return ["presentation", "flashcards", "mock_judge"];
    case "mixed":
      return ["objective_test", "presentation", "flashcards", "mock_judge"];
    case "job_interview":
      return ["mock_judge", "flashcards"];
    default:
      return ["flashcards"];
  }
}

function event(
  name: string,
  category: PracticeEventCategory,
  eventType: PracticeEventType,
  practiceCategory: PracticeEventFormatCategory,
  options?: Partial<
    Omit<
      FblaEventDefinition,
      "id" | "name" | "category" | "eventType" | "practiceCategory" | "allowedPracticeModes"
    >
  > & {
    allowedPracticeModes?: PracticeHubMode[];
  },
): FblaEventDefinition {
  const objectiveTest = options?.objectiveTest;
  const presentationFlow = options?.presentationFlow;

  const defaultTimeLimitMinutes =
    options?.defaultTimeLimitMinutes ??
    (objectiveTest ? objectiveTest.timeLimitMinutes : undefined) ??
    (presentationFlow ? totalTimedMinutes(presentationFlow.phases) : undefined) ??
    60;

  return {
    id: slugify(name),
    name,
    category,
    eventType,
    teamEvent: Boolean(options?.teamEvent),
    defaultTimeLimitMinutes,
    description:
      options?.description ??
      `${name} practice aligned to official FBLA 2025-2026 timing guidance and rubric expectations.`,
    topicAreas: options?.topicAreas ?? ["Core concepts", "Applied scenarios", "FBLA standards"],
    judgingCriteria:
      options?.judgingCriteria ?? ["Content accuracy", "Professionalism", "Execution quality"],
    materialsAllowed:
      options?.materialsAllowed ?? ["Notecards (if allowed)", "Presentation materials", "Official rubric"],
    conferenceLevels: options?.conferenceLevels ?? ["DLC", "SLC", "NLC"],
    practiceCategory,
    allowedPracticeModes: options?.allowedPracticeModes ?? defaultModes(practiceCategory),
    objectiveTest,
    presentationFlow,
  };
}

function objectiveEvent(name: string, category: PracticeEventCategory): FblaEventDefinition {
  return event(name, category, "objective_test", "objective_test_only", {
    objectiveTest: {
      questionCount: 100,
      timeLimitMinutes: 50,
    },
    defaultTimeLimitMinutes: 50,
    description: `${name} is a 100-question objective test with a fixed 50-minute official competition timer.`,
  });
}

function rolePlayEvent(
  name: string,
  category: PracticeEventCategory,
  prepMinutes: number,
  presentMinutes: number,
  qaMinutes: number,
  options?: { teamEvent?: boolean; noQa?: boolean },
): FblaEventDefinition {
  const phases: PracticePhaseTiming[] = [
    phase("prep", "Prep", prepMinutes),
    phase("present", "Present", presentMinutes, { minuteWarning: true }),
  ];

  if (!options?.noQa && qaMinutes > 0) {
    phases.push(phase("qa", "Q&A", qaMinutes, { minuteWarning: true }));
  }

  return event(name, category, options?.teamEvent ? "team" : "role_play", "role_play", {
    teamEvent: Boolean(options?.teamEvent),
    presentationFlow: {
      phases,
      coachingTitle: "What to do right now",
      coachingBullets: ROLE_PLAY_COACHING,
    },
    description: `${name} uses a role-play format with timed prep and live judge interaction phases.`,
  });
}

function presentationEvent(
  name: string,
  category: PracticeEventCategory,
  setupMinutes: number,
  presentMinutes: number,
  qaMinutes: number,
  options?: { noQa?: boolean },
): FblaEventDefinition {
  const phases: PracticePhaseTiming[] = [
    phase("setup", "Setup", setupMinutes),
    phase("present", "Present", presentMinutes, { minuteWarning: true }),
  ];

  if (!options?.noQa && qaMinutes > 0) {
    phases.push(phase("qa", "Q&A", qaMinutes, { minuteWarning: true }));
  }

  return event(name, category, "presentation", "presentation", {
    presentationFlow: {
      phases,
      coachingTitle: `Setup phase - ${setupMinutes} minute${setupMinutes === 1 ? "" : "s"}`,
      coachingBullets: PRESENTATION_SETUP_COACHING,
    },
    description: `${name} uses a prejudged/presentation format with setup, presentation, and judge questions as listed in official timing guidance.`,
  });
}

function speechEvent(
  name: string,
  category: PracticeEventCategory,
  prepMinutes: number,
  speakMinutes: number,
  options?: { noQa?: boolean },
): FblaEventDefinition {
  const phases: PracticePhaseTiming[] = [
    phase("prep", "Prep", prepMinutes),
    phase("speak", "Speak", speakMinutes, { minuteWarning: true }),
  ];

  return event(name, category, "presentation", "speech", {
    presentationFlow: {
      phases,
      coachingTitle: "Speech phase coaching",
      coachingBullets: SPEECH_PHASE_COACHING,
    },
    description: options?.noQa
      ? `${name} is a speech format with prep and speaking phases and no Q&A.`
      : `${name} is a speech format with prep and speaking phases, with Q&A included in the speaking segment.`,
  });
}

const FBLA_EVENT_DEFINITIONS_RAW: FblaEventDefinition[] = [
  // CATEGORY 1 - OBJECTIVE TEST ONLY (100 questions / 50 minutes)
  objectiveEvent("Accounting", "Finance"),
  objectiveEvent("Advanced Accounting", "Finance"),
  objectiveEvent("Advertising", "Marketing"),
  objectiveEvent("Agribusiness", "Business Admin"),
  objectiveEvent("Business Communication", "Communication"),
  objectiveEvent("Business Law", "Business Admin"),
  objectiveEvent("Computer Problem Solving", "Technology"),
  objectiveEvent("Cybersecurity", "Technology"),
  objectiveEvent("Data Science & AI", "Technology"),
  objectiveEvent("Economics", "Finance"),
  objectiveEvent("Healthcare Administration", "Business Admin"),
  objectiveEvent("Human Resource Management", "Business Admin"),
  objectiveEvent("Insurance & Risk Management", "Finance"),
  objectiveEvent("Introduction to Business Communication", "Communication"),
  objectiveEvent("Introduction to Business Concepts", "Business Admin"),
  objectiveEvent("Introduction to Business Procedures", "Business Admin"),
  objectiveEvent("Introduction to FBLA", "Career Dev"),
  objectiveEvent("Introduction to Information Technology", "Technology"),
  objectiveEvent("Introduction to Marketing Concepts", "Marketing"),
  objectiveEvent("Introduction to Parliamentary Procedure", "Career Dev"),
  objectiveEvent("Introduction to Retail & Merchandising", "Marketing"),
  objectiveEvent("Introduction to Supply Chain Management", "Business Admin"),
  objectiveEvent("Journalism", "Communication"),
  objectiveEvent("Networking Infrastructures", "Technology"),
  objectiveEvent("Organizational Leadership", "Career Dev"),
  objectiveEvent("Parliamentary Procedure Individual", "Career Dev"),
  objectiveEvent("Personal Finance", "Finance"),
  objectiveEvent("Project Management", "Business Admin"),
  objectiveEvent("Public Administration & Management", "Business Admin"),
  objectiveEvent("Real Estate", "Finance"),
  objectiveEvent("Retail Management", "Marketing"),
  objectiveEvent("Securities & Investments", "Finance"),

  // CATEGORY 2 - ROLE PLAY EVENTS
  rolePlayEvent("Banking & Financial Systems", "Finance", 20, 7, 1),
  rolePlayEvent("Business Management", "Business Admin", 20, 7, 1),
  rolePlayEvent("Customer Service", "Communication", 20, 7, 1),
  rolePlayEvent("Entrepreneurship", "Entrepreneurship", 20, 7, 1),
  rolePlayEvent("Hospitality & Event Management", "Hospitality", 20, 7, 1),
  rolePlayEvent("International Business", "Business Admin", 20, 7, 1),
  rolePlayEvent("Marketing", "Marketing", 20, 7, 1),
  rolePlayEvent("Network Design", "Technology", 20, 7, 1),
  rolePlayEvent("Sports & Entertainment Management", "Marketing", 20, 7, 1),
  rolePlayEvent("Technology Support & Services", "Technology", 20, 7, 1),
  rolePlayEvent("Parliamentary Procedure Team", "Career Dev", 20, 11, 1, { teamEvent: true }),
  rolePlayEvent("Impromptu Speaking", "Communication", 20, 7, 0, { noQa: true }),
  rolePlayEvent("Introduction to Decision Making", "Business Admin", 10, 5, 3),

  // CATEGORY 3 - PRESENTATION EVENTS
  presentationEvent("Broadcast Journalism", "Communication", 3, 7, 3),
  presentationEvent("Business Plan", "Entrepreneurship", 3, 7, 3),
  presentationEvent("Career Portfolio", "Career Dev", 3, 7, 3),
  presentationEvent("Coding & Programming", "Technology", 3, 7, 3),
  presentationEvent("Community Service Project", "Business Admin", 3, 7, 3),
  presentationEvent("Computer Game & Simulation", "Technology", 3, 7, 3),
  presentationEvent("Data Analysis", "Technology", 3, 7, 3),
  presentationEvent("Digital Animation", "Technology", 3, 7, 3),
  presentationEvent("Digital Video Production", "Communication", 3, 7, 3),
  presentationEvent("Event Planning", "Hospitality", 3, 7, 3),
  presentationEvent("Financial Planning", "Finance", 3, 7, 3),
  presentationEvent("Graphic Design", "Communication", 3, 7, 3),
  presentationEvent("Intro to Business Presentation", "Communication", 3, 7, 3),
  presentationEvent("Intro to Emerging Business Issues", "Business Admin", 5, 7, 3),
  presentationEvent("Intro to Programming", "Technology", 3, 7, 3),
  presentationEvent("Intro to Social Media Strategy", "Marketing", 3, 7, 3),
  presentationEvent("Local Chapter Annual Business", "Career Dev", 3, 7, 3),
  presentationEvent("Mobile Application Development", "Technology", 3, 7, 3),
  presentationEvent("Public Service Announcement", "Communication", 3, 7, 3),
  presentationEvent("Sales Presentation", "Marketing", 3, 7, 0, { noQa: true }),
  presentationEvent("Social Media Strategies", "Marketing", 3, 7, 3),
  presentationEvent("Supply Chain Management", "Business Admin", 3, 7, 3),
  presentationEvent("Visual Design", "Communication", 3, 7, 3),
  presentationEvent("Website Coding & Development", "Technology", 3, 7, 3),
  presentationEvent("Website Design", "Technology", 3, 7, 3),

  // CATEGORY 4 - SPEECH EVENTS
  speechEvent("Introduction to Public Speaking", "Communication", 5, 2),
  speechEvent("Public Speaking", "Communication", 5, 2),
  speechEvent("Intro to FBLA Creed Speaking", "Career Dev", 0.5, 5, { noQa: true }),

  // CATEGORY 5 - MIXED EVENTS
  event("Business Ethics", "Business Admin", "objective_test", "mixed", {
    objectiveTest: {
      questionCount: 100,
      timeLimitMinutes: 50,
    },
    presentationFlow: {
      phases: [
        phase("setup", "Setup", 3),
        phase("present", "Present", 7, { minuteWarning: true }),
        phase("qa", "Q&A", 3, { minuteWarning: true }),
      ],
      coachingTitle: "Setup phase - 3 minutes",
      coachingBullets: PRESENTATION_SETUP_COACHING,
    },
    description:
      "Business Ethics uses a mixed format: objective test first, then setup/presentation/Q&A.",
  }),
  event("Future Business Educator", "Career Dev", "presentation", "mixed", {
    allowedPracticeModes: ["presentation", "flashcards", "mock_judge"],
    presentationFlow: {
      phases: [
        phase("setup", "Setup", 3),
        phase("present", "Present", 7, { minuteWarning: true }),
        phase("qa", "Q&A", 3, { minuteWarning: true }),
      ],
      coachingTitle: "Setup phase - 3 minutes",
      coachingBullets: PRESENTATION_SETUP_COACHING,
    },
    description:
      "Future Business Educator uses setup/presentation/Q&A timing with no separate objective test phase.",
  }),
  event("Future Business Leader", "Career Dev", "presentation", "mixed", {
    objectiveTest: {
      questionCount: 100,
      timeLimitMinutes: 50,
    },
    presentationFlow: {
      phases: [
        phase("prep", "Prep", 10),
        phase("speak", "Speech", 0, { untimed: true }),
      ],
      coachingTitle: "Future Business Leader prep phase",
      coachingBullets: FUTURE_BUSINESS_LEADER_COACHING,
    },
    description:
      "Future Business Leader uses objective testing first, then a 10-minute prep phase before a speech with no Q&A.",
  }),

  // CATEGORY 6 - JOB INTERVIEW
  event("Job Interview", "Career Dev", "role_play", "job_interview", {
    allowedPracticeModes: ["mock_judge", "flashcards"],
    presentationFlow: {
      phases: [
        phase("prep", "Prep", 10),
        phase("interview", "Interview", 0, { untimed: true }),
      ],
      coachingTitle: "Job Interview format",
      coachingBullets: [
        "Review the posted position and match your examples to the role",
        "Prepare concise STAR responses for leadership, teamwork, and problem solving",
        "Keep examples FBLA-relevant and business-focused",
        "Interview length is judge-managed and does not have a fixed timer",
      ],
    },
    description:
      "Job Interview has a 10-minute prep phase followed by an interview format with no fixed presentation timer.",
  }),
];

export const FBLA_EVENT_DEFINITIONS: FblaEventDefinition[] = FBLA_EVENT_DEFINITIONS_RAW;

export const CONFERENCE_LEVELS: ConferenceLevel[] = ["DLC", "SLC", "NLC"];

export const FBLA_COMPETITIVE_EVENTS = FBLA_EVENT_DEFINITIONS.map((entry) => entry.name) as string[];

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

export const FBLA_EVENT_BY_ID = new Map(FBLA_EVENT_DEFINITIONS.map((entry) => [entry.id, entry]));

export function getFblaEventById(eventId: string): FblaEventDefinition | null {
  return FBLA_EVENT_BY_ID.get(eventId) ?? null;
}

export function getFblaEventByName(name: string): FblaEventDefinition | null {
  const lowered = name.trim().toLowerCase();
  return FBLA_EVENT_DEFINITIONS.find((entry) => entry.name.toLowerCase() === lowered) ?? null;
}

