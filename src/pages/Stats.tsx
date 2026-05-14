import React, { useState, useMemo } from 'react';
import { useAppStore } from '../lib/store';
import { Button } from '../components/ui/Button';
import { ymd, parseYMD, fmtDuration } from '../lib/utils';
import { StatsBarChart } from '../components/StatsBarChart';
import { StatsPieChart } from '../components/StatsPieChart';

export function StatsScreen() {
  const { db, selectedDate, setSelectedDate, getCombinedActivities } = useAppStore();
  const [statsMode, setStatsMode] = useState<'byday' | 'bycat'>('byday');
  const [statsRange, setStatsRange] = useState<number>(14);
  const [statsCategory, setStatsCategory] = useState<string>('uncat');
  
  const statsDayKey = ymd(selectedDate);
  const todaysActs = getCombinedActivities(statsDayKey);

  const rangeDays = useMemo(() => {
    const arr = [];
    const today = new Date();
    for (let i = statsRange - 1; i >= 0; i--) {
      arr.push(ymd(new Date(today.getFullYear(), today.getMonth(), today.getDate() - i)));
    }
    return arr;
  }, [statsRange]);

  const selectedCategoryName = db.taskTypes.list.find(t => t.id === statsCategory)?.name || "未分类";

  return (
    <div className="grid lg:grid-cols-[390px_1fr] gap-3.5 mt-4 items-start">
      <div className="bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius)] shadow-[var(--shadow)] overflow-hidden">
        <div className="flex items-center justify-between p-3 border-b border-[color-mix(in_srgb,var(--line)_85%,transparent)] bg-[color-mix(in_srgb,var(--panel2)_65%,transparent)]">
          <div>
             <h2 className="m-0 text-[13px] font-bold">统计设置</h2>
             <div className="text-xs text-[var(--muted)] mt-0.5">活动来自主页面“任务类型”</div>
          </div>
        </div>
        <div className="p-3.5 flex flex-col gap-3">
          
          <div>
            <div className="text-[var(--muted)] text-xs mb-1.5">统计模式</div>
            <div className="flex gap-2 flex-wrap">
              <div 
                className={`border border-[var(--line)] px-2.5 py-1.5 rounded-full text-xs cursor-pointer select-none transition-all duration-140 hover:-translate-y-px ${statsMode === 'byday' ? 'border-[color-mix(in_srgb,var(--accent)_58%,var(--line))] bg-[color-mix(in_srgb,var(--accent)_14%,var(--panel2))]' : 'bg-[color-mix(in_srgb,var(--panel2)_60%,transparent)]'}`}
                onClick={() => setStatsMode('byday')}
              >按天</div>
              <div 
                className={`border border-[var(--line)] px-2.5 py-1.5 rounded-full text-xs cursor-pointer select-none transition-all duration-140 hover:-translate-y-px ${statsMode === 'bycat' ? 'border-[color-mix(in_srgb,var(--accent)_58%,var(--line))] bg-[color-mix(in_srgb,var(--accent)_14%,var(--panel2))]' : 'bg-[color-mix(in_srgb,var(--panel2)_60%,transparent)]'}`}
                onClick={() => setStatsMode('bycat')}
              >按类别</div>
            </div>
          </div>

          <div className="h-[1px] bg-[color-mix(in_srgb,var(--line)_85%,transparent)] my-1"></div>

          <div className="flex flex-col gap-2">
            <div className="text-[var(--muted)] text-xs">时间范围</div>
            <select 
               className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[color-mix(in_srgb,var(--panel2)_62%,transparent)] text-[var(--text)] outline-none"
               value={statsRange}
               onChange={e => setStatsRange(Number(e.target.value))}
            >
              <option value="7">最近 7 天</option>
              <option value="14">最近 14 天</option>
              <option value="30">最近 30 天</option>
            </select>

            <div className="text-[var(--muted)] text-xs mt-2">（按天模式）选择任务类别</div>
            <select 
               className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[color-mix(in_srgb,var(--panel2)_62%,transparent)] text-[var(--text)] outline-none"
               value={statsCategory}
               onChange={e => setStatsCategory(e.target.value)}
            >
              {db.taskTypes.list.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div className="h-[1px] bg-[color-mix(in_srgb,var(--line)_85%,transparent)] mt-2"></div>

          <div>
             <div className="text-[var(--muted)] text-xs mb-2">（按天模式）饼图日期</div>
             <div className="flex justify-between items-center bg-[color-mix(in_srgb,var(--panel2)_62%,transparent)] border border-[var(--line)] rounded-xl py-1.5 px-2">
                <button className="text-xs hover:text-[var(--accent)] px-2" onClick={() => {
                   const d = parseYMD(statsDayKey);
                   setSelectedDate(new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1));
                }}>前一天</button>
                <div className="text-sm font-semibold">{statsDayKey}</div>
                <button className="text-xs hover:text-[var(--accent)] px-2" onClick={() => {
                   const d = parseYMD(statsDayKey);
                   setSelectedDate(new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1));
                }}>后一天</button>
             </div>
             
             <div className="flex justify-end gap-2 mt-3">
                <Button onClick={() => setSelectedDate(selectedDate)}>恢复当前选中</Button>
             </div>
          </div>
          
          <div className="h-[1px] bg-[color-mix(in_srgb,var(--line)_85%,transparent)] mt-1"></div>

          <div>
            <div className="text-[var(--muted)] text-xs mb-2">图例</div>
            <div className="flex flex-wrap gap-2 items-center">
               {db.taskTypes.list.map(t => (
                 <div key={t.id} className="flex items-center gap-1.5 text-xs text-[var(--muted)] border border-[var(--line)] bg-[color-mix(in_srgb,var(--panel2)_62%,transparent)] rounded-full px-2.5 py-1.5">
                   <span className="w-2.5 h-2.5 rounded-full" style={{ background: t.color }}></span>
                   {t.name}
                 </div>
               ))}
            </div>
          </div>

        </div>
      </div>

      <div className="grid gap-3.5">
        <div className="bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius)] shadow-[var(--shadow)] overflow-hidden">
          <div className="flex items-center justify-between p-3 border-b border-[color-mix(in_srgb,var(--line)_85%,transparent)] bg-[color-mix(in_srgb,var(--panel2)_65%,transparent)]">
            <div>
              <h2 className="m-0 text-[13px] font-bold">{statsMode === 'byday' ? '按天统计（某一类任务）' : '按类别统计（区间汇总）'}</h2>
              <div className="text-xs text-[var(--muted)] mt-0.5">
                {statsMode === 'byday' 
                  ? `类别：${selectedCategoryName} · 点击柱子可切换饼图日期`
                  : `范围：近 ${statsRange} 天（下方饼图仍显示选中日）`
                }
              </div>
            </div>
          </div>
          <div className="p-3.5">
            <StatsBarChart 
               mode={statsMode} 
               rangeDays={rangeDays} 
               typeId={statsCategory} 
               statsDayKey={statsDayKey} 
               onBarClick={(dayK) => setSelectedDate(parseYMD(dayK))}
            />
          </div>
        </div>

        <div className="bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius)] shadow-[var(--shadow)] overflow-hidden">
          <div className="flex items-center justify-between p-3 border-b border-[color-mix(in_srgb,var(--line)_85%,transparent)] bg-[color-mix(in_srgb,var(--panel2)_65%,transparent)]">
            <div>
               <h2 className="m-0 text-[13px] font-bold">当日类别分布（{statsDayKey}）</h2>
               <div className="text-xs text-[var(--muted)] mt-0.5">
                 {todaysActs.length > 0 
                  ? `总记录：${fmtDuration(todaysActs.reduce((s,a)=>s+(a.endMin-a.startMin),0))}（不含空白时间）`
                  : '当日暂无活动记录'
                 }
               </div>
            </div>
          </div>
          <div className="p-3.5">
            <StatsPieChart dayKey={statsDayKey} />
          </div>
        </div>
      </div>
    </div>
  );
}
