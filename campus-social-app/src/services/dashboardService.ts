import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  Unsubscribe,
} from "firebase/firestore";

import { createDefaultDashboardLayout } from "../constants/fblaWidgets";
import { db } from "../config/firebase";
import {
  ConferenceLevel,
  ConferenceScheduleEntry,
  DashboardLayout,
  DashboardWidget,
  FblaWidgetType,
  WidgetCategory,
  WidgetSize,
} from "../types/fblaDashboard";
import { toIso } from "./firestoreUtils";

function cacheKey(uid: string): string {
  return `fbla_atlas_dashboard_${uid}_v1`;
}

function docRef(uid: string) {
  return doc(db, "users", uid, "dashboard", "fbla");
}

function coerceSize(value: unknown): WidgetSize {
  if (value === "full" || value === "tall") {
    return value;
  }
  return "half";
}

function coerceCategory(value: unknown): WidgetCategory {
  const valid: WidgetCategory[] = [
    "NLC",
    "SLC",
    "DLC",
    "Competition Prep",
    "Chapter",
    "Personal",
    "Social",
    "Finn",
  ];
  return valid.includes(value as WidgetCategory) ? (value as WidgetCategory) : "Personal";
}

function parseConferenceLevel(value: unknown): ConferenceLevel {
  if (value === "NLC" || value === "SLC") {
    return value;
  }
  return "DLC";
}

function parseWidget(raw: Record<string, unknown>, index: number): DashboardWidget {
  return {
    id: typeof raw.id === "string" ? raw.id : `widget_${index}`,
    type: typeof raw.type === "string" ? (raw.type as FblaWidgetType) : "my_fbla_story",
    category: coerceCategory(raw.category),
    title: typeof raw.title === "string" ? raw.title : "FBLA Widget",
    size: coerceSize(raw.size),
    showTitle: typeof raw.showTitle === "boolean" ? raw.showTitle : true,
    accentColor: typeof raw.accentColor === "string" ? raw.accentColor : null,
    data: typeof raw.data === "object" && raw.data !== null ? (raw.data as Record<string, unknown>) : {},
  };
}

function parseScheduleEntry(raw: Record<string, unknown>, index: number): ConferenceScheduleEntry {
  return {
    id: typeof raw.id === "string" ? raw.id : `schedule_${index}`,
    level: parseConferenceLevel(raw.level),
    eventName: typeof raw.eventName === "string" ? raw.eventName : "",
    day: typeof raw.day === "string" ? raw.day : "",
    time: typeof raw.time === "string" ? raw.time : "",
    location: typeof raw.location === "string" ? raw.location : "",
    notes: typeof raw.notes === "string" ? raw.notes : "",
    teammateNames: Array.isArray(raw.teammateNames)
      ? raw.teammateNames.filter((value): value is string => typeof value === "string")
      : [],
  };
}

export function parseDashboardLayout(raw: Record<string, unknown>): DashboardLayout {
  const base = createDefaultDashboardLayout();
  const conferenceDatesRaw =
    typeof raw.conferenceDates === "object" && raw.conferenceDates !== null
      ? (raw.conferenceDates as Record<string, unknown>)
      : {};
  const chapterRaw =
    typeof raw.chapterProfile === "object" && raw.chapterProfile !== null
      ? (raw.chapterProfile as Record<string, unknown>)
      : {};

  return {
    widgets: Array.isArray(raw.widgets)
      ? raw.widgets
          .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
          .map(parseWidget)
      : base.widgets,
    conferenceDates: {
      DLC: typeof conferenceDatesRaw.DLC === "string" ? conferenceDatesRaw.DLC : null,
      SLC: typeof conferenceDatesRaw.SLC === "string" ? conferenceDatesRaw.SLC : null,
      NLC: typeof conferenceDatesRaw.NLC === "string" ? conferenceDatesRaw.NLC : null,
    },
    conferenceSchedule: Array.isArray(raw.conferenceSchedule)
      ? raw.conferenceSchedule
          .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
          .map(parseScheduleEntry)
      : [],
    selectedCompetitiveEvents: Array.isArray(raw.selectedCompetitiveEvents)
      ? raw.selectedCompetitiveEvents.filter((item): item is string => typeof item === "string")
      : [],
    chapterProfile: {
      chapterName: typeof chapterRaw.chapterName === "string" ? chapterRaw.chapterName : "",
      chapterState: typeof chapterRaw.chapterState === "string" ? chapterRaw.chapterState : "",
      officerRole: typeof chapterRaw.officerRole === "string" ? chapterRaw.officerRole : "",
    },
    updatedAt: toIso(raw.updatedAt),
  };
}

export async function getCachedDashboard(uid: string): Promise<DashboardLayout | null> {
  try {
    const raw = await AsyncStorage.getItem(cacheKey(uid));
    if (!raw) {
      return null;
    }
    return parseDashboardLayout(JSON.parse(raw) as Record<string, unknown>);
  } catch (error) {
    console.warn("Read cached dashboard failed:", error);
    return null;
  }
}

export async function cacheDashboard(uid: string, layout: DashboardLayout): Promise<void> {
  try {
    await AsyncStorage.setItem(cacheKey(uid), JSON.stringify(layout));
  } catch (error) {
    console.warn("Cache dashboard failed:", error);
  }
}

export async function fetchDashboardOnce(uid: string): Promise<DashboardLayout> {
  const snap = await getDoc(docRef(uid));
  if (!snap.exists()) {
    const defaults = createDefaultDashboardLayout();
    await saveDashboard(uid, defaults);
    return defaults;
  }
  return parseDashboardLayout(snap.data() as Record<string, unknown>);
}

export function subscribeDashboard(
  uid: string,
  onChange: (layout: DashboardLayout) => void,
  onError?: (error: unknown) => void,
): Unsubscribe {
  return onSnapshot(
    docRef(uid),
    (snap) => {
      if (!snap.exists()) {
        onChange(createDefaultDashboardLayout());
        return;
      }
      onChange(parseDashboardLayout(snap.data() as Record<string, unknown>));
    },
    (error) => {
      if (onError) {
        onError(error);
      } else {
        console.warn("Dashboard subscription failed:", error);
      }
    },
  );
}

export async function saveDashboard(uid: string, layout: DashboardLayout): Promise<void> {
  await setDoc(
    docRef(uid),
    {
      ...layout,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  await cacheDashboard(uid, layout);
}
