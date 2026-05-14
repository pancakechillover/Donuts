import React, { useRef, useEffect, useState } from 'react';
import { useAppStore } from '../lib/store';
import { Button } from '../components/ui/Button';
import { ymd, fmtMinRange, fmtDuration, minToTime, timeToMin, clamp } from '../lib/utils';
import { RingChart } from '../components/RingChart';
import { CalendarPanel } from '../components/CalendarPanel';

export function HomeScreen() {
  const { db, selectedDate, setSelectedDate, getDayData } = useAppStore();
  const dateKey = ymd(selectedDate);
  const todaysData = getDayData(dateKey);
  
  const handleToday = () => {
    setSelectedDate(new Date(new Date().setHours(0,0,0,0)));
  };

  const acts = [...todaysData.activities].sort((a,b) => a.startMin - b.startMin);
  const totalMin = acts.reduce((acc, seg) => acc + (seg.endMin - seg.startMin), 0);

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
            <div className="text-[11px] text-[var(--muted)] mt-2.5">
               操作：在环上按下并拖动选择时间段；松开后填写“做了什么”和“任务类型”。轻点默认 30 分钟。
            </div>
          </div>
        </div>

        {/* Right Stack */}
        <div className="grid gap-3.5">
          <CalendarPanel />
          <div className="bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius)] shadow-[var(--shadow)] overflow-hidden">
            <div className="flex items-center justify-between p-3 border-b border-[color-mix(in_srgb,var(--line)_85%,transparent)] bg-[color-mix(in_srgb,var(--panel2)_65%,transparent)]">
              <h2 className="m-0 text-[13px] font-bold">当天时间轴</h2>
              <div className="text-xs text-[var(--muted)]">
                {acts.length > 0 ? `总记录时长：${fmtDuration(totalMin)}` : '—'}
              </div>
            </div>
            <div className="p-3.5">
              <div className="flex flex-col gap-2.5">
                {acts.length === 0 ? (
                  <div className="text-[var(--muted)] text-sm">暂无记录。可以在左侧环上点击/拖动新增。</div>
                ) : (
                  acts.map((seg, idx) => {
                    const dur = seg.endMin - seg.startMin;
                    const typeInfo = db.taskTypes.list.find(t => t.id === seg.typeId) || { name: '未分类', color: 'gray' };
                    return (
                      <div key={idx} className="border border-[var(--line)] bg-[color-mix(in_srgb,var(--panel2)_62%,transparent)] rounded-xl overflow-hidden cursor-pointer transition-all duration-140 hover:-translate-y-px hover:bg-[color-mix(in_srgb,var(--panel2)_84%,transparent)]">
                        <div className="h-1.5" style={{ background: typeInfo.color }}></div>
                        <div className="p-2.5">
                          <div className="flex justify-between items-baseline gap-2.5">
                            <b className="text-xs font-bold">{seg.label || "未命名"}</b>
                            <span className="text-[11px] text-[var(--muted)]">{fmtMinRange(seg.startMin, seg.endMin)}</span>
                          </div>
                          <div className="text-[11px] text-[var(--muted)] mt-1.5 flex justify-between gap-2.5">
                            <span>类型：{typeInfo.name}</span>
                            <span>时长：{fmtDuration(dur)}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
