import React, { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { useAppStore } from '../lib/store';
import { ymd, timeToMin, minToTime, clamp } from '../lib/utils';
import { ActivitySegment } from '../lib/types';
import { TypesManageModal } from './TypesManageModal';

interface ActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialRange: { startMin: number, endMin: number };
  editingIndex: number | null;
}

export function ActivityModal({ isOpen, onClose, initialRange, editingIndex }: ActivityModalProps) {
  const { db, updateDb, selectedDate, getDayData, getCombinedActivities } = useAppStore();
  
  const dateKey = ymd(selectedDate);
  const todaysData = getDayData(dateKey);
  const acts = getCombinedActivities(dateKey);

  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [label, setLabel] = useState("");
  const [typeId, setTypeId] = useState("uncat");
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<'daily'|'weekly'|'monthly'|'yearly'>('daily');

  const [manageModalOpen, setManageModalOpen] = useState(false);

  useEffect(() => {
    if (editingIndex != null && acts[editingIndex]) {
      const seg = acts[editingIndex];
      setStart(minToTime(seg.startMin));
      setEnd(minToTime(seg.endMin));
      setLabel(seg.label);
      setTypeId(seg.typeId);
      setIsRecurring(!!seg.isRecurring);
      if (seg.isRecurring && seg.recurringId && db.recurringTasks?.list) {
        const rt = db.recurringTasks.list.find(t => t.id === seg.recurringId);
        if (rt) setFrequency(rt.frequency);
      }
    } else {
      setStart(minToTime(initialRange.startMin));
      setEnd(minToTime(initialRange.endMin));
      setLabel("");
      setTypeId("uncat");
      setIsRecurring(false);
      setFrequency('daily');
    }
  }, [editingIndex, initialRange, acts, db.recurringTasks]);

  const handleSave = () => {
    const s = timeToMin(start);
    const e = timeToMin(end);
    if (s == null || e == null) return alert("请填写开始与结束时间");
    if (e <= s) return alert("结束时间需要晚于开始时间（不跨天）。如需跨天，请拆成两段记录。");
    if (!label.trim()) return alert("请填写活动名称");

    const newDb = { ...db };
    const newActs = [...todaysData.activities];

    if (isRecurring) {
      if (!newDb.recurringTasks) newDb.recurringTasks = { list: [] };
      let rtId = editingIndex != null && acts[editingIndex]?.recurringId 
                 ? acts[editingIndex].recurringId! 
                 : Math.random().toString(36).substring(2, 9);
      
      const rtList = [...newDb.recurringTasks.list];
      const rtIdx = rtList.findIndex(t => t.id === rtId);
      const rtObj = {
        id: rtId, startMin: s, endMin: e, label: label.trim(), typeId, frequency, startDate: dateKey
      };
      if (rtIdx >= 0) rtList[rtIdx] = rtObj;
      else rtList.push(rtObj);
      newDb.recurringTasks.list = rtList;

      if (editingIndex != null && !acts[editingIndex].isRecurring) {
         const normIdx = newActs.findIndex(a => a.startMin === acts[editingIndex].startMin && a.endMin === acts[editingIndex].endMin && a.label === acts[editingIndex].label);
         if(normIdx >= 0) newActs.splice(normIdx, 1);
      }
    } else {
      const seg: ActivitySegment = { startMin: s, endMin: e, label: label.trim(), typeId };
      if (editingIndex != null) {
        if (acts[editingIndex].isRecurring) {
          if (newDb.recurringTasks) {
             const rtId = acts[editingIndex].recurringId;
             newDb.recurringTasks.list = newDb.recurringTasks.list.filter(t => t.id !== rtId);
          }
          newActs.push(seg);
        } else {
          const normIdx = newActs.findIndex(a => a.startMin === acts[editingIndex].startMin && a.endMin === acts[editingIndex].endMin && a.label === acts[editingIndex].label);
          if(normIdx >= 0) newActs[normIdx] = seg;
        }
      } else {
        newActs.push(seg);
      }
    }
    
    newActs.sort((a,b) => a.startMin - b.startMin);
    newDb.days[dateKey] = { ...todaysData, activities: newActs };
    updateDb(newDb);
    onClose();
  };

  const handleDelete = () => {
    if (editingIndex == null) return;
    const newDb = { ...db };
    const act = acts[editingIndex];

    if (act.isRecurring && act.recurringId) {
       if (newDb.recurringTasks) {
         newDb.recurringTasks.list = newDb.recurringTasks.list.filter(t => t.id !== act.recurringId);
       }
    } else {
       const newActs = [...todaysData.activities];
       const normIdx = newActs.findIndex(a => a.startMin === act.startMin && a.endMin === act.endMin && a.label === act.label);
       if (normIdx >= 0) {
         newActs.splice(normIdx, 1);
         newDb.days[dateKey] = { ...todaysData, activities: newActs };
       }
    }
    
    updateDb(newDb);
    onClose();
  };

  const selectedType = db.taskTypes.list.find(t => t.id === typeId) || db.taskTypes.list[0];

  return (
    <Modal
      title={editingIndex != null ? "编辑活动" : "记录活动"}
      onClose={onClose}
      footer={
        <>
          {editingIndex != null && <Button variant="danger" onClick={handleDelete}>删除</Button>}
          <Button onClick={onClose}>取消</Button>
          <Button variant="primary" onClick={handleSave}>保存</Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-[var(--muted)]">开始时间</label>
            <input 
              type="time" 
              step="300"
              className="w-full mt-1.5 p-2.5 rounded-md border border-[var(--line)] bg-[var(--panel2)] text-[var(--text)] outline-none"
              value={start}
              onChange={e => setStart(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-[var(--muted)]">结束时间</label>
            <input 
              type="time" 
              step="300"
              className="w-full mt-1.5 p-2.5 rounded-md border border-[var(--line)] bg-[var(--panel2)] text-[var(--text)] outline-none"
              value={end}
              onChange={e => setEnd(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-[var(--muted)]">活动名称</label>
          <div className="flex gap-2 items-center justify-start py-2.5 px-0">
            <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ background: selectedType.color }}></span>
            <span className="text-[13px] text-[var(--muted)] whitespace-nowrap min-w-[40px]">{selectedType.name}</span>
            <input 
              type="text" 
              placeholder="例如：学习、运动、吃饭、休息…"
              className="flex-1 ml-2.5 p-2.5 rounded-md border border-[var(--line)] bg-[var(--panel2)] text-[var(--text)] outline-none"
              value={label}
              onChange={e => setLabel(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-[var(--muted)]">任务类型</label>
          <div className="flex gap-2 items-center mt-1.5 flex-wrap">
            <select 
              className="flex-1 min-w-[200px] p-2.5 rounded-md border border-[var(--line)] bg-[var(--panel2)] text-[var(--text)] outline-none"
              value={typeId}
              onChange={e => setTypeId(e.target.value)}
            >
              {db.taskTypes.list.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <Button onClick={(e) => { e.preventDefault(); setManageModalOpen(true); }} className="whitespace-nowrap">☰ 管理分类</Button>
          </div>
        </div>

        <div className="mt-2 p-3 bg-[var(--panel2)] border border-[var(--line)] rounded-xl flex flex-col gap-3">
          <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
            <input 
              type="checkbox" 
              className="w-4 h-4 rounded border-[var(--line)] text-[var(--accent)] focus:ring-[var(--accent)]"
              checked={isRecurring}
              onChange={e => setIsRecurring(e.target.checked)}
            />
            设为循环出现
          </label>

          {isRecurring && (
            <div className="flex items-center gap-3 pl-6">
              <span className="text-xs text-[var(--muted)]">循环频次:</span>
              <select 
                className="flex-1 p-2 bg-[var(--panel)] border border-[var(--line)] rounded-md text-sm outline-none"
                value={frequency}
                onChange={e => setFrequency(e.target.value as any)}
              >
                <option value="daily">每天 (Daily)</option>
                <option value="weekly">每周 (Weekly)</option>
                <option value="monthly">每月 (Monthly)</option>
                <option value="yearly">每年 (Yearly)</option>
              </select>
            </div>
          )}
        </div>
        
        <div className="text-[11px] text-[var(--muted)] mt-1">
          提示：默认不支持跨天（结束时间需要晚于开始时间）。跨天建议拆成两段记录。
        </div>

      </div>

      {manageModalOpen && (
        <TypesManageModal onClose={() => {
          setManageModalOpen(false);
          if (!db.taskTypes.list.some(t => t.id === typeId)) {
            setTypeId('uncat');
          }
        }} />
      )}

    </Modal>
  );
}
