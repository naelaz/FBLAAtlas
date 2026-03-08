import { ThemePalette } from "./themes";
import {
  ConferenceLevel,
  DashboardLayout,
  DashboardWidget,
  FblaWidgetType,
  WidgetCategory,
  WidgetSize,
} from "../types/fblaDashboard";

type WidgetDefinition = {
  type: FblaWidgetType;
  title: string;
  category: WidgetCategory;
  defaultSize: WidgetSize;
  setupPrompt: string;
  defaultData: Record<string, unknown>;
};

function checklist(items: string[]) {
  return items.map((label, index) => ({
    id: `item_${index + 1}`,
    label,
    done: false,
  }));
}

function createDefinition(
  type: FblaWidgetType,
  title: string,
  category: WidgetCategory,
  defaultSize: WidgetSize,
  setupPrompt: string,
  defaultData: Record<string, unknown>,
): WidgetDefinition {
  return { type, title, category, defaultSize, setupPrompt, defaultData };
}

const PACKING_BASE = checklist([
  "Business professional outfit",
  "Name badge",
  "Event materials",
  "Resume copies",
  "Laptop + charger",
  "Notebook and pens",
  "Professional shoes",
  "Portfolio folder",
]);

const SLC_PREP_BASE = checklist([
  "Speech rehearsed",
  "Report submitted",
  "Advisor approval",
  "Registration confirmed",
  "Travel details confirmed",
]);

const DLC_PREP_BASE = checklist([
  "Presentation ready",
  "Team briefed",
  "Materials prepared",
  "Practice run completed",
  "Advisor check-in done",
]);

const EVENT_PREP_BASE = checklist([
  "Understand rubric categories",
  "Draft completed",
  "Practice timing complete",
  "Q&A prep done",
  "Visuals finalized",
]);

const MY_GOALS_BASE = checklist([
  "Qualify for SLC",
  "Qualify for NLC",
  "Complete weekly prep sessions",
  "Attend every chapter meeting",
  "Mentor one new member",
]);

export const FBLA_WIDGET_DEFINITIONS: WidgetDefinition[] = [
  createDefinition("nlc_countdown", "NLC Countdown", "NLC", "full", "Tap to enter your NLC date", { targetDate: "" }),
  createDefinition("nlc_agenda", "NLC Agenda", "NLC", "full", "Tap to add your NLC schedule", { items: [] }),
  createDefinition("nlc_event_registration_tracker", "NLC Registration Tracker", "NLC", "half", "Tap to add registered NLC events", { items: [] }),
  createDefinition("nlc_roommate_team_info", "NLC Roommate / Team", "NLC", "half", "Tap to add roommate and team details", { roommateName: "", roomNumber: "", teamMembers: [] }),
  createDefinition("nlc_city_info", "NLC City Info", "NLC", "half", "Tap to set host city details", { city: "", timezone: "", note: "" }),
  createDefinition("nlc_packing_checklist", "NLC Packing Checklist", "NLC", "full", "Tap to customize your NLC packing list", { items: PACKING_BASE }),

  createDefinition("slc_countdown", "SLC Countdown", "SLC", "full", "Tap to enter your SLC date", { targetDate: "" }),
  createDefinition("slc_agenda", "SLC Agenda", "SLC", "full", "Tap to add your SLC schedule", { items: [] }),
  createDefinition("slc_event_tracker", "SLC Event Tracker", "SLC", "half", "Tap to add your SLC events", { items: [] }),
  createDefinition("slc_results_board", "SLC Results Board", "SLC", "half", "Tap to log your SLC placements", { items: [] }),
  createDefinition("slc_prep_checklist", "SLC Prep Checklist", "SLC", "half", "Tap to customize SLC prep items", { items: SLC_PREP_BASE }),

  createDefinition("dlc_countdown", "DLC Countdown", "DLC", "full", "Tap to enter your DLC date", { targetDate: "" }),
  createDefinition("dlc_agenda", "DLC Agenda", "DLC", "full", "Tap to add your DLC schedule", { items: [] }),
  createDefinition("dlc_event_tracker", "DLC Event Tracker", "DLC", "half", "Tap to add your DLC events", { items: [] }),
  createDefinition("dlc_results", "DLC Results", "DLC", "half", "Tap to log your DLC placements", { items: [] }),
  createDefinition("dlc_prep_checklist", "DLC Prep Checklist", "DLC", "half", "Tap to customize DLC prep items", { items: DLC_PREP_BASE }),

  createDefinition("event_prep_tracker", "Event Prep Tracker", "Competition Prep", "full", "Tap to select your competitive event", {
    selectedEvent: "",
    items: EVENT_PREP_BASE,
  }),
  createDefinition("practice_log", "Practice Log", "Competition Prep", "half", "Tap to log your first practice session", { sessions: [] }),
  createDefinition("presentation_timer", "Presentation Timer", "Competition Prep", "half", "Tap to choose event time limit", { secondsLimit: 420 }),
  createDefinition("judging_rubric_quick_view", "Judging Rubric Quick View", "Competition Prep", "half", "Tap to select an event rubric", { selectedEvent: "" }),
  createDefinition("co_presenter_sync", "Co-Presenter Sync", "Competition Prep", "half", "Tap to add teammate assignments", { members: [] }),
  createDefinition("speech_notes", "Speech Notes", "Competition Prep", "tall", "Tap to add bullet-point notes", { notes: "" }),

  createDefinition("chapter_meeting_countdown", "Chapter Meeting Countdown", "Chapter", "half", "Tap to set next chapter meeting", {
    dayOfWeek: "Wednesday",
    time: "15:30",
  }),
  createDefinition("officer_directory", "Officer Directory", "Chapter", "full", "Tap to add chapter officers", { officers: [] }),
  createDefinition("chapter_goals_tracker", "Chapter Goals Tracker", "Chapter", "half", "Tap to add chapter goals", { items: checklist(["Increase membership", "Host 3 competition workshops", "Reach 100% registration readiness"]) }),
  createDefinition("member_spotlight", "Member Spotlight", "Chapter", "half", "Tap to set this week's spotlight", { name: "", eventName: "", funFact: "" }),
  createDefinition("chapter_announcements", "Chapter Announcements", "Chapter", "full", "Tap to add chapter announcements", { items: [] }),

  createDefinition("my_competitive_events", "My Competitive Events", "Personal", "full", "Tap to add your events", { items: [] }),
  createDefinition("my_fbla_goals", "My FBLA Goals", "Personal", "half", "Tap to set your FBLA goals", { items: MY_GOALS_BASE }),
  createDefinition("qualifier_status", "Qualifier Status", "Personal", "full", "Tap to add qualification status", { items: [] }),
  createDefinition("awards_cabinet", "Awards Cabinet", "Personal", "half", "Tap to add your awards", { items: [] }),
  createDefinition("my_fbla_story", "My FBLA Story", "Personal", "half", "Auto-generated from your profile", {}),
  createDefinition("networking_log", "Networking Log", "Personal", "full", "Tap to log your first FBLA connection", { items: [] }),

  createDefinition("chapter_leaderboard_snapshot", "Leaderboard Snapshot", "Social", "half", "Auto-syncs from chapter leaderboard", {}),
  createDefinition("whos_prepping_now", "Who's Prepping Now", "Social", "half", "Shows active chapter members", {}),
  createDefinition("hype_feed", "Hype Feed", "Social", "full", "FBLA-tagged social posts", {}),
  createDefinition("conference_buddy_finder", "Conference Buddy Finder", "Social", "half", "Tap to find conference buddies", {}),

  createDefinition("finn_quick_ask", "Finn Quick Ask", "Finn", "full", "Ask Finn anything about FBLA prep", { draft: "", answer: "" }),
  createDefinition("finn_daily_tip", "Finn Daily FBLA Tip", "Finn", "half", "Daily AI coaching tip", {}),
];

