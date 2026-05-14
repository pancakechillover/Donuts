import React, { useState, useEffect } from 'react';
import { useAppStore } from '../lib/store';
import { Button } from '../components/ui/Button';
import { ymd, parseYMD, fmtDuration, minutesBetween, timeToMin, minToTime } from '../lib/utils';
import { SleepChart } from '../components/SleepChart';
import { SleepTimelineChart } from '../components/SleepTimelineChart';

export function SleepScreen() {
  const { db, selectedDate, setSelectedDate, getDayData, updateDayData } = useAppStore();
  const dateKey = ymd(selectedDate);
  const sleepData = getDayData(dateKey).sleep;

  const [wakeMin, setWakeMin] = useState(7 * 60 + 30);
  const [bedMin, setBedMin] = useState(23 * 60 + 30);

  useEffect(() => {
    setWakeMin(timeToMin(sleepData.wake) ?? (7 * 60 + 30));
    setBedMin(timeToMin(sleepData.bed) ?? (23 * 60 + 30));
  }, [sleepData.wake, sleepData.bed]);

  const handleSave = () => {
    updateDayData(dateKey, {
      sleep: { wake: minToTime(wakeMin), bed: minToTime(bedMin) }
    });
  };

  const handleClear = () => {
    if (!confirm(`确定清空 ${dateKey} 的起床与入睡记录吗？`)) return;
    updateDayData(dateKey, { sleep: { wake: "", bed: "" } });
  };

  const handleToday = () => {
    setSelectedDate(new Date(new Date().setHours(0,0,0,0)));
  };

  const DurString = fmtDuration(minutesBetween(bedMin, wakeMin));

  const recent = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
      const k = ymd(d);
      const sl = db.days[k]?.sleep || {wake:"", bed:""};
      const dd = minutesBetween(timeToMin(sl.bed), timeToMin(sl.wake));
      if (dd != null) recent.push({ k, dur: dd, bed: timeToMin(sl.bed), wake: timeToMin(sl.wake) });
  }

  let avg7 = "—";
  let avgTime = "—";
  if (recent.length > 0) {
      const avgD = Math.round(recent.reduce((a, b) => a + b.dur, 0) / recent.length);
      avg7 = fmtDuration(avgD);
      const avgB = Math.round(recent.reduce((a, b) => a + (b.bed ?? 0), 0) / recent.length);
      const avgW = Math.round(recent.reduce((a, b) => a + (b.wake ?? 0), 0) / recent.length);
      avgTime = `${minToTime(avgW)} / ${minToTime(avgB)}`;
  }

  const handleStep = (setter: React.Dispatch<React.SetStateAction<number>>, delta: number) => {
    setter(v => ((v + delta + 1440) % 1440));
  };

  return (
    <div className="grid gap-3.5 mt-4">
      <div className="bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius)] shadow-[var(--shadow)] overflow-hidden">
        <div className="flex items-center justify-between p-3 border-b border-[color-mix(in_srgb,var(--line)_85%,transparent)] bg-[color-mix(in_srgb,var(--panel2)_65%,transparent)]">
          <h2 className="m-0 text-[13px] font-bold">记录起床与入睡时间（记得按保存）</h2>
          <div className="flex gap-2">
            <Button onClick={handleToday}>回到今天</Button>
            <Button variant="danger" onClick={handleClear}>清空当日</Button>
          </div>
        </div>
        <div className="p-3.5">
          <div className="flex justify-between items-end">
            <div>
              <div className="text-xs text-[var(--muted)]">当前日期</div>
              <div className="text-base">{dateKey}</div>
            </div>
            <div className="flex gap-2">
               <Button onClick={() => setSelectedDate(new Date(selectedDate.getTime() - 86400000))}>前一天</Button>
               <Button onClick={() => setSelectedDate(new Date(selectedDate.getTime() + 86400000))}>后一天</Button>
            </div>
          </div>

          <div className="h-[1px] bg-[color-mix(in_srgb,var(--line)_85%,transparent)] my-3"></div>

          <div className="grid md:grid-cols-2 gap-3 items-stretch">
             
             {/* Wake Up */}
             <div className="border border-[var(--line)] bg-[color-mix(in_srgb,var(--panel2)_62%,transparent)] rounded-2xl p-3 flex flex-col gap-2.5">
                <div>
                   <div className="text-xs font-semibold">起床时间</div>
                   <div className="text-[11px] text-[var(--muted)]">步进 5 分钟</div>
                </div>
                <div className="grid grid-cols-[1fr_54px] gap-2.5 items-center">
                   <div className="border border-[var(--line)] bg-[color-mix(in_srgb,var(--bg2)_65%,transparent)] rounded-2xl text-[30px] tracking-wide text-center select-none shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--line)_35%,transparent)] h-full flex items-center justify-center py-3.5">
                     {minToTime(wakeMin)}
                   </div>
                   <div className="flex flex-col gap-2">
                     <button className="border border-[var(--line)] bg-[color-mix(in_srgb,var(--panel2)_68%,transparent)] rounded-xl h-11 flex items-center justify-center select-none text-base transition-all duration-140 hover:-translate-y-px hover:bg-[color-mix(in_srgb,var(--panel2)_88%,transparent)] active:translate-y-0 active:opacity-90" onClick={() => handleStep(setWakeMin, 5)}>▲</button>
                     <button className="border border-[var(--line)] bg-[color-mix(in_srgb,var(--panel2)_68%,transparent)] rounded-xl h-11 flex items-center justify-center select-none text-base transition-all duration-140 hover:-translate-y-px hover:bg-[color-mix(in_srgb,var(--panel2)_88%,transparent)] active:translate-y-0 active:opacity-90" onClick={() => handleStep(setWakeMin, -5)}>▼</button>
                   </div>
                </div>
             </div>
             
             {/* Bed Time */}
             <div className="border border-[var(--line)] bg-[color-mix(in_srgb,var(--panel2)_62%,transparent)] rounded-2xl p-3 flex flex-col gap-2.5">
                <div>
                   <div className="text-xs font-semibold">入睡时间</div>
                   <div className="text-[11px] text-[var(--muted)]">跨天请仍然计为当日晚睡</div>
                </div>
                <div className="grid grid-cols-[1fr_54px] gap-2.5 items-center">
                   <div className="border border-[var(--line)] bg-[color-mix(in_srgb,var(--bg2)_65%,transparent)] rounded-2xl text-[30px] tracking-wide text-center select-none shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--line)_35%,transparent)] h-full flex items-center justify-center py-3.5">
                     {minToTime(bedMin)}
                   </div>
                   <div className="flex flex-col gap-2">
                     <button className="border border-[var(--line)] bg-[color-mix(in_srgb,var(--panel2)_68%,transparent)] rounded-xl h-11 flex items-center justify-center select-none text-base transition-all duration-140 hover:-translate-y-px hover:bg-[color-mix(in_srgb,var(--panel2)_88%,transparent)] active:translate-y-0 active:opacity-90" onClick={() => handleStep(setBedMin, 5)}>▲</button>
                     <button className="border border-[var(--line)] bg-[color-mix(in_srgb,var(--panel2)_68%,transparent)] rounded-xl h-11 flex items-center justify-center select-none text-base transition-all duration-140 hover:-translate-y-px hover:bg-[color-mix(in_srgb,var(--panel2)_88%,transparent)] active:translate-y-0 active:opacity-90" onClick={() => handleStep(setBedMin, -5)}>▼</button>
                   </div>
                </div>
             </div>
          </div>

          <div className="flex justify-end mt-3">
             <Button variant="primary" onClick={handleSave}>保存</Button>
          </div>

          <div className="grid md:grid-cols-3 gap-2.5 mt-3.5">
             <div className="border border-[var(--line)] bg-[color-mix(in_srgb,var(--panel2)_62%,transparent)] rounded-2xl p-2.5">
               <div className="text-xs text-[var(--muted)]">当日睡眠时长（估算）</div>
               <div className="text-lg mt-1.5">{DurString}</div>
             </div>
             <div className="border border-[var(--line)] bg-[color-mix(in_srgb,var(--panel2)_62%,transparent)] rounded-2xl p-2.5">
               <div className="text-xs text-[var(--muted)]">最近 7 天平均睡眠时长</div>
               <div className="text-lg mt-1.5">{avg7}</div>
             </div>
             <div className="border border-[var(--line)] bg-[color-mix(in_srgb,var(--panel2)_62%,transparent)] rounded-2xl p-2.5">
               <div className="text-xs text-[var(--muted)]">最近 7 天平均起床 / 入睡</div>
               <div className="text-lg mt-1.5">{avgTime}</div>
             </div>
          </div>

          <div className="h-[1px] bg-[color-mix(in_srgb,var(--line)_85%,transparent)] my-4"></div>

          <div className="bg-transparent mb-1">
             <h2 className="m-0 text-[13px] font-bold">统计图（最近 14 天睡眠时长）</h2>
             <div className="text-xs text-[var(--muted)] mt-0.5">仅统计已填写起床与入睡时间的日期</div>
          </div>
          <div className="mb-4">
             <SleepChart />
          </div>

          <div className="bg-transparent mb-1 mt-6">
             <h2 className="m-0 text-[13px] font-bold">入睡/起床时间趋势（最近 14 天）</h2>
             <div className="text-xs text-[var(--muted)] mt-0.5">横轴为日期，纵轴为小时，黄色=起床，紫色=入睡</div>
          </div>
          <div>
             <SleepTimelineChart />
          </div>

        </div>
      </div>
    </div>
  );
}
