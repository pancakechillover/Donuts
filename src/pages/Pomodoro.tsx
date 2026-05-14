import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../lib/store';
import { Button } from '../components/ui/Button';
import { ymd, parseYMD, clamp } from '../lib/utils';
import { Modal } from '../components/ui/Modal';
import { PomodoroChart } from '../components/PomodoroChart';
import { motion } from 'motion/react';
import { Play, Pause, Square, Clock } from 'lucide-react';

export function PomodoroScreen() {
  const { db, selectedDate, setSelectedDate, getDayData, updateDayData } = useAppStore();
  const dateKey = ymd(selectedDate);
  const pom = getDayData(dateKey).pomodoro;

  const [dateModalOpen, setDateModalOpen] = useState(false);
  const [datePickerVal, setDatePickerVal] = useState(dateKey);

  // Timer State
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<'work' | 'break'>('work');
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (isActive && timeLeft === 0) {
      setIsActive(false);
      
      const isWork = mode === 'work';
      const title = isWork ? "🍅 专注完成！" : "🍩 休息结束！";
      const body = isWork ? "甜甜圈出炉啦，休息一下吧！" : "准备好开始新的专注了吗？";
      
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body, icon: '/vite.svg' });
      }

      if (isWork) {
        const hour = new Date().getHours();
        const part = hour < 14 ? 'morning' : (hour < 20 ? 'noon' : 'evening');
        handleStep(part, 1);
        setMode('break');
        setTimeLeft(5 * 60);
      } else {
        setMode('work');
        setTimeLeft(25 * 60);
      }
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isActive, timeLeft, mode]);

  const toggleTimer = () => {
    if (!isActive && 'Notification' in window && Notification.permission === 'default') {
       Notification.requestPermission();
    }
    setIsActive(!isActive);
  };
  
  const stopTimer = () => {
    setIsActive(false);
    setTimeLeft(mode === 'work' ? 25 * 60 : 5 * 60);
  };

  const switchMode = (newMode: 'work' | 'break') => {
    setIsActive(false);
    setMode(newMode);
    setTimeLeft(newMode === 'work' ? 25 * 60 : 5 * 60);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleStep = (part: 'morning' | 'noon' | 'evening', delta: number) => {
    updateDayData(dateKey, {
      pomodoro: { ...pom, [part]: clamp(pom[part] + delta, 0, 30) }
    });
  };

  const handleClear = () => {
    if(!confirm(`确定清空 ${dateKey} 的番茄钟记录吗？`)) return;
    updateDayData(dateKey, { pomodoro: { morning: 0, noon: 0, evening: 0 } });
  };

  const handleToday = () => {
    setSelectedDate(new Date(new Date().setHours(0,0,0,0)));
  };

  const pomSummaryTotal = pom.morning + pom.noon + pom.evening;
  const pomSummaryHour = ((pomSummaryTotal * 25) / 60).toFixed(1);
  const pomSummaryScore = Math.round((pomSummaryTotal / 24) * 100) + "%";

  const bestArr = [
      { label: "早晨", value: pom.morning, color: "#E06C6C" },
      { label: "中午", value: pom.noon, color: "#FFB347" },
      { label: "晚上", value: pom.evening, color: "#7AA2FF" }
  ];
  const maxVal = Math.max(...bestArr.map(x => x.value));
  const bestPeriods = maxVal > 0 ? bestArr.filter(x => x.value === maxVal) : [];
  const bestPeriod = bestPeriods.length > 0 ? bestPeriods.map(x => x.label).join("、") : "—";
  
  const bestDivStyle: React.CSSProperties = {};
  if (bestPeriods.length === 1) {
    bestDivStyle.color = bestPeriods[0].color;
  } else if (bestPeriods.length > 1) {
    const colors = bestPeriods.map(x => x.color).join(', ');
    bestDivStyle.background = `linear-gradient(90deg, ${colors})`;
    bestDivStyle.WebkitBackgroundClip = 'text';
    bestDivStyle.backgroundClip = 'text';
    bestDivStyle.color = 'transparent';
  }

  const renderTomatoes = (count: number, part: 'morning' | 'noon' | 'evening') => {
    return Array.from({ length: 8 }).map((_, i) => (
      <span 
        key={i} 
        className="text-[28px] cursor-pointer transition-all duration-300" 
        style={i < count ? { cursor: 'default' } : { filter: 'grayscale(100%)', opacity: 0.3 }}
        onClick={() => { if (i >= count) handleStep(part, 1); }}
      >
        🍅
      </span>
    ));
  };

  return (
    <div className="grid gap-3.5 mt-4">
      
      {/* Live Timer Section */}
      <motion.div 
        className="bg-gradient-to-br from-[var(--bg)] to-[var(--bg2)] border border-[var(--line)] rounded-[var(--radius)] shadow-[var(--shadow)] overflow-hidden flex flex-col items-center justify-center p-8"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
      >
        <div className="flex gap-2 border border-[var(--line)] bg-[var(--panel2)] rounded-full p-1 mb-8 shadow-inner">
          <div 
            onClick={() => switchMode('work')}
            className={`px-6 py-2 rounded-full text-sm font-bold cursor-pointer transition-all flex items-center gap-2 ${mode === 'work' ? 'bg-[var(--accent)] text-white shadow-md scale-105' : 'text-[var(--muted)] hover:text-[var(--text)]'}`}
          >
            <Clock className="w-4 h-4" /> 专注
          </div>
          <div 
            onClick={() => switchMode('break')}
            className={`px-6 py-2 rounded-full text-sm font-bold cursor-pointer transition-all flex items-center gap-2 ${mode === 'break' ? 'bg-[var(--good)] text-white shadow-md scale-105' : 'text-[var(--muted)] hover:text-[var(--text)]'}`}
          >
            休息 🍩
          </div>
        </div>

        <div className="text-[80px] md:text-[110px] font-mono font-bold leading-none tracking-tighter mb-8 text-[var(--accent)]" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {formatTime(timeLeft)}
        </div>

        <div className="flex items-center gap-4">
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleTimer}
            className={`w-16 h-16 rounded-full flex items-center justify-center text-white shadow-lg transition-colors ${isActive ? 'bg-[var(--warn)] shadow-[var(--warn)]/20' : 'bg-[var(--accent)] shadow-[var(--accent)]/30'}`}
          >
            {isActive ? <Pause className="w-8 h-8" fill="currentColor" /> : <Play className="w-8 h-8 ml-1" fill="currentColor" />}
          </motion.button>
          
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={stopTimer}
            className="w-14 h-14 rounded-full flex items-center justify-center border border-[var(--line)] bg-[color-mix(in_srgb,var(--panel2)_80%,transparent)] text-[var(--text)] shadow-sm transition-colors hover:bg-[var(--line)]"
          >
            <Square className="w-5 h-5" fill="currentColor" />
          </motion.button>
        </div>
      </motion.div>

      <div className="bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius)] shadow-[var(--shadow)] overflow-hidden">
        <div className="flex items-center justify-between p-3 border-b border-[color-mix(in_srgb,var(--line)_85%,transparent)] bg-[color-mix(in_srgb,var(--panel2)_65%,transparent)]">
          <h2 className="m-0 text-[13px] font-bold">当日完成番茄闹钟统计</h2>
          <div className="flex gap-2">
            <Button onClick={handleToday}>回到今天</Button>
            <Button variant="danger" onClick={handleClear}>清空当日</Button>
          </div>
        </div>
        
        <div className="p-3.5">
          <div className="flex justify-between items-end w-full">
             <div>
                <div className="text-[var(--muted)] text-xs">当前日期</div>
                <div className="text-base cursor-pointer hover:underline" onClick={() => { setDatePickerVal(ymd(selectedDate)); setDateModalOpen(true); }}>
                  {dateKey}
                </div>
             </div>
             <div className="flex gap-2 items-end">
                <Button onClick={() => setSelectedDate(new Date(selectedDate.getTime() - 86400000))}>前一天</Button>
                <Button onClick={() => setSelectedDate(new Date(selectedDate.getTime() + 86400000))}>后一天</Button>
             </div>
          </div>

          <div className="h-[1px] bg-[color-mix(in_srgb,var(--line)_85%,transparent)] my-3"></div>

          <div className="grid md:grid-cols-3 gap-5 md:gap-4 my-6">
             <div className="w-full max-w-sm mx-auto bg-gradient-to-b from-[var(--bg)] to-[var(--bg2)] rounded-[18px] shadow-[0_4px_24px_rgba(255,186,73,0.1)] p-5 flex flex-col gap-2 items-center">
                <div>
                   <div className="text-[38px] leading-tight mb-2 text-center">🌅</div>
                   <div className="text-xl font-bold mb-0.5 text-center">早晨</div>
                   <div className="text-sm mb-2.5 text-center text-[var(--muted)]">08:00–12:00</div>
                </div>
                <div className="flex items-center gap-2 mb-2">
                   <Button onClick={() => handleStep('morning', -1)}>－</Button>
                   <div className="border border-[var(--line)] px-3 py-1 rounded-full text-sm font-bold min-w-[32px] text-center">{pom.morning}</div>
                   <Button onClick={() => handleStep('morning', 1)}>＋</Button>
                </div>
                <div className="grid grid-cols-4 md:grid-cols-8 gap-x-1 gap-y-0.5 justify-items-center">
                   {renderTomatoes(pom.morning, 'morning')}
                </div>
             </div>

             <div className="w-full max-w-sm mx-auto bg-gradient-to-b from-[var(--bg)] to-[var(--bg2)] rounded-[18px] shadow-[0_4px_24px_rgba(255,186,73,0.1)] p-5 flex flex-col gap-2 items-center">
                <div>
                   <div className="text-[38px] leading-tight mb-2 text-center">☀️</div>
                   <div className="text-xl font-bold mb-0.5 text-center">中午</div>
                   <div className="text-sm mb-2.5 text-center text-[var(--muted)]">14:00–18:00</div>
                </div>
                <div className="flex items-center gap-2 mb-2">
                   <Button onClick={() => handleStep('noon', -1)}>－</Button>
                   <div className="border border-[var(--line)] px-3 py-1 rounded-full text-sm font-bold min-w-[32px] text-center">{pom.noon}</div>
                   <Button onClick={() => handleStep('noon', 1)}>＋</Button>
                </div>
                <div className="grid grid-cols-4 md:grid-cols-8 gap-x-1 gap-y-0.5 justify-items-center">
                   {renderTomatoes(pom.noon, 'noon')}
                </div>
             </div>

             <div className="w-full max-w-sm mx-auto bg-gradient-to-b from-[var(--bg)] to-[var(--bg2)] rounded-[18px] shadow-[0_4px_24px_rgba(255,186,73,0.1)] p-5 flex flex-col gap-2 items-center">
                <div>
                   <div className="text-[38px] leading-tight mb-2 text-center">🌙</div>
                   <div className="text-xl font-bold mb-0.5 text-center">晚上</div>
                   <div className="text-sm mb-2.5 text-center text-[var(--muted)]">20:00–24:00</div>
                </div>
                <div className="flex items-center gap-2 mb-2">
                   <Button onClick={() => handleStep('evening', -1)}>－</Button>
                   <div className="border border-[var(--line)] px-3 py-1 rounded-full text-sm font-bold min-w-[32px] text-center">{pom.evening}</div>
                   <Button onClick={() => handleStep('evening', 1)}>＋</Button>
                </div>
                <div className="grid grid-cols-4 md:grid-cols-8 gap-x-1 gap-y-0.5 justify-items-center">
                   {renderTomatoes(pom.evening, 'evening')}
                </div>
             </div>
          </div>

          <div className="w-full mb-4 bg-gradient-to-b from-[var(--bg)] to-[var(--bg2)] rounded-[18px] shadow-[0_4px_24px_rgba(255,186,73,0.08)] p-4 flex flex-col gap-2 items-center">
             <div className="text-[22px] font-bold text-center mb-2">🍅 今日总结</div>
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full justify-items-center items-stretch">
                <div className="bg-[color-mix(in_srgb,var(--panel2)_62%,transparent)] rounded-2xl p-2.5 min-w-[90px] text-center w-full">
                   <div className="text-[13px] text-[var(--muted)] mb-1">总番茄数</div>
                   <div className="text-[28px] font-bold text-[#f86521]">{pomSummaryTotal}</div>
                </div>
                <div className="bg-[color-mix(in_srgb,var(--panel2)_62%,transparent)] rounded-2xl p-2.5 min-w-[90px] text-center w-full">
                   <div className="text-[13px] text-[var(--muted)] mb-1">专注小时</div>
                   <div className="text-[28px] font-bold text-[#e1d532]">{pomSummaryHour}</div>
                </div>
                <div className="bg-[color-mix(in_srgb,var(--panel2)_62%,transparent)] rounded-2xl p-2.5 min-w-[90px] text-center w-full">
                   <div className="text-[13px] text-[var(--muted)] mb-1">效率分数</div>
                   <div className="text-[28px] font-bold text-[#539dfd]">{pomSummaryScore}</div>
                </div>
                <div className="bg-[color-mix(in_srgb,var(--panel2)_62%,transparent)] rounded-2xl p-2.5 min-w-[90px] text-center w-full">
                   <div className="text-[13px] text-[var(--muted)] mb-1">最佳时段</div>
                   <div className="text-[28px] font-bold" style={bestDivStyle}>{bestPeriod}</div>
                </div>
             </div>
          </div>

          <div className="h-[1px] bg-[color-mix(in_srgb,var(--line)_85%,transparent)] my-3"></div>

          <div className="bg-transparent mb-1 mt-6">
             <h2 className="m-0 text-[13px] font-bold">统计图</h2>
             <div className="text-xs text-[var(--muted)] mt-0.5">从今天起，过去10天</div>
          </div>
          <div>
            <PomodoroChart />
          </div>

        </div>
      </div>
      
      {dateModalOpen && (
        <Modal
          title="选择日期"
          onClose={() => setDateModalOpen(false)}
          footer={<Button variant="primary" onClick={() => {
            if(datePickerVal) {
              setSelectedDate(parseYMD(datePickerVal));
              setDateModalOpen(false);
            }
          }}>确定</Button>}
        >
          <input 
            type="date" 
            className="w-full text-base p-2 border border-[var(--line)] rounded-xl bg-[color-mix(in_srgb,var(--panel2)_62%,transparent)] outline-none"
            value={datePickerVal}
            onChange={(e) => setDatePickerVal(e.target.value)}
          />
        </Modal>
      )}

    </div>
  );
}
