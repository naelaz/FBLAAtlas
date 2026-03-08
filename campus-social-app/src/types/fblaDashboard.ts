export type ConferenceLevel = "DLC" | "SLC" | "NLC";

export type WidgetSize = "half" | "full" | "tall";

export type WidgetCategory =
  | "NLC"
  | "SLC"
  | "DLC"
  | "Competition Prep"
  | "Chapter"
  | "Personal"
  | "Social"
  | "Finn";

export type FblaWidgetType =
  | "nlc_countdown"
  | "nlc_agenda"
  | "nlc_event_registration_tracker"
  | "nlc_roommate_team_info"
  | "nlc_city_info"
  | "nlc_packing_checklist"
  | "slc_countdown"
  | "slc_agenda"
  | "slc_event_tracker"
  | "slc_results_board"
  | "slc_prep_checklist"
  | "dlc_countdown"
  | "dlc_agenda"
  | "dlc_event_tracker"
  | "dlc_results"
  | "dlc_prep_checklist"
  | "event_prep_tracker"
  | "practice_log"
  | "presentation_timer"
  | "judging_rubric_quick_view"
  | "co_presenter_sync"
  | "speech_notes"
  | "chapter_meeting_countdown"
  | "officer_directory"
  | "chapter_goals_tracker"
  | "member_spotlight"
  | "chapter_announcements"
  | "my_competitive_events"
  | "my_fbla_goals"
  | "qualifier_status"
  | "awards_cabinet"
  | "my_fbla_story"
  | "networking_log"
  | "chapter_leaderboard_snapshot"
  | "whos_prepping_now"
  | "hype_feed"
  | "conference_buddy_finder"
  | "finn_quick_ask"
  | "finn_daily_tip";

export type ChecklistItem = {
  id: string;
  label: string;
  done: boolean;
};

export type AgendaItem = {
  id: string;
  eventName: string;
  day: string;
  time: string;
  location: string;
  notes?: string;
};

export type ResultItem = {
  id: string;
  eventName: string;
  placement: number;
};

export type CompetitiveEventEntry = {
  id: string;
  eventName: string;
  level: ConferenceLevel;
};

export type ConferenceScheduleEntry = {
  id: string;
  level: ConferenceLevel;
  eventName: string;
  day: string;
  time: string;
  location: string;
  notes: string;
  teammateNames: string[];
};

export type DashboardWidget = {
  id: string;
  type: FblaWidgetType;
  category: WidgetCategory;
  title: string;
  size: WidgetSize;
  showTitle: boolean;
  accentColor?: string | null;
  data: Record<string, unknown>;
};

export type DashboardLayout = {
  widgets: DashboardWidget[];
  conferenceDates: Record<ConferenceLevel, string | null>;
  conferenceSchedule: ConferenceScheduleEntry[];
  selectedCompetitiveEvents: string[];
  chapterProfile: {
    chapterName: string;
    chapterState: string;
    officerRole: string;
  };
  updatedAt?: string;
};
