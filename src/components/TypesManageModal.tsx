import React, { useState } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { useAppStore } from '../lib/store';
import { ymd } from '../lib/utils';

interface TypesManageModalProps {
  onClose: () => void;
}

export function TypesManageModal({ onClose }: TypesManageModalProps) {
  const { db, updateDb } = useAppStore();
  
  const [newTypeName, setNewTypeName] = useState("");
  const [newTypeColor, setNewTypeColor] = useState("#7aa2ff");

  const handleAddType = () => {
    if (!newTypeName.trim()) return alert("请填写类型名称");
    const exists = db.taskTypes.list.some(t => t.name === newTypeName.trim());
    if (exists && !confirm("已有同名类型，仍要创建吗？")) return;
    
    const id = "t_" + Math.random().toString(16).slice(2) + Date.now().toString(16);
    const newDb = { ...db };
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
        <div className="flex flex-col gap-2 border border-[var(--line)] bg-[var(--panel2)] p-3 rounded-md">
          <div className="text-xs font-bold text-[var(--muted)]">新增类型</div>
          <div className="flex gap-2 items-center">
            <input 
              type="text" 
              className="flex-1 p-2 text-sm border border-[var(--line)] rounded-md bg-[var(--panel)] outline-none"
              placeholder="例如：学习、工作、运动…"
              value={newTypeName}
              onChange={e => setNewTypeName(e.target.value)}
            />
            <input 
              type="color"
              className="w-10 h-10 p-0.5 rounded-md border border-[var(--line)] bg-[var(--panel)] cursor-pointer"
              value={newTypeColor}
              onChange={e => setNewTypeColor(e.target.value)}
            />
            <Button onClick={handleAddType}>添加</Button>
          </div>
        </div>

        {/* List Types */}
        <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto pr-1">
          {db.taskTypes.list.map((t: any) => (
            <div key={t.id} className="flex gap-2 items-center justify-between border-b border-[var(--line)] pb-2 last:border-0 last:pb-0">
              <div className="flex gap-2 items-center flex-1">
                <input 
                  type="color"
                  className="w-8 h-8 p-0 rounded-md border border-[var(--line)] bg-[var(--panel)] cursor-pointer"
                  value={t.color}
                  onChange={e => handleUpdateColor(t.id, e.target.value)}
                  disabled={t.id === 'uncat'}
                />
                <input 
                  type="text" 
                  className="flex-1 p-1.5 text-sm border border-transparent hover:border-[var(--line)] focus:border-[var(--accent)] rounded bg-transparent outline-none transition-colors"
                  value={t.name}
                  onChange={e => handleUpdateName(t.id, e.target.value)}
                  disabled={t.id === 'uncat'}
                />
              </div>
              {t.id !== 'uncat' && (
                <Button variant="danger" onClick={() => handleDelete(t.id)}>删除</Button>
              )}
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
