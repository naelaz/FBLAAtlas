import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

import { createDefaultDashboardLayout, createWidget } from "../constants/fblaWidgets";
import { useAuthContext } from "./AuthContext";
import { useThemeContext } from "./ThemeContext";
import {
  ConferenceLevel,
  ConferenceScheduleEntry,
  DashboardLayout,
  DashboardWidget,
  FblaWidgetType,
  WidgetSize,
} from "../types/fblaDashboard";
import {
  cacheDashboard,
  fetchDashboardOnce,
  getCachedDashboard,
  saveDashboard,
  subscribeDashboard,
} from "../services/dashboardService";

type DashboardContextValue = {
  ready: boolean;
  editMode: boolean;
  layout: DashboardLayout;
  widgets: DashboardWidget[];
  setEditMode: (value: boolean) => void;
  addWidget: (type: FblaWidgetType) => Promise<void>;
  removeWidget: (widgetId: string) => Promise<void>;
  updateWidget: (widgetId: string, updater: (widget: DashboardWidget) => DashboardWidget) => Promise<void>;
  reorderWidgets: (widgetIdsInOrder: string[]) => Promise<void>;
  resetLayout: () => Promise<void>;
  setConferenceDate: (level: ConferenceLevel, dateIso: string) => Promise<void>;
  setSelectedCompetitiveEvents: (eventNames: string[]) => Promise<void>;
  upsertConferenceEntry: (entry: ConferenceScheduleEntry) => Promise<void>;
  deleteConferenceEntry: (entryId: string) => Promise<void>;
  updateChapterProfile: (payload: Partial<DashboardLayout["chapterProfile"]>) => Promise<void>;
};

const DashboardContext = createContext<DashboardContextValue | undefined>(undefined);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const { uid } = useAuthContext();
  const { palette } = useThemeContext();
  const [ready, setReady] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [layout, setLayout] = useState<DashboardLayout>(createDefaultDashboardLayout(palette));

  const commit = async (next: DashboardLayout): Promise<void> => {
    if (!uid) {
      setLayout(next);
      return;
    }
    setLayout(next);
    await cacheDashboard(uid, next);
    await saveDashboard(uid, next);
  };

  useEffect(() => {
    if (!uid) {
      setLayout(createDefaultDashboardLayout(palette));
      setReady(true);
      return;
    }

    let mounted = true;
    const defaults = createDefaultDashboardLayout(palette);

    const bootstrap = async () => {
      try {
        const cached = await getCachedDashboard(uid);
        if (cached && mounted) {
          setLayout(cached);
        } else if (mounted) {
          setLayout(defaults);
        }
      } catch (error) {
        console.warn("Dashboard cache bootstrap failed:", error);
      } finally {
        if (mounted) {
          setReady(true);
        }
      }

      try {
        const server = await fetchDashboardOnce(uid);
        if (mounted) {
          setLayout(server);
          await cacheDashboard(uid, server);
        }
      } catch (error) {
        console.warn("Dashboard server bootstrap failed:", error);
      }
    };

    void bootstrap();

    const unsubscribe = subscribeDashboard(
      uid,
      (next) => {
        setLayout(next);
        void cacheDashboard(uid, next);
      },
      (error) => {
        console.warn("Dashboard subscription failed:", error);
      },
    );

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [uid, palette]);

  const addWidget = async (type: FblaWidgetType) => {
    const nextWidget = createWidget(type, palette);
    await commit({
      ...layout,
      widgets: [nextWidget, ...layout.widgets],
    });
  };

  const removeWidget = async (widgetId: string) => {
    await commit({
      ...layout,
      widgets: layout.widgets.filter((widget) => widget.id !== widgetId),
    });
  };

  const updateWidget = async (widgetId: string, updater: (widget: DashboardWidget) => DashboardWidget) => {
    await commit({
      ...layout,
      widgets: layout.widgets.map((widget) => (widget.id === widgetId ? updater(widget) : widget)),
    });
  };

  const reorderWidgets = async (widgetIdsInOrder: string[]) => {
    const lookup = new Map(layout.widgets.map((widget) => [widget.id, widget]));
    const ordered = widgetIdsInOrder
      .map((id) => lookup.get(id))
      .filter((widget): widget is DashboardWidget => Boolean(widget));
    await commit({
      ...layout,
      widgets: ordered,
    });
  };

  const resetLayout = async () => {
    await commit(createDefaultDashboardLayout(palette));
  };

  const setConferenceDate = async (level: ConferenceLevel, dateIso: string) => {
    await commit({
      ...layout,
      conferenceDates: {
        ...layout.conferenceDates,
        [level]: dateIso,
      },
    });
  };

  const setSelectedCompetitiveEvents = async (eventNames: string[]) => {
    await commit({
      ...layout,
      selectedCompetitiveEvents: eventNames,
    });
  };

  const upsertConferenceEntry = async (entry: ConferenceScheduleEntry) => {
    const exists = layout.conferenceSchedule.some((item) => item.id === entry.id);
    await commit({
      ...layout,
      conferenceSchedule: exists
        ? layout.conferenceSchedule.map((item) => (item.id === entry.id ? entry : item))
        : [entry, ...layout.conferenceSchedule],
    });
  };

  const deleteConferenceEntry = async (entryId: string) => {
    await commit({
      ...layout,
      conferenceSchedule: layout.conferenceSchedule.filter((entry) => entry.id !== entryId),
    });
  };

  const updateChapterProfile = async (payload: Partial<DashboardLayout["chapterProfile"]>) => {
    await commit({
      ...layout,
      chapterProfile: {
        ...layout.chapterProfile,
        ...payload,
      },
    });
  };

  const value = useMemo(
    () => ({
      ready,
      editMode,
      layout,
      widgets: layout.widgets,
      setEditMode,
      addWidget,
      removeWidget,
      updateWidget,
      reorderWidgets,
      resetLayout,
      setConferenceDate,
      setSelectedCompetitiveEvents,
      upsertConferenceEntry,
      deleteConferenceEntry,
      updateChapterProfile,
    }),
    [ready, editMode, layout],
  );

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboard(): DashboardContextValue {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error("useDashboard must be used within DashboardProvider");
  }
  return context;
}

export function createConferenceEntryId(level: ConferenceLevel): string {
  return `${level.toLowerCase()}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function nextConferenceFromType(type: FblaWidgetType): ConferenceLevel | null {
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

export function sizeLabel(size: WidgetSize): string {
  switch (size) {
    case "full":
      return "Full Width";
    case "tall":
      return "Tall";
    default:
      return "Half Width";
  }
}
