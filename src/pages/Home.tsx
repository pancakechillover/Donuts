import React, { useRef, useEffect, useState } from 'react';
import { useAppStore } from '../lib/store';
import { Button } from '../components/ui/Button';
import { ymd, fmtMinRange, fmtDuration, minToTime, timeToMin, clamp } from '../lib/utils';
import { RingChart } from '../components/RingChart';
import { CalendarPanel } from '../components/CalendarPanel';
import { TimelineSettingsModal } from '../components/TimelineSettingsModal';
import { Settings, Repeat } from 'lucide-react';
import { ActivitySegment } from '../lib/types';

export function HomeScreen() {
  const { db, selectedDate, setSelectedDate, getDayData, getCombinedActivities } = useAppStore();
  const [timelineSettingsOpen, setTimelineSettingsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'time' | 'category'>('time');
  const dateKey = ymd(selectedDate);
  const todaysData = getDayData(dateKey);
  
  const handleToday = () => {
    setSelectedDate(new Date(new Date().setHours(0,0,0,0)));
  };

  const acts = getCombinedActivities(dateKey);
  const totalMin = acts.reduce((acc, seg) => acc + (seg.endMin - seg.startMin), 0);

  const mStart = timeToMin(db.settings?.timeline?.morningStart || '06:00');
  const nStart = timeToMin(db.settings?.timeline?.noonStart || '12:00');
  const eStart = timeToMin(db.settings?.timeline?.eveningStart || '18:00');

  const getPeriod = (min: number) => {
    if (min >= mStart && min < nStart) return 'morning';
    if (min >= nStart && min < eStart) return 'noon';
    return 'evening';
  };

  const actsMorning: ActivitySegment[] = [];
  const actsNoon: ActivitySegment[] = [];
  const actsEvening: ActivitySegment[] = [];

  acts.forEach(seg => {
    const p = getPeriod(seg.startMin);
    if (p === 'morning') actsMorning.push(seg);
    else if (p === 'noon') actsNoon.push(seg);
    else actsEvening.push(seg);
  });

  const actsByCategory: Record<string, ActivitySegment[]> = {};
  acts.forEach(seg => {
    if (!actsByCategory[seg.typeId]) {
      actsByCategory[seg.typeId] = [];
    }
    actsByCategory[seg.typeId].push(seg);
  });

  const renderAct = (seg: ActivitySegment, idx: number) => {
    const dur = seg.endMin - seg.startMin;
    const typeInfo = db.taskTypes.list.find(t => t.id === seg.typeId) || { name: '未分类', color: 'gray' };
    return (
      <div key={idx} className="relative pl-6">
        <div className="absolute left-1.5 top-0 bottom-[-16px] w-0.5 bg-[var(--line)]"></div>
        <div className="absolute left-[3px] top-4 w-2.5 h-2.5 rounded-full z-10" style={{ backgroundColor: typeInfo.color, outline: '2px solid var(--panel)' }}></div>
        
        <div className="border border-[var(--line)] bg-[color-mix(in_srgb,var(--panel2)_62%,transparent)] rounded-[14px] overflow-hidden transition-all duration-140 hover:-translate-y-px hover:bg-[color-mix(in_srgb,var(--panel2)_84%,transparent)] mb-3">
          <div className="h-1.5 opacity-80" style={{ background: typeInfo.color }}></div>
          <div className="p-2.5 px-3">
            <div className="flex justify-between items-baseline gap-2.5">
              <b className="text-[13px] font-bold truncate flex items-center gap-1.5">
                {seg.isRecurring && <Repeat className="w-3 h-3 text-[var(--accent)]" />}
                {seg.label || "未命名任务"}
              </b>
              <span className="text-[11px] font-mono whitespace-nowrap opacity-60">{fmtMinRange(seg.startMin, seg.endMin)}</span>
            </div>
            <div className="text-[11px] text-[var(--muted)] mt-1 flex justify-between gap-2.5 items-center">
              <span className="bg-[var(--panel)] px-1.5 py-0.5 rounded text-[10px] shadow-sm border border-[var(--line)]">{typeInfo.name}</span>
              <span>{fmtDuration(dur)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="grid gap-3.5 mt-4">
      <div className="grid md:grid-cols-[520px_1fr] gap-3.5 items-start">
        
        {/* Ring Panel */}
        <div className="bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius)] shadow-[var(--shadow)] overflow-hidden">
          <div className="flex items-center justify-between p-3 border-b border-[color-mix(in_srgb,var(--line)_85%,transparent)] bg-[color-mix(in_srgb,var(--panel2)_65%,transparent)] flex-wrap gap-2.5">
            <h2 className="m-0 text-[13px] font-bold">24 小时环形时间（可点击/拖动）</h2>
            <div className="flex gap-2.5 items-center">
              <Button onClick={handleToday}>回到今天</Button>
            </div>
          </div>
          <div className="p-3.5">
            <RingChart />
            <div className="mt-4 flex flex-wrap gap-2">
              {db.taskTypes.list.map((type: any) => (
                <div key={type.id} className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs border border-[var(--line)] bg-[var(--panel2)]">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: type.color }}></div>
                  <span>{type.name}</span>
                </div>
              ))}
            </div>
            <div className="text-[11px] text-[var(--muted)] mt-2.5">
               操作：在环上按下并拖动选择时间段；点击已有色块可编辑；松开填写“做了什么”和类型。
            </div>
          </div>
        </div>

        {/* Right Stack */}
        <div className="grid gap-3.5">
          <CalendarPanel />
          <div className="bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius)] shadow-[var(--shadow)] overflow-hidden">
            <div className="flex items-center justify-between p-3 border-b border-[color-mix(in_srgb,var(--line)_85%,transparent)] bg-[color-mix(in_srgb,var(--panel2)_65%,transparent)]">
              <div className="flex items-center gap-3">
                <h2 className="m-0 text-[13px] font-bold">当天时间轴</h2>
                <div className="flex bg-[var(--panel2)] rounded flex-shrink-0 p-0.5 border border-[var(--line)]">
                  <button 
                    onClick={() => setViewMode('time')} 
                    className={`px-2 py-0.5 text-xs rounded transition-colors ${viewMode === 'time' ? 'bg-[var(--panel)] shadow-sm font-medium' : 'text-[var(--muted)] hover:text-[var(--fg)]'}`}
                  >
                    按时间
                  </button>
                  <button 
                    onClick={() => setViewMode('category')} 
                    className={`px-2 py-0.5 text-xs rounded transition-colors ${viewMode === 'category' ? 'bg-[var(--panel)] shadow-sm font-medium' : 'text-[var(--muted)] hover:text-[var(--fg)]'}`}
                  >
                    按分类
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-xs text-[var(--muted)]">
                  {acts.length > 0 ? `总计：${fmtDuration(totalMin)}` : '—'}
                </div>
                <button 
                  onClick={() => setTimelineSettingsOpen(true)}
                  className="p-1 hover:bg-[var(--panel2)] rounded-md transition-colors"
                  title="设置时间段"
                >
                  <Settings className="w-4 h-4 text-[var(--muted)]" />
                </button>
              </div>
            </div>
            <div className="p-3.5">
              <div className="flex flex-col gap-4">
                {acts.length === 0 && (
                  <div className="text-[var(--muted)] text-sm">暂无记录。可以在左侧环上点击/拖动新增。</div>
                )}
                
                {viewMode === 'time' ? (
                  <>
                    {actsMorning.length > 0 && (
                      <div className="relative">
                        <div className="text-xs font-bold text-[var(--muted)] mb-3 flex items-center gap-2 sticky top-0 bg-[var(--panel)] z-10 py-1">
                           ☀️ 早上 <span className="opacity-60 font-normal">({db.settings?.timeline?.morningStart || '06:00'} - {db.settings?.timeline?.noonStart || '12:00'})</span>
                        </div>
                        {actsMorning.map((seg, idx) => renderAct(seg, idx))}
                      </div>
                    )}
                    
                    {actsNoon.length > 0 && (
                      <div className="relative">
                        <div className="text-xs font-bold text-[var(--muted)] mb-3 flex items-center gap-2 sticky top-0 bg-[var(--panel)] z-10 py-1">
                           🕛 中午 <span className="opacity-60 font-normal">({db.settings?.timeline?.noonStart || '12:00'} - {db.settings?.timeline?.eveningStart || '18:00'})</span>
                        </div>
                        {actsNoon.map((seg, idx) => renderAct(seg, idx))}
                      </div>
                    )}

                    {actsEvening.length > 0 && (
                      <div className="relative">
                        <div className="text-xs font-bold text-[var(--muted)] mb-3 flex items-center gap-2 sticky top-0 bg-[var(--panel)] z-10 py-1">
                           🌙 晚上 <span className="opacity-60 font-normal">({db.settings?.timeline?.eveningStart || '18:00'} - 以后)</span>
                        </div>
                        {actsEvening.map((seg, idx) => renderAct(seg, idx))}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {Object.entries(actsByCategory)
                      .sort(([typeA, actsA], [typeB, actsB]) => {
                        const durA = actsA.reduce((sum, seg) => sum + (seg.endMin - seg.startMin), 0);
                        const durB = actsB.reduce((sum, seg) => sum + (seg.endMin - seg.startMin), 0);
                        return durB - durA; // Sort by total duration descending
                      })
                      .map(([typeId, typeActs]) => {
                        const typeInfo = db.taskTypes.list.find(t => t.id === typeId) || { name: '未分类', color: 'gray' };
                        const totalTypeDur = typeActs.reduce((acc, seg) => acc + (seg.endMin - seg.startMin), 0);
                        return (
                          <div key={typeId} className="relative">
                            <div className="text-xs font-bold mb-3 flex items-center justify-between sticky top-0 bg-[var(--panel)] z-10 py-2 border-b border-dashed border-[var(--line)]">
                               <div className="flex items-center gap-2">
                                 <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: typeInfo.color }}></div>
                                 <span className="text-[var(--fg)]">{typeInfo.name}</span>
                               </div>
                               <span className="opacity-60 font-normal text-[var(--muted)]">共计 {fmtDuration(totalTypeDur)}</span>
                            </div>
                            {typeActs.map((seg, idx) => renderAct(seg, idx))}
                          </div>
                        );
                      })
                    }
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>
      {timelineSettingsOpen && <TimelineSettingsModal onClose={() => setTimelineSettingsOpen(false)} />}
    </div>
  );
}
