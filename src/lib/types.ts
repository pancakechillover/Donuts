export interface TaskType {
  id: string;
  name: string;
  color: string;
  created: string; // YYYY-MM-DD
}

export interface ActivitySegment {
  id?: string;
  startMin: number;
  endMin: number;
  label: string;
  typeId: string;
  isRecurring?: boolean;
  recurringId?: string;
  isDeadline?: boolean;
}

export interface PomodoroData {
  morning: number;
  noon: number;
  evening: number;
}

export interface SleepData {
  wake: string; // HH:mm
  bed: string; // HH:mm
}

export interface DiaryData {
  title: string;
  text: string;
  mood: number;
  tags: string[];
  updatedAt: number;
}

export interface DayData {
  activities: ActivitySegment[];
  pomodoro: PomodoroData;
  sleep: SleepData;
  diary: DiaryData;
}

export interface Habit {
  id: string;
  name: string;
  cycleStart: string; // YYYY-MM-DD
  created: string; // YYYY-MM-DD
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: number;
}

export interface AiPersona {
  id: string;
  name: string;
  prompt: string;
}

export interface AiConfig {
  apiKey: string;
  model: string;
  persona: string; // Keep for fallback name if personaId not found
  personaId?: string;
  personas?: AiPersona[]; // Deprecated, but keeping for compatibility if previously used
  customPersonas?: AiPersona[];
  provider: 'gemini' | 'openai-compatible';
  baseUrl?: string;
  quickPrompts?: string[];
}

export interface TimelineConfig {
  morningStart: string; // HH:mm
  noonStart: string;    // HH:mm
  eveningStart: string; // HH:mm
}

export interface RecurringTask {
  id: string;
  startMin: number;
  endMin: number;
  label: string;
  typeId: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  startDate: string; // YYYY-MM-DD
  isDeadline?: boolean;
}

export interface Database {
  days: Record<string, DayData>;
  habits: {
    list: Habit[];
    records: Record<string, Record<string, boolean[]>>; // habitId -> cycleKey -> 10 booleans
  };
  taskTypes: {
    list: TaskType[];
  };
  recurringTasks?: {
    list: RecurringTask[];
  };
  aiChats: {
    sessions: ChatSession[];
    activeSessionId: string | null;
    config: AiConfig;
  };
  settings?: {
    timeline: TimelineConfig;
  };
}
