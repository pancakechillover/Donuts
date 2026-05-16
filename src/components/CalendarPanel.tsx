import React, { useState } from 'react';
import { useAppStore } from '../lib/store';
import { ymd, parseYMD, getMatchingRecurringTasks } from '../lib/utils';
import { Button } from './ui/Button';

export function CalendarPanel() {
  const { db, selectedDate, setSelectedDate, calendarMonth, setCalendarMonth, getCombinedActivities } = useAppStore();
  const [collapsed, setCollapsed] = useState(false);

  const y = calendarMonth.getFullYear();
  const m = calendarMonth.getMonth();
  
  const dows = ["一", "二", "三", "四", "五", "六", "日"];
  
  const first = new Date(y, m, 1);
  const firstDow = (first.getDay() + 6) % 7;
  const start = new Date(y, m, 1 - firstDow);

  const handlePrevMonth = () => {
    setCalendarMonth(new Date(y, m - 1, 1));
  };

  const handleNextMonth = () => {
    setCalendarMonth(new Date(y, m + 1, 1));
  };

  const cells = [];
  for (let i = 0; i < 42; i++) {
    const cur = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const curKey = ymd(cur);
    const inMonth = (cur.getMonth() === m);
    const isSel = (curKey === ymd(selectedDate));
    const isToday = (curKey === ymd(new Date()));

    const allActs = getCombinedActivities(curKey);
    const isDdl = allActs.some(a => a.isDeadline);

    cells.push({ cur, curKey, inMonth, isSel, isToday, isDdl, acts: allActs.slice(0, 6) });
  }

  const selDateLabel = `已选：${ymd(selectedDate)}`;

  return (
    <div className="bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius)] shadow-[var(--shadow)] overflow-hidden transition-all duration-300">
      <div className="flex items-center justify-between p-3 border-b border-[color-mix(in_srgb,var(--line)_85%,transparent)] bg-[color-mix(in_srgb,var(--panel2)_65%,transparent)] flex-wrap gap-2.5">
        <h2 className="m-0 text-[13px] font-bold flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse"></span>
          日历
        </h2>
        <div className="flex items-center gap-2">
          <div className="text-xs text-[var(--muted)] font-mono">{selDateLabel}</div>
          <Button onClick={() => setCollapsed(!collapsed)} className="text-[11px] px-2.5 py-1">
            {collapsed ? '展开日历' : '收起日历'}
          </Button>
        </div>
      </div>
      
      {!collapsed && (
        <div className="p-3.5 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between flex-wrap gap-2.5 mb-2 px-1">
              <div className="flex gap-2">
                <Button onClick={handlePrevMonth} className="h-8 px-3 text-[11px]">上个月</Button>
                <Button onClick={handleNextMonth} className="h-8 px-3 text-[11px]">下个月</Button>
              </div>
              <div className="text-[13px] font-bold text-[var(--text)] font-mono">{`${y} 年 ${String(m + 1).padStart(2, "0")} 月`}</div>
            </div>
            
            <div className="grid grid-cols-7 gap-1.5 px-1">
              {dows.map(dow => (
                <div key={dow} className="text-[11px] text-[var(--muted)] text-center font-medium opacity-70">周{dow}</div>
              ))}
            </div>
            
            <div className="grid grid-cols-7 gap-1.5">
              {cells.map((cell, idx) => {
                const ddlActs = cell.acts.filter(a => a.isDeadline);
                const normalActs = cell.acts.filter(a => !a.isDeadline);
                return (
                <div 
                  key={idx} 
                  className={`relative border border-[var(--line)] bg-[var(--panel2)]/60 rounded-xl p-1.5 flex flex-col gap-1 min-h-[64px] cursor-pointer select-none transition-all duration-150 hover:scale-[1.03] hover:z-10 hover:shadow-lg hover:border-[var(--accent)] active:scale-95 ${!cell.inMonth ? 'opacity-40 grayscale-[0.5]' : ''} ${cell.isSel ? 'border-[var(--accent)] bg-[var(--accent)]/10 ring-2 ring-[var(--accent)] ring-opacity-20' : ''} ${cell.isToday ? 'outline outline-2 outline-[#46d39a66] outline-offset-1' : ''} ${cell.isDdl ? 'bg-[color-mix(in_srgb,var(--panel),#ef4444_5%)] border-[color-mix(in_srgb,var(--panel),#ef4444_30%)] shadow-[inset_0_0_12px_rgba(239,68,68,0.1)]' : ''}`}
                  onClick={() => {
                    setSelectedDate(cell.cur);
                    if (!cell.inMonth) {
                      setCalendarMonth(new Date(cell.cur.getFullYear(), cell.cur.getMonth(), 1));
                    }
                  }}
                >
                  <div className="flex justify-between items-start">
                    <div className={`text-[11px] font-mono ${cell.isToday ? 'bg-[#46d39a] text-white px-1 rounded-sm' : (!cell.inMonth ? 'text-[var(--muted)] opacity-70' : 'text-[var(--text)]')}`}>
                      {cell.cur.getDate()}
                    </div>
                  </div>
                  
                  {/* DDL task labels in the middle */}
                  <div className="flex flex-col items-center justify-center flex-1 w-full gap-0.5 overflow-hidden my-0.5">
                    {ddlActs.map((act, actIdx) => (
                      <span 
                        key={`ddl-${actIdx}`} 
                        className="text-[10px] sm:text-[11px] leading-tight text-[#ef4444] font-bold px-1 rounded bg-[color-mix(in_srgb,var(--panel),#ef4444_15%)] border border-[#ef4444]/30 truncate w-full text-center shadow-sm"
                        title={act.label}
                      >
                        {act.label.substring(0, 2)}
                      </span>
                    ))}
                  </div>

                  {/* Normal act dots at the bottom */}
                  {normalActs.length > 0 && (
                    <div className="flex flex-wrap gap-0.5 mt-auto pt-0.5">
                      {normalActs.map((act, actIdx) => {
                        const c = db.taskTypes.list.find(t=>t.id===act.typeId)?.color || '#7aa2ff';
                        return <span key={`norm-${actIdx}`} className="w-[5px] h-[5px] rounded-full" style={{ background: c }}></span>;
                      })}
                    </div>
                  )}
                </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
