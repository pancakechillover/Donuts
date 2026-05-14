import React, { useState } from 'react';
import { AppStoreProvider, useAppStore } from './lib/store';
import { Button } from './components/ui/Button';
import { ymd } from './lib/utils';
// Screens
import { HomeScreen } from './pages/Home';
import { HabitsScreen } from './pages/Habits';
import { PomodoroScreen } from './pages/Pomodoro';
import { SleepScreen } from './pages/Sleep';
import { StatsScreen } from './pages/Stats';
import { DiaryScreen } from './pages/Diary';
import { DataModal } from './components/DataModal';

function AppContent() {
  const { theme, setTheme, selectedDate, db } = useAppStore();
  const [activeTab, setActiveTab] = useState<'home' | 'habits' | 'pomodoro' | 'sleep' | 'stats' | 'diary'>('home');
  const [dataModalOpen, setDataModalOpen] = useState(false);

  // Logo state logic
  const todayYMD = ymd(new Date());
  const selYMD = ymd(selectedDate);
  const isToday = selYMD === todayYMD;
  const isFuture = selectedDate > new Date(new Date().setHours(23, 59, 59, 999));
  
  const logoClasses = [
    "flex items-center justify-center w-[34px] h-[34px] rounded-xl font-semibold text-[13px] text-white shadow-[var(--shadow)] relative overflow-hidden flex-shrink-0",
    isToday && "bg-gradient-to-br from-[#7aa2ff] to-[#a78bfa] shadow-[0_0_0_3px_#7aa2ff44]",
    !isToday && !isFuture && "bg-gradient-to-br from-[#ff6b6b] to-[#ffcc66] shadow-[0_0_0_3px_#ff6b6b44]",
    !isToday && isFuture && "bg-gradient-to-br from-[#2563eb] to-[#60a5fa] shadow-[0_0_0_3px_#2563eb44]"
  ].filter(Boolean).join(" ");

  const tabs = [
    { id: 'home', label: '主页面' },
    { id: 'habits', label: '习惯统计' },
    { id: 'pomodoro', label: '番茄闹钟' },
    { id: 'sleep', label: '起床与睡觉' },
    { id: 'stats', label: '任务统计' },
    { id: 'diary', label: '日记' },
  ] as const;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 backdrop-blur-[14px] bg-[color-mix(in_srgb,var(--bg)_70%,transparent)] border-b border-[color-mix(in_srgb,var(--line)_90%,transparent)]">
        <div className="max-w-[1280px] mx-auto px-3.5 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className={logoClasses}>{selectedDate.getDate()}号</div>
            <div>
              <h1 className="text-sm m-0 tracking-wide font-bold">个人记录面板</h1>
              <div className="text-xs text-[var(--muted)]">
                {isToday ? `今日：${selYMD}` : isFuture ? `未来：${selYMD}` : `历史：${selYMD}`}
              </div>
            </div>
          </div>
          <nav className="flex items-center gap-2 justify-end flex-wrap">
            {tabs.map(tab => (
              <div
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`border border-[var(--line)] px-2.5 py-2 rounded-full cursor-pointer text-xs select-none transition-all duration-140 hover:-translate-y-px ${
                  activeTab === tab.id 
                  ? 'border-[color-mix(in_srgb,var(--accent)_58%,var(--line))] bg-[color-mix(in_srgb,var(--accent)_14%,var(--panel2))]' 
                  : 'bg-[color-mix(in_srgb,var(--panel2)_60%,transparent)] hover:bg-[color-mix(in_srgb,var(--panel2)_82%,transparent)]'
                }`}
              >
                {tab.label}
              </div>
            ))}
            <Button onClick={() => setDataModalOpen(true)} title="数据导入/导出与存档">💾 数据</Button>
            <Button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} title="切换日间/夜间">
              {theme === 'light' ? '🌙 夜间' : '☀️ 日间'}
            </Button>
          </nav>
        </div>
      </header>

      <main className="max-w-[1280px] mx-auto p-3.5">
        {activeTab === 'home' && <HomeScreen />}
        {activeTab === 'habits' && <HabitsScreen />}
        {activeTab === 'pomodoro' && <PomodoroScreen />}
        {activeTab === 'sleep' && <SleepScreen />}
        {activeTab === 'stats' && <StatsScreen />}
        {activeTab === 'diary' && <DiaryScreen />}
      </main>

      {dataModalOpen && <DataModal onClose={() => setDataModalOpen(false)} />}
    </div>
  );
}

export default function App() {
  return (
    <AppStoreProvider>
      <AppContent />
    </AppStoreProvider>
  );
}
