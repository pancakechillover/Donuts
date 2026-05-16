import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Database, DayData, Habit, AiPersona, ActivitySegment } from "./types";
import { nowYMD, getMatchingRecurringTasks } from "./utils";

const STORAGE_KEY = "dailyTrackerData_v3";
const THEME_KEY = "dailyTrackerTheme_v1";

export const DEFAULT_PERSONAS: AiPersona[] = [
  { id: 'p1', name: '时间管理大师', prompt: '你是一个严格的时间管理大师，善于分析用户的时间开销，并给出高效的日程规划建议。' },
  { id: 'p2', name: '严格督导', prompt: '你是一个极其严格的督导，不喜欢听到借口，会严厉指出用户的摸鱼行为，并督促他们立刻行动。' },
  { id: 'p3', name: '温柔倾听者', prompt: '你是一个温柔、充满同理心的倾听者。不管用户遇到什么挫折，你都会给予鼓励和情感上的支持。' },
  { id: 'p4', name: '数据分析专家', prompt: '你是一个客观的数据分析专家。只看数据说话，根据图表和统计给出理性、有逻辑的分析和提升结论。' },
  { id: 'p5', name: '佛系生活家', prompt: '你倡导Work-Life Balance，不鼓励内卷，如果用户压力太大，你会建议他们放下工作去休息和享受生活。' }
];

export const DEFAULT_PROMPTS = [
  "帮我分析一下今天的打卡情况",
  "明天该怎么安排比较好？",
  "我最近总是失眠，怎么办？",
  "鼓励我一下！"
];

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
  getCombinedActivities: (dateKey: string) => ActivitySegment[];
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
    recurringTasks: {
      list: []
    },
    aiChats: {
      sessions: [],
      activeSessionId: null,
      config: { apiKey: '', model: 'gemini-3-flash-preview', persona: '', personaId: 'p1', customPersonas: DEFAULT_PERSONAS, provider: 'gemini', quickPrompts: DEFAULT_PROMPTS, skipAiDoubleCheck: false }
    },
    settings: {
      timeline: {
        morningStart: '06:00',
        noonStart: '12:00',
        eveningStart: '18:00'
      }
    }
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
    parsed.recurringTasks ||= { list: [] };
    parsed.aiChats ||= getDefaultDb().aiChats;
    
    // Model Migration: Ensure we use valid models from the gemini-api skill
    const VALID_GEMINI_MODELS = ["gemini-3.1-flash-lite", "gemini-3-flash-preview", "gemini-3.1-pro-preview", "gemini-flash-latest"];
    if (parsed.aiChats.config.provider === 'gemini' && !VALID_GEMINI_MODELS.includes(parsed.aiChats.config.model)) {
      parsed.aiChats.config.model = 'gemini-3-flash-preview';
    }
    
    if (!parsed.settings) {
      parsed.settings = getDefaultDb().settings;
    }
    if (!parsed.settings.timeline) {
      parsed.settings.timeline = getDefaultDb().settings!.timeline;
    }
    
    // Migration for personas
    if (!parsed.aiChats.config.customPersonas) {
      parsed.aiChats.config.customPersonas = DEFAULT_PERSONAS;
    }
    if (!parsed.aiChats.config.personaId) {
      const match = parsed.aiChats.config.customPersonas.find((p: AiPersona) => p.name === parsed.aiChats.config.persona);
      parsed.aiChats.config.personaId = match ? match.id : 'p1';
    }
    if (!parsed.aiChats.config.quickPrompts) {
      parsed.aiChats.config.quickPrompts = DEFAULT_PROMPTS;
    }

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

  const getCombinedActivities = (dateKey: string): ActivitySegment[] => {
    const rawActs = [...getDayData(dateKey).activities];
    if (db.recurringTasks?.list?.length) {
      const recurring = getMatchingRecurringTasks(dateKey, db.recurringTasks.list);
      recurring.forEach(ra => {
        if (!rawActs.some(a => a.recurringId === ra.recurringId)) {
          rawActs.push(ra);
        }
      });
    }
    return rawActs.sort((a,b) => a.startMin - b.startMin);
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
        getCombinedActivities,
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
