import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Database, DayData, Habit } from "./types";
import { nowYMD } from "./utils";

const STORAGE_KEY = "dailyTrackerData_v3";
const THEME_KEY = "dailyTrackerTheme_v1";

interface AppState {
  db: Database;
  theme: "light" | "dark";
  selectedDate: Date;
  calendarMonth: Date;
  updateDb: (newDb: Database) => void;
  setTheme: (theme: "light" | "dark") => void;
  setSelectedDate: (date: Date) => void;
  setCalendarMonth: (date: Date) => void;
  getDayData: (dateKey: string) => DayData;
  updateDayData: (dateKey: string, data: Partial<DayData>) => void;
  clearLocalData: () => void;
}

const AppStateContext = createContext<AppState | null>(null);

function getDefaultDb(): Database {
  return {
    days: {},
    habits: { list: [], records: {} },
    taskTypes: {
      list: [
        { id: "uncat", name: "未分类", color: "#7aa2ff", created: nowYMD() },
        { id: "study", name: "学习", color: "#7aa2ff", created: nowYMD() },
        { id: "work", name: "工作", color: "#46d39a", created: nowYMD() },
        { id: "life", name: "生活", color: "#ffcc66", created: nowYMD() },
      ],
    },
  };
}

function loadDB(): Database {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    parsed.days ||= {};
    parsed.habits ||= { list: [], records: {} };
    parsed.habits.list ||= [];
    parsed.habits.records ||= {};
    parsed.taskTypes ||= { list: [] };

    if (!parsed.taskTypes.list.length) {
      parsed.taskTypes.list = getDefaultDb().taskTypes.list;
    } else {
      if (!parsed.taskTypes.list.some((t: any) => t.id === "uncat")) {
        parsed.taskTypes.list.unshift({ id: "uncat", name: "未分类", color: "#7aa2ff", created: nowYMD() });
      }
    }
    return parsed;
  } catch (e) {
    return getDefaultDb();
  }
}

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [db, setDbState] = useState<Database>(loadDB());
  const [theme, setThemeState] = useState<"light" | "dark">("dark");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date(new Date().setHours(0, 0, 0, 0)));
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  useEffect(() => {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "light") {
      setThemeState("light");
      document.body.classList.add("light");
    } else {
      setThemeState("dark");
      document.body.classList.remove("light");
    }
  }, []);

  const setTheme = (mode: "light" | "dark") => {
    setThemeState(mode);
    localStorage.setItem(THEME_KEY, mode);
    if (mode === "light") {
      document.body.classList.add("light");
    } else {
      document.body.classList.remove("light");
    }
  };

  const updateDb = (newDb: Database) => {
    setDbState(newDb);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newDb));
  };

  const getDayData = (dateKey: string): DayData => {
    const existing = db.days[dateKey];
    if (existing) {
      return {
        activities: existing.activities || [],
        pomodoro: existing.pomodoro || { morning: 0, noon: 0, evening: 0 },
        sleep: existing.sleep || { wake: "", bed: "" },
        diary: existing.diary || { title: "", text: "", mood: 0, tags: [], updatedAt: 0 },
      };
    }
    return {
      activities: [],
      pomodoro: { morning: 0, noon: 0, evening: 0 },
      sleep: { wake: "", bed: "" },
      diary: { title: "", text: "", mood: 0, tags: [], updatedAt: 0 },
    };
  };

  const updateDayData = (dateKey: string, data: Partial<DayData>) => {
    const current = getDayData(dateKey);
    const updatedDb = { ...db };
    updatedDb.days[dateKey] = { ...current, ...data };
    updateDb(updatedDb);
  };

  const clearLocalData = () => {
    const defaultData = getDefaultDb();
    updateDb(defaultData);
  };

  return (
    <AppStateContext.Provider
      value={{
        db,
        theme,
        selectedDate,
        calendarMonth,
        updateDb,
        setTheme,
        setSelectedDate,
        setCalendarMonth,
        getDayData,
        updateDayData,
        clearLocalData,
      }}
    >
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppStore() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppStore must be used within AppStoreProvider");
  return ctx;
}
