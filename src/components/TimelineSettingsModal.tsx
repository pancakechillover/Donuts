import React, { useState } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { useAppStore } from '../lib/store';
import { timeToMin, minToTime } from '../lib/utils';

export function TimelineSettingsModal({ onClose }: { onClose: () => void }) {
  const { db, updateDb } = useAppStore();
  const [morning, setMorning] = useState(db.settings?.timeline?.morningStart || '06:00');
  const [noon, setNoon] = useState(db.settings?.timeline?.noonStart || '12:00');
  const [evening, setEvening] = useState(db.settings?.timeline?.eveningStart || '18:00');

  const handleSave = () => {
    // Basic validation
    const m = timeToMin(morning);
    const n = timeToMin(noon);
    const e = timeToMin(evening);

    if (m >= n || n >= e) {
      alert("请确保时间顺序：早晨 < 中午 < 晚上");
      return;
    }

    const newDb = { ...db };
    if (!newDb.settings) {
      newDb.settings = { timeline: { morningStart: morning, noonStart: noon, eveningStart: evening } };
    } else {
      newDb.settings.timeline = {
        morningStart: morning,
        noonStart: noon,
        eveningStart: evening
      };
    }
    updateDb(newDb);
    onClose();
  };

  return (
    <Modal title="时间段设置" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div className="text-sm text-[var(--muted)]">
          设置当天的三个主要时间段，方便时间轴分段展示。
        </div>
        
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <label className="w-16 text-sm font-medium">☀️ 早上</label>
            <input 
              type="time" 
              step="300"
              className="flex-1 p-2 bg-[var(--panel)] border border-[var(--line)] rounded-md outline-none"
              value={morning}
              onChange={e => setMorning(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-3">
            <label className="w-16 text-sm font-medium">🕛 中午</label>
            <input 
              type="time" 
              step="300"
              className="flex-1 p-2 bg-[var(--panel)] border border-[var(--line)] rounded-md outline-none"
              value={noon}
              onChange={e => setNoon(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-3">
            <label className="w-16 text-sm font-medium">🌙 晚上</label>
            <input 
              type="time" 
              step="300"
              className="flex-1 p-2 bg-[var(--panel)] border border-[var(--line)] rounded-md outline-none"
              value={evening}
              onChange={e => setEvening(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-2">
          <Button variant="default" onClick={onClose}>取消</Button>
          <Button variant="primary" onClick={handleSave}>保存</Button>
        </div>
      </div>
    </Modal>
  );
}
