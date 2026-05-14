import React, { useState } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { useAppStore } from '../lib/store';
import { ymd } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const PRESET_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16", "#22c55e",
  "#14b8a6", "#06b6d4", "#3b82f6", "#6366f1", "#a855f7", 
  "#d946ef", "#f43f5e", "#7aa2ff"
];

interface TypesManageModalProps {
  onClose: () => void;
}

export function TypesManageModal({ onClose }: TypesManageModalProps) {
  const { db, updateDb } = useAppStore();
  
  const [newTypeName, setNewTypeName] = useState("");
  const [newTypeColor, setNewTypeColor] = useState("#7aa2ff");
  const [activeColorId, setActiveColorId] = useState<string | null>(null);

  const handleAddType = () => {
    if (!newTypeName.trim()) return alert("请填写类型名称");
    const exists = db.taskTypes.list.some(t => t.name === newTypeName.trim());
    if (exists && !confirm("已有同名类型，仍要创建吗？")) return;
    
    const id = "t_" + Math.random().toString(16).slice(2) + Date.now().toString(16);
    const newDb = { ...db };
    // Put new type after uncat to match the list appearance
    newDb.taskTypes.list.push({ id, name: newTypeName.trim(), color: newTypeColor, created: ymd(new Date()) });
    updateDb(newDb);
    
    setNewTypeName("");
  };

  const handleUpdateColor = (id: string, color: string) => {
    const newDb = { ...db };
    const t = newDb.taskTypes.list.find((x: any) => x.id === id);
    if (t) {
      t.color = color;
      updateDb(newDb);
    }
  };

  const handleUpdateName = (id: string, name: string) => {
    const newDb = { ...db };
    const t = newDb.taskTypes.list.find((x: any) => x.id === id);
    if (t) {
      t.name = name;
      updateDb(newDb);
    }
  };

  const handleDelete = (id: string) => {
    if (id === 'uncat') return alert("不能删除默认分类");
    if (!confirm("确定要删除这个分类吗？这会将使用此分类的活动变更为“未分类”。")) return;

    const newDb = { ...db };
    newDb.taskTypes.list = newDb.taskTypes.list.filter((x: any) => x.id !== id);
    
    // Change all activities to 'uncat'
    Object.values(newDb.days).forEach((day: any) => {
      day.activities.forEach((act: any) => {
        if (act.typeId === id) {
          act.typeId = 'uncat';
        }
      });
    });

    // Update recurring tasks as well
    if (newDb.recurringTasks?.list) {
      newDb.recurringTasks.list.forEach(rt => {
        if (rt.typeId === id) {
          rt.typeId = 'uncat';
        }
      });
    }

    updateDb(newDb);
  };

  return (
    <Modal
      title="管理分类"
      onClose={onClose}
      footer={<Button variant="primary" onClick={onClose}>完成</Button>}
    >
      <div className="flex flex-col gap-4">
        {/* Add Type */}
        <div className="flex flex-col gap-3 border border-[var(--line)] bg-[var(--panel2)] p-3 rounded-xl shadow-sm">
          <div className="text-xs font-bold text-[var(--muted)]">新增类型</div>
          <div className="flex gap-2 items-center">
            <input 
              type="text" 
              className="flex-1 p-2 text-sm border border-[var(--line)] rounded-lg bg-[var(--panel)] outline-none focus:border-[var(--accent)] transition-colors"
              placeholder="例如：学习、工作、运动…"
              value={newTypeName}
              onChange={e => setNewTypeName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddType();
              }}
            />
            <div className="relative w-10 h-10 rounded-lg border border-[var(--line)] overflow-hidden shadow-inner shrink-0" style={{ backgroundColor: newTypeColor }}>
               <input 
                 type="color"
                 className="absolute inset-[-10px] w-[60px] h-[60px] opacity-0 cursor-pointer"
                 value={newTypeColor}
                 onChange={e => setNewTypeColor(e.target.value)}
               />
            </div>
            <Button onClick={handleAddType}>添加</Button>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-1">
             {PRESET_COLORS.map(c => (
               <button 
                 key={c} 
                 className={`w-5 h-5 rounded-full border shadow-inner transition-transform hover:scale-110 ${newTypeColor === c ? 'border-[var(--fg)] scale-110' : 'border-black/10'}`}
                 style={{ backgroundColor: c }}
                 onClick={() => setNewTypeColor(c)}
               />
             ))}
          </div>
        </div>

        {/* List Types */}
        <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto pr-1 overflow-x-hidden">
          <AnimatePresence initial={false}>
            {db.taskTypes.list.map((t: any) => (
              <motion.div 
                key={t.id}
                layout
                initial={{ opacity: 0, height: 0, scale: 0.9 }}
                animate={{ opacity: 1, height: 'auto', scale: 1 }}
                exit={{ opacity: 0, height: 0, scale: 0.9, overflow: 'hidden' }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="flex flex-col gap-2 border-b border-[var(--line)] pb-2 last:border-0 last:pb-0"
              >
                <div className="flex gap-2 items-center justify-between">
                  <div className="flex gap-3 items-center flex-1 my-1">
                    <button 
                      className="w-8 h-8 rounded-full border border-[var(--line)] shadow-inner transition-transform hover:scale-105"
                      style={{ backgroundColor: t.color, outline: activeColorId === t.id ? '2px solid var(--accent)' : 'none', outlineOffset: '2px' }}
                      onClick={() => {
                        if (t.id === 'uncat') return;
                        setActiveColorId(activeColorId === t.id ? null : t.id);
                      }}
                      disabled={t.id === 'uncat'}
                    />
                    <input 
                      type="text" 
                      className="flex-1 p-1.5 text-sm font-medium border border-transparent hover:bg-[var(--panel2)] focus:border-[var(--accent)] focus:bg-[var(--panel2)] rounded-md outline-none transition-colors"
                      value={t.name}
                      onChange={e => handleUpdateName(t.id, e.target.value)}
                      disabled={t.id === 'uncat'}
                    />
                  </div>
                  {t.id !== 'uncat' && (
                    <Button variant="danger" onClick={() => handleDelete(t.id)}>删除</Button>
                  )}
                </div>
                
                <AnimatePresence>
                  {activeColorId === t.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="flex flex-wrap items-center gap-2 p-3 bg-[var(--panel2)] border border-[var(--line)] rounded-xl mt-1 ml-11">
                        {PRESET_COLORS.map(c => (
                          <button 
                            key={c} 
                            className={`w-6 h-6 rounded-full border shadow-inner transition-transform hover:scale-110 ${t.color === c ? 'border-[var(--fg)] scale-110' : 'border-black/10'}`}
                            style={{ backgroundColor: c }}
                            onClick={() => {
                              handleUpdateColor(t.id, c);
                            }}
                          />
                        ))}
                        <div className="w-px h-6 bg-[var(--line)] mx-1"></div>
                        <div className="relative w-7 h-7 rounded-full border border-[var(--line)] shadow-inner overflow-hidden" title="自定义色值" style={{ backgroundColor: t.color }}>
                          <input 
                            type="color"
                            className="absolute inset-[-10px] w-12 h-12 opacity-0 cursor-pointer"
                            value={t.color}
                            onChange={e => handleUpdateColor(t.id, e.target.value)}
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </Modal>
  );
}
