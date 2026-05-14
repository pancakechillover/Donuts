import React, { useState } from 'react';
import { useAppStore } from '../lib/store';
import { ymd, parseYMD } from '../lib/utils';
import { Button } from './ui/Button';

export function CalendarPanel() {
  const { db, selectedDate, setSelectedDate, calendarMonth, setCalendarMonth } = useAppStore();
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

    const acts = (db.days[curKey]?.activities || []).slice(0, 6);
    cells.push({ cur, curKey, inMonth, isSel, isToday, acts });
  }

  const selDateLabel = `已选：${ymd(selectedDate)}`;

  return (
    <div className="bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius)] shadow-[var(--shadow)] overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b border-[color-mix(in_srgb,var(--line)_85%,transparent)] bg-[color-mix(in_srgb,var(--panel2)_65%,transparent)] flex-wrap gap-2.5">
        <h2 className="m-0 text-[13px] font-bold">日历</h2>
        <div className="flex items-center gap-2">
          <div className="text-xs text-[var(--muted)]">{selDateLabel}</div>
          <Button onClick={() => setCollapsed(!collapsed)}>{collapsed ? '展开日历' : '收起日历'}</Button>
        </div>
      </div>
      
      {!collapsed && (
        <div className="p-3.5">
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between flex-wrap gap-2.5 mb-2">
              <div className="flex gap-2">
                <Button onClick={handlePrevMonth}>上个月</Button>
                <Button onClick={handleNextMonth}>下个月</Button>
              </div>
              <div className="text-[13px] text-[var(--text)]">{`${y} 年 ${String(m + 1).padStart(2, "0")} 月`}</div>
            </div>
            
            <div className="grid grid-cols-7 gap-2">
              {dows.map(dow => (
                <div key={dow} className="text-[11px] text-[var(--muted)] text-center py-1">周{dow}</div>
              ))}
            </div>
            
            <div className="grid grid-cols-7 gap-2">
              {cells.map((cell, idx) => (
                <div 
                  key={idx} 
                  className={`border border-[var(--line)] bg-[color-mix(in_srgb,var(--panel2)_62%,transparent)] rounded-xl p-1.5 flex flex-col gap-1.5 min-h-[52px] cursor-pointer select-none transition-all duration-140 hover:-translate-y-px hover:bg-[color-mix(in_srgb,var(--panel2)_82%,transparent)] ${!cell.inMonth ? 'opacity-60' : ''} ${cell.isSel ? 'border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_12%,var(--panel2))]' : ''} ${cell.isToday ? 'outline outline-2 outline-[#46d39a66] outline-offset-2' : ''}`}
                  onClick={() => {
                    setSelectedDate(cell.cur);
                    setCalendarMonth(new Date(cell.cur.getFullYear(), cell.cur.getMonth(), 1));
                  }}
                >
                  <div className={`text-xs ${!cell.inMonth ? 'text-[#b3b9c9]' : 'text-[var(--text)]'}`}>{cell.cur.getDate()}</div>
                  <div className="flex flex-wrap gap-1">
                    {cell.acts.map((act, actIdx) => {
                      const c = db.taskTypes.list.find(t=>t.id===act.typeId)?.color || '#7aa2ff';
                      return <span key={actIdx} className="w-2.5 h-2.5 rounded-full opacity-90" style={{ background: c }}></span>;
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
