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
    "flex items-center justify-center w-9 h-9 rounded-xl font-bold text-sm text-white shadow-lg relative overflow-hidden flex-shrink-0 transition-all duration-300 transform hover:scale-105",
    isToday && "bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] ring-4 ring-[#6366f1]/20",
    !isToday && !isFuture && "bg-gradient-to-br from-[#f43f5e] to-[#fb923c] ring-4 ring-[#f43f5e]/20",
    !isToday && isFuture && "bg-gradient-to-br from-[#0ea5e9] to-[#2dd4bf] ring-4 ring-[#0ea5e9]/20"
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
      {/* Top Header */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-[var(--bg)]/70 border-b border-[var(--line)] transition-all duration-300">
        <div className="max-w-[1400px] mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 group cursor-pointer" onClick={() => setActiveTab('home')}>
            <div className={logoClasses}>
              <span className="relative z-10">{selectedDate.getDate()}</span>
              <div className="absolute inset-0 bg-white/10 group-hover:bg-white/20 transition-colors" />
            </div>
            <div className="hidden md:block">
              <h1 className="text-[15px] m-0 tracking-tight font-black bg-gradient-to-r from-[var(--text)] to-[var(--muted)] bg-clip-text text-transparent">TimeDonut</h1>
              <div className="text-[9px] font-medium tracking-widest uppercase opacity-60">
                {isToday ? `TODAY · ${selYMD}` : isFuture ? `FUTURE · ${selYMD}` : `PAST · ${selYMD}`}
              </div>
            </div>
          </div>
          
          {/* Desktop Navigation */}
          <nav className="hidden sm:flex items-center p-1 bg-[var(--panel2)]/60 rounded-xl border border-[var(--line)] gap-0.5 shadow-sm">
            {tabs.map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <div
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative px-3 py-1.5 rounded-lg cursor-pointer text-[13px] font-medium select-none flex items-center gap-1.5 transition-all duration-200
                    ${isActive 
                      ? 'text-[var(--text)]' 
                      : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--line)]/50'
                    }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="header-active-pill"
                      className="absolute inset-0 bg-[var(--bg)] shadow border border-[var(--line)] rounded-lg"
                      transition={{ type: "spring", bounce: 0.25, duration: 0.5 }}
                    />
                  )}
                  <tab.icon className={`w-[14px] h-[14px] relative z-10 ${isActive ? 'text-[var(--accent)]' : ''}`} />
                  <span className="relative z-10 hidden lg:inline">{tab.label}</span>
                </div>
              );
            })}
          </nav>
          
          <div className="flex items-center">
            {/* Actions */}
            <nav className="flex items-center p-1 bg-[var(--panel2)]/60 rounded-xl border border-[var(--line)] gap-0.5 shadow-sm">
              <div 
                onClick={() => setDataModalOpen(true)} 
                className="relative px-3 py-1.5 rounded-lg cursor-pointer text-[13px] font-medium select-none flex items-center gap-1.5 transition-all duration-200 text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--line)]/50"
              >
                <Database className="w-[14px] h-[14px] relative z-10" />
                <span className="relative z-10 hidden xl:inline">存档</span>
              </div>
              <div 
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} 
                className="relative px-3 py-1.5 rounded-lg cursor-pointer text-[13px] font-medium select-none flex items-center gap-1.5 transition-all duration-200 text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--line)]/50"
              >
                {theme === 'light' ? <Moon className="w-[14px] h-[14px] relative z-10" /> : <Sun className="w-[14px] h-[14px] relative z-10" />}
                <span className="relative z-10 hidden xl:inline">{theme === 'light' ? '夜间' : '日间'}</span>
              </div>
            </nav>
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
