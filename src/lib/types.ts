export interface TaskType {
  id: string;
  name: string;
  color: string;
  created: string; // YYYY-MM-DD
}

export interface ActivitySegment {
  startMin: number;
  endMin: number;
  label: string;
  typeId: string;
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

export interface Database {
  days: Record<string, DayData>;
  habits: {
    list: Habit[];
    records: Record<string, Record<string, boolean[]>>; // habitId -> cycleKey -> 10 booleans
  };
  taskTypes: {
    list: TaskType[];
  };
}
