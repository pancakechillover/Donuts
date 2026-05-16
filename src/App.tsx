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
            <div className="hidden sm:block">
              <h1 className="text-base m-0 tracking-tight font-black bg-gradient-to-r from-[var(--text)] to-[var(--muted)] bg-clip-text text-transparent">TimeDonut</h1>
              <div className="text-[10px] font-medium tracking-widest uppercase opacity-60">
                {isToday ? `TODAY · ${selYMD}` : isFuture ? `FUTURE · ${selYMD}` : `PAST · ${selYMD}`}
              </div>
            </div>
          </div>
          
          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center p-1 bg-[var(--panel2)]/50 rounded-2xl border border-[var(--line)] gap-1">
            {tabs.map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <div
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative px-4 py-1.5 rounded-xl cursor-pointer text-xs font-semibold select-none flex items-center gap-2 transition-all duration-200
                    ${isActive 
                      ? 'text-[var(--accent)]' 
                      : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--panel2)]'
                    }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="header-active-pill"
                      className="absolute inset-0 bg-[var(--bg)] shadow-sm rounded-xl border border-[var(--line)]"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                    />
                  )}
                  <tab.icon className={`w-3.5 h-3.5 relative z-10 ${isActive ? 'text-[var(--accent)]' : ''}`} />
                  <span className="relative z-10">{tab.label}</span>
                </div>
              );
            })}
          </nav>
          
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-1.5 pr-2 mr-2 border-r border-[var(--line)]">
              <Button 
                variant="ghost" 
                onClick={() => setDataModalOpen(true)} 
                className="h-8 px-2.5 text-xs opacity-70 hover:opacity-100"
              >
                <Database className="w-3.5 h-3.5" />
                <span className="hidden xl:inline">存档</span>
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} 
                className="h-8 px-2.5 text-xs opacity-70 hover:opacity-100"
              >
                {theme === 'light' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
                <span className="hidden xl:inline">{theme === 'light' ? '夜间' : '日间'}</span>
              </Button>
            </div>

            {/* Mobile Actions */}
            <div className="flex lg:hidden items-center gap-1">
              <button 
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} 
                className="p-2 text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--panel2)] rounded-lg transition-colors"
              >
                {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </button>
              <button 
                onClick={() => setDataModalOpen(true)} 
                className="p-2 text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--panel2)] rounded-lg transition-colors"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
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
