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
  const { db, updateDb, selectedDate, getDayData } = useAppStore();
  
  const dateKey = ymd(selectedDate);
  const todaysData = getDayData(dateKey);
  const acts = todaysData.activities;

  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [label, setLabel] = useState("");
  const [typeId, setTypeId] = useState("uncat");

  const [manageModalOpen, setManageModalOpen] = useState(false);

  useEffect(() => {
    if (editingIndex != null && acts[editingIndex]) {
      const seg = acts[editingIndex];
      setStart(minToTime(seg.startMin));
      setEnd(minToTime(seg.endMin));
      setLabel(seg.label);
      setTypeId(seg.typeId);
    } else {
      setStart(minToTime(initialRange.startMin));
      setEnd(minToTime(initialRange.endMin));
      setLabel("");
      setTypeId("uncat");
    }
  }, [editingIndex, initialRange, acts]);

  const handleSave = () => {
    const s = timeToMin(start);
    const e = timeToMin(end);
    if (s == null || e == null) return alert("请填写开始与结束时间");
    if (e <= s) return alert("结束时间需要晚于开始时间（不跨天）。如需跨天，请拆成两段记录。");
    if (!label.trim()) return alert("请填写活动名称");

    const seg: ActivitySegment = { startMin: s, endMin: e, label: label.trim(), typeId };
    
    // Merge new segments
    const newActs = [...acts];
    if (editingIndex != null) newActs[editingIndex] = seg;
    else newActs.push(seg);
    
    // Sort
    newActs.sort((a,b) => a.startMin - b.startMin);

    const newDb = { ...db };
    newDb.days[dateKey] = { ...todaysData, activities: newActs };
    updateDb(newDb);
    onClose();
  };

  const handleDelete = () => {
    if (editingIndex == null) return;
    const newActs = [...acts];
    newActs.splice(editingIndex, 1);
    const newDb = { ...db };
    newDb.days[dateKey] = { ...todaysData, activities: newActs };
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
