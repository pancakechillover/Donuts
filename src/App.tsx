import React, { useState } from 'react';
import { AppStoreProvider, useAppStore } from './lib/store';
import { Button } from './components/ui/Button';
import { ymd } from './lib/utils';
import { Home, CheckSquare, Clock, Moon, BarChart2, BookOpen, MessageCircle, Settings, Sun, Database } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Screens
import { HomeScreen } from './pages/Home';
import { HabitsScreen } from './pages/Habits';
import { PomodoroScreen } from './pages/Pomodoro';
import { SleepScreen } from './pages/Sleep';
import { StatsScreen } from './pages/Stats';
import { DiaryScreen } from './pages/Diary';
import { AiCoach } from './pages/AiCoach';
import { DataModal } from './components/DataModal';

import { AutoSync } from './components/AutoSync';

function AppContent() {
  const { theme, setTheme, selectedDate, db } = useAppStore();
  const [activeTab, setActiveTab] = useState<'home' | 'habits' | 'pomodoro' | 'sleep' | 'stats' | 'diary' | 'ai'>('home');
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
    { id: 'home', label: '主页', icon: Home },
    { id: 'habits', label: '打卡', icon: CheckSquare },
    { id: 'pomodoro', label: '专注', icon: Clock },
    { id: 'sleep', label: '作息', icon: Moon },
    { id: 'stats', label: '统计', icon: BarChart2 },
    { id: 'diary', label: '日记', icon: BookOpen },
    { id: 'ai', label: 'AI', icon: MessageCircle },
  ] as const;

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      {/* Top Header - hidden on mobile, visible on desktop */}
      <header className="sticky top-0 z-20 backdrop-blur-[14px] bg-[color-mix(in_srgb,var(--bg)_70%,transparent)] border-b border-[color-mix(in_srgb,var(--line)_90%,transparent)]">
        <div className="max-w-[1280px] mx-auto px-3.5 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className={logoClasses}>{selectedDate.getDate()}号</div>
            <div>
              <h1 className="text-sm m-0 tracking-wide font-bold">TimeDonut</h1>
              <div className="text-xs text-[var(--muted)]">
                {isToday ? `今日：${selYMD}` : isFuture ? `未来：${selYMD}` : `历史：${selYMD}`}
              </div>
            </div>
          </div>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-2 justify-end flex-wrap">
            {tabs.map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <div
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`border px-3 py-1.5 rounded-full cursor-pointer text-xs select-none flex items-center gap-1.5 transition-all duration-150
                    ${isActive 
                      ? 'border-[color-mix(in_srgb,var(--accent)_58%,var(--line))] bg-[color-mix(in_srgb,var(--accent)_14%,var(--panel2))] text-[var(--accent)]' 
                      : 'border-[var(--line)] bg-[color-mix(in_srgb,var(--panel2)_60%,transparent)] hover:bg-[color-mix(in_srgb,var(--panel2)_82%,transparent)]'
                    }`}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                </div>
              );
            })}
            <Button onClick={() => setDataModalOpen(true)} title="数据导入/导出与存档"><Database className="w-3.5 h-3.5" /> 数据</Button>
            <Button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} title="切换日间/夜间">
              {theme === 'light' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
              {theme === 'light' ? ' 夜间' : ' 日间'}
            </Button>
          </nav>
          
          {/* Mobile Actions: Data & Theme */}
          <div className="flex md:hidden items-center gap-2">
            <button onClick={() => setDataModalOpen(true)} className="p-2 border border-[var(--line)] rounded-md shadow-sm">
              <Settings className="w-4 h-4" />
            </button>
            <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} className="p-2 border border-[var(--line)] rounded-md shadow-sm">
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1280px] mx-auto p-3.5 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            {activeTab === 'home' && <HomeScreen />}
            {activeTab === 'habits' && <HabitsScreen />}
            {activeTab === 'pomodoro' && <PomodoroScreen />}
            {activeTab === 'sleep' && <SleepScreen />}
            {activeTab === 'stats' && <StatsScreen />}
            {activeTab === 'diary' && <DiaryScreen />}
            {activeTab === 'ai' && <AiCoach />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-4 left-4 right-4 z-50 bg-[color-mix(in_srgb,var(--panel)_90%,transparent)] backdrop-blur-xl border border-[var(--line)] rounded-2xl shadow-xl p-2 flex items-center justify-around">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <div
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex flex-col items-center gap-1 p-2 flex-1 cursor-pointer select-none rounded-xl transition-all relative"
            >
              {isActive && (
                <motion.div 
                  layoutId="mobile-nav-indicator"
                  className="absolute inset-0 bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] rounded-xl"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <tab.icon className={`w-5 h-5 z-10 transition-colors ${isActive ? 'text-[var(--accent)]' : 'text-[var(--muted)]'}`} />
              <span className={`text-[10px] z-10 transition-colors ${isActive ? 'text-[var(--accent)] font-medium' : 'text-[var(--muted)]'}`}>
                {tab.label}
              </span>
            </div>
          );
        })}
      </nav>

      <AutoSync />

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
