import React, { useState } from 'react';
import { useAppStore } from '../lib/store';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { ymd, parseYMD } from '../lib/utils';
import { HabitChart } from '../components/HabitChart';

export function HabitsScreen() {
  const { db, updateDb } = useAppStore();
  const habits = db.habits.list;
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(habits[0]?.id || null);
  const [cycleOffset, setCycleOffset] = useState<number>(0);
  const [isAdding, setIsAdding] = useState(false);

  const [newHabitName, setNewHabitName] = useState("");
  const [newHabitStart, setNewHabitStart] = useState(ymd(new Date()));

  const handleAddHabit = () => {
    if (!newHabitName.trim()) return alert("请填写习惯名称");
    const id = "h_" + Math.random().toString(16).slice(2) + Date.now().toString(16);
    
    const newDb = { ...db };
    newDb.habits.list.push({ id, name: newHabitName.trim(), cycleStart: newHabitStart, created: ymd(new Date()) });
    newDb.habits.records[id] = {};
    updateDb(newDb);
    
    setIsAdding(false);
    setSelectedHabitId(id);
    setCycleOffset(0);
    setNewHabitName("");
  };

  const selectedHabit = habits.find(h => h.id === selectedHabitId);

  const getCycleStartForDate = (habit: any, dateObj: Date) => {
    const base = parseYMD(habit.cycleStart);
    const d0 = new Date(base.getFullYear(), base.getMonth(), base.getDate());
    const d1 = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
    const diffDays = Math.floor((d1.getTime() - d0.getTime()) / 86400000);
    const k = Math.floor(diffDays / 10);
    const cycleStartDate = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate() + k * 10);
    return ymd(cycleStartDate);
  };

  const getCycleKey = (habit: any) => {
    const baseCycle = getCycleStartForDate(habit, new Date());
    const base = parseYMD(baseCycle);
    const cur = new Date(base.getFullYear(), base.getMonth(), base.getDate() + cycleOffset * 10);
    return ymd(cur);
  };

  const ensureCycleRecord = (habitId: string, cycleKey: string) => {
    if (!db.habits.records[habitId]) db.habits.records[habitId] = {};
    if (!db.habits.records[habitId][cycleKey]) db.habits.records[habitId][cycleKey] = Array(10).fill(false);
    return db.habits.records[habitId][cycleKey];
  };

  const calcStreak = (habit: any) => {
    let streak = 0;
    const today = new Date();
    for (let back = 0; back < 60; back++) {
        const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - back);
        const cycleKey = getCycleStartForDate(habit, d);
        const cur = parseYMD(cycleKey);
        const idx = Math.floor((d.getTime() - cur.getTime()) / 86400000);
        const rec = ensureCycleRecord(habit.id, cycleKey);
        const ok = (idx >= 0 && idx < 10) ? !!rec[idx] : false;
        if (ok) streak++;
        else break;
    }
    return String(streak);
  };

  const toggleSlot = (idx: number) => {
    if (!selectedHabit) return;
    const cycleKey = getCycleKey(selectedHabit);
    
    const newDb = JSON.parse(JSON.stringify(db)); // Deep copy to be safe
    if (!newDb.habits.records[selectedHabit.id]) newDb.habits.records[selectedHabit.id] = {};
    if (!newDb.habits.records[selectedHabit.id][cycleKey]) newDb.habits.records[selectedHabit.id][cycleKey] = Array(10).fill(false);
    
    newDb.habits.records[selectedHabit.id][cycleKey][idx] = !newDb.habits.records[selectedHabit.id][cycleKey][idx];
    updateDb(newDb);
  };

  const handleDelete = () => {
    if (!selectedHabit) return;
    if (!confirm(`确定删除习惯「${selectedHabit.name}」及其全部记录吗？`)) return;
    const newDb = { ...db };
    newDb.habits.list = newDb.habits.list.filter(h => h.id !== selectedHabit.id);
    delete newDb.habits.records[selectedHabit.id];
    updateDb(newDb);
    setSelectedHabitId(newDb.habits.list[0]?.id || null);
    setCycleOffset(0);
  };

  let boxes = [];
  let cycleKey = '';
  let startDate = new Date();
  if (selectedHabit) {
    cycleKey = getCycleKey(selectedHabit);
    startDate = parseYMD(cycleKey);
    const record = ensureCycleRecord(selectedHabit.id, cycleKey);
    for (let i = 0; i < 10; i++) {
        const day = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + i);
        const on = !!record[i];
        boxes.push({ i, dayKey: ymd(day), on });
    }
  }

  const doneCycle = boxes.filter(b => b.on).length;
  
  let rate = 0;
  if(selectedHabit) {
    let totalSlots = 0, totalDone = 0;
    Object.values(db.habits.records[selectedHabit.id] || {}).forEach((arr) => {
        const booleanArr = arr as boolean[];
        totalSlots += booleanArr.length;
        totalDone += booleanArr.filter(Boolean).length;
    });
    rate = totalSlots ? Math.round((totalDone / totalSlots) * 100) : 0;
  }

  const colors = ["#7aa2ff", "#46d39a", "#ffcc66", "#ff6b6b", "#a78bfa"];

  return (
    <div className="grid lg:grid-cols-[420px_1fr] gap-3.5 mt-4 items-start">
      <div className="bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius)] shadow-[var(--shadow)] overflow-hidden">
        <div className="flex items-center justify-between p-3 border-b border-[color-mix(in_srgb,var(--line)_85%,transparent)] bg-[color-mix(in_srgb,var(--panel2)_65%,transparent)]">
          <h2 className="m-0 text-[13px] font-bold">习惯列表</h2>
          <Button variant="primary" onClick={() => setIsAdding(true)}>新增习惯</Button>
        </div>
        <div className="p-3.5 flex flex-col gap-3">
          <div className="flex flex-col gap-2.5">
            {habits.length === 0 ? (
              <div className="text-[var(--muted)] text-sm">暂无习惯。点击“新增习惯”开始。</div>
            ) : (
              habits.map((h, i) => (
                <div 
                  key={h.id} 
                  className={`border border-[var(--line)] bg-[color-mix(in_srgb,var(--panel2)_62%,transparent)] rounded-[14px] p-2.5 flex justify-between items-center cursor-pointer transition-all duration-140 hover:-translate-y-px hover:bg-[color-mix(in_srgb,var(--panel2)_84%,transparent)] ${h.id === selectedHabitId ? 'border-[color-mix(in_srgb,var(--accent)_58%,var(--line))] bg-[color-mix(in_srgb,var(--accent)_12%,var(--panel2))]' : ''}`}
                  onClick={() => { setSelectedHabitId(h.id); setCycleOffset(0); }}
                >
                  <div>
                    <div className="text-xs font-bold">{h.name}</div>
                    <div className="text-[11px] text-[var(--muted)] mt-0.5">起始：{h.cycleStart} · 10 天循环</div>
                  </div>
                  <div className="w-3.5 h-3.5 rounded-full" style={{ background: colors[i % 5] }}></div>
                </div>
              ))
            )}
          </div>
          <div className="h-[1px] bg-[color-mix(in_srgb,var(--line)_85%,transparent)] mt-2"></div>
          <div className="text-[11px] text-[var(--muted)]">每个习惯以 10 天为一个循环。可切换循环查看/勾选完成情况。</div>
        </div>
      </div>

      <div className="bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius)] shadow-[var(--shadow)] overflow-hidden">
        <div className="flex items-center justify-between p-3 border-b border-[color-mix(in_srgb,var(--line)_85%,transparent)] bg-[color-mix(in_srgb,var(--panel2)_65%,transparent)] flex-wrap gap-2.5">
          <h2 className="m-0 text-[13px] font-bold">{selectedHabit ? `${selectedHabit.name}（循环起始：${cycleKey}）` : '请选择一个习惯'}</h2>
          {selectedHabit && (
            <div className="flex gap-2">
              <Button onClick={() => setCycleOffset(v => v - 1)}>上一个循环</Button>
              <Button onClick={() => setCycleOffset(v => v + 1)}>下一个循环</Button>
              <Button variant="danger" onClick={handleDelete}>删除</Button>
            </div>
          )}
        </div>
        <div className="p-3.5 flex flex-col gap-3">
          {!selectedHabit ? (
            <div className="text-[var(--muted)] text-sm">选择一个习惯后，这里会出现 10 个方框供你打钩。</div>
          ) : (
            <>
              <div className="text-[var(--muted)] text-xs">点击方框打钩/取消（每个方框代表循环中的一天）。悬停可看日期。</div>
              <div className="grid grid-cols-5 md:grid-cols-10 gap-2 mt-2.5">
                {boxes.map((b) => (
                  <div 
                    key={b.i}
                    onClick={() => toggleSlot(b.i)}
                    title={b.dayKey}
                    className={`border border-[var(--line)] rounded-xl py-3 text-center cursor-pointer select-none text-xs transition-all duration-140 hover:-translate-y-px hover:bg-[color-mix(in_srgb,var(--panel2)_82%,transparent)] ${b.on ? 'border-[color-mix(in_srgb,var(--good)_58%,var(--line))] bg-[color-mix(in_srgb,var(--good)_12%,var(--panel2))]' : 'bg-[color-mix(in_srgb,var(--panel2)_62%,transparent)]'}`}
                  >
                    {b.i + 1}
                  </div>
                ))}
              </div>

              <div className="grid md:grid-cols-3 gap-2.5 mt-2.5">
                <div className="border border-[var(--line)] bg-[color-mix(in_srgb,var(--panel2)_62%,transparent)] rounded-[14px] p-2.5">
                  <div className="text-xs text-[var(--muted)]">当前循环完成</div>
                  <div className="text-lg mt-1.5">{doneCycle} / 10</div>
                </div>
                <div className="border border-[var(--line)] bg-[color-mix(in_srgb,var(--panel2)_62%,transparent)] rounded-[14px] p-2.5">
                  <div className="text-xs text-[var(--muted)]">总体完成率</div>
                  <div className="text-lg mt-1.5">{rate}%</div>
                </div>
                <div className="border border-[var(--line)] bg-[color-mix(in_srgb,var(--panel2)_62%,transparent)] rounded-[14px] p-2.5">
                  <div className="text-xs text-[var(--muted)]">连续完成天数</div>
                  <div className="text-lg mt-1.5">{calcStreak(selectedHabit)}</div>
                </div>
              </div>

              <div className="h-[1px] bg-[color-mix(in_srgb,var(--line)_85%,transparent)] my-3"></div>

              <div className="bg-transparent mb-1">
                 <h2 className="m-0 text-[13px] font-bold">历史趋势</h2>
                 <div className="text-xs text-[var(--muted)] mt-0.5">从今天起，过去10天</div>
              </div>
              <HabitChart habit={selectedHabit} getCycleStartForDate={getCycleStartForDate} ensureCycleRecord={ensureCycleRecord} />
            </>
          )}
        </div>
      </div>

      {isAdding && (
         <Modal title="新增习惯" onClose={() => setIsAdding(false)} footer={<Button variant="primary" onClick={handleAddHabit}>创建</Button>}>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-[var(--muted)] text-xs">习惯名称</label>
                <input 
                  type="text" 
                  autoFocus
                  className="w-full mt-1.5 p-2.5 rounded-xl border border-[var(--line)] bg-[color-mix(in_srgb,var(--panel2)_62%,transparent)] text-[var(--text)] outline-none"
                  value={newHabitName}
                  onChange={e => setNewHabitName(e.target.value)}
                  placeholder="例如：早睡、背单词、跑步…"
                 />
              </div>
              <div>
                <label className="text-[var(--muted)] text-xs">循环起始日期</label>
                <input 
                  type="date" 
                  className="w-full mt-1.5 p-2.5 rounded-xl border border-[var(--line)] bg-[color-mix(in_srgb,var(--panel2)_62%,transparent)] text-[var(--text)] outline-none"
                  value={newHabitStart}
                  onChange={e => setNewHabitStart(e.target.value)}
                 />
              </div>
            </div>
         </Modal>
      )}

    </div>
  );
}