export const FBLA_WIDGET_CATEGORIES: WidgetCategory[] = [
  "NLC",
  "SLC",
  "DLC",
  "Competition Prep",
  "Chapter",
  "Personal",
  "Social",
  "Finn",
];

export function createWidgetId(type: FblaWidgetType): string {
  return `${type}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function getWidgetDefinition(type: FblaWidgetType): WidgetDefinition {
  return (
    FBLA_WIDGET_DEFINITIONS.find((item) => item.type === type) ??
    FBLA_WIDGET_DEFINITIONS[0]
  );
}

export function createWidget(type: FblaWidgetType, palette?: ThemePalette): DashboardWidget {
  const definition = getWidgetDefinition(type);
  return {
    id: createWidgetId(type),
    type: definition.type,
    category: definition.category,
    title: definition.title,
    size: definition.defaultSize,
    showTitle: true,
    accentColor: palette?.colors.primary ?? null,
    data: definition.defaultData,
  };
}

export const DEFAULT_WIDGET_TYPES: FblaWidgetType[] = [
  "nlc_countdown",
  "my_competitive_events",
  "event_prep_tracker",
  "chapter_meeting_countdown",
  "finn_daily_tip",
  "chapter_announcements",
];

export function createDefaultDashboardLayout(palette?: ThemePalette): DashboardLayout {
  return {
    widgets: DEFAULT_WIDGET_TYPES.map((type) => createWidget(type, palette)),
    conferenceDates: {
      DLC: null,
      SLC: null,
      NLC: null,
    },
    conferenceSchedule: [],
    selectedCompetitiveEvents: [],
    chapterProfile: {
      chapterName: "",
      chapterState: "",
      officerRole: "",
    },
  };
}

export function conferenceFromWidgetType(type: FblaWidgetType): ConferenceLevel | null {
  if (type.startsWith("nlc_")) {
    return "NLC";
  }
  if (type.startsWith("slc_")) {
    return "SLC";
  }
  if (type.startsWith("dlc_")) {
    return "DLC";
  }
  return null;
}
