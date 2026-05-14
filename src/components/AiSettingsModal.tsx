import React, { useState } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { useAppStore } from '../lib/store';
import { AiPersona } from '../lib/types';
import { DEFAULT_PERSONAS, DEFAULT_PROMPTS } from '../lib/store';

interface SettingsModalProps {
  onClose: () => void;
}

const GEMINI_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-pro",
  "gemini-1.5-flash",
  "gemini-1.5-pro"
];

export function SettingsModal({ onClose }: SettingsModalProps) {
  const { db, updateDb } = useAppStore();
  const config = db.aiChats.config;

  const [provider, setProvider] = useState<'gemini' | 'openai-compatible'>(config.provider || 'gemini');
  const [apiKey, setApiKey] = useState(config.apiKey || "");
  const [model, setModel] = useState(config.model || "gemini-2.5-flash");
  const [personaId, setPersonaId] = useState(config.personaId || "p1");
  const [baseUrl, setBaseUrl] = useState(config.baseUrl || "https://api.deepseek.com/v1");
  const [quickPromptsText, setQuickPromptsText] = useState((config.quickPrompts || DEFAULT_PROMPTS).join('\n'));
  
  const customPersonas = config.customPersonas || DEFAULT_PERSONAS;

  const [managePersonas, setManagePersonas] = useState(false);
  const [editingPersona, setEditingPersona] = useState<AiPersona | null>(null);

  const handleSave = () => {
    const newDb = { ...db };
    // Maintain old string fallback for existing views
    const activePersonaName = customPersonas.find(p => p.id === personaId)?.name || '未知';
    const quickPrompts = quickPromptsText.split('\n').map(l => l.trim()).filter(Boolean);
    newDb.aiChats.config = { ...config, provider, apiKey, model, personaId, persona: activePersonaName, baseUrl, quickPrompts };
    updateDb(newDb);
    onClose();
  };

  const handleSavePersona = (p: AiPersona) => {
    const newDb = { ...db };
    const idx = customPersonas.findIndex(x => x.id === p.id);
    if (!newDb.aiChats.config.customPersonas) newDb.aiChats.config.customPersonas = [ ...DEFAULT_PERSONAS ];
    
    if (idx !== -1) {
      newDb.aiChats.config.customPersonas[idx] = p;
    } else {
      newDb.aiChats.config.customPersonas.push(p);
    }
    updateDb(newDb);
    setEditingPersona(null);
  };

  const handleDeletePersona = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('确认删除此人格吗？')) return;
    const newDb = { ...db };
    if (!newDb.aiChats.config.customPersonas) newDb.aiChats.config.customPersonas = [ ...DEFAULT_PERSONAS ];
    newDb.aiChats.config.customPersonas = newDb.aiChats.config.customPersonas.filter(x => x.id !== id);
    if (personaId === id) {
      const first = newDb.aiChats.config.customPersonas[0];
      if (first) setPersonaId(first.id);
      else setPersonaId('');
    }
    updateDb(newDb);
  };

  if (editingPersona) {
    return (
      <Modal 
        title={editingPersona.id ? "编辑人格" : "新增人格"} 
        onClose={() => setEditingPersona(null)}
        footer={
          <div className="flex gap-2">
            <Button onClick={() => setEditingPersona(null)}>取消</Button>
            <Button variant="primary" onClick={() => handleSavePersona(editingPersona)}>保存</Button>
          </div>
        }
      >
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-bold">名称</label>
            <input 
              className="w-full p-2 text-sm border border-[var(--line)] rounded-md bg-[var(--panel2)] outline-none"
              value={editingPersona.name}
              onChange={e => setEditingPersona({...editingPersona, name: e.target.value})}
              placeholder="人格名称"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-bold">提示词配置</label>
            <textarea 
              className="w-full h-40 p-2 text-sm border border-[var(--line)] rounded-md bg-[var(--panel2)] outline-none resize-none"
              value={editingPersona.prompt}
              onChange={e => setEditingPersona({...editingPersona, prompt: e.target.value})}
              placeholder="输入给系统的 prompt 指令。例如：你是一个幽默的朋友..."
            />
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      title="AI 教练设置"
      onClose={onClose}
      footer={<Button variant="primary" onClick={handleSave}>保存设置</Button>}
    >
      <div className="flex flex-col gap-4">

        <div className="flex flex-col gap-1">
          <label className="text-sm font-bold">API 提供商</label>
          <select 
            className="w-full p-2 text-sm border border-[var(--line)] rounded-md bg-[var(--panel2)] outline-none"
            value={provider}
            onChange={e => {
               const val = e.target.value as any;
               setProvider(val);
               if (val === 'gemini') {
                 setModel('gemini-2.5-flash');
               } else {
                 setModel('deepseek-chat');
               }
            }}
          >
            <option value="gemini">Google Gemini</option>
            <option value="openai-compatible">OpenAI 兼容 (例如 DeepSeek 等)</option>
          </select>
        </div>
        
        {provider === 'openai-compatible' && (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-bold">Base URL</label>
            <input 
              type="text" 
              placeholder="例如: https://api.deepseek.com/v1"
              className="w-full p-2 text-sm border border-[var(--line)] rounded-md bg-[var(--panel2)] outline-none"
              value={baseUrl}
              onChange={e => setBaseUrl(e.target.value)}
            />
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label className="text-sm font-bold">API Key</label>
          <div className="text-xs text-[var(--muted)] mb-1">
            {provider === 'gemini' ? '若不填，将尝试使用服务器内置的 Gemini Key（可能有限制）。' : '请输入该提供商对应的 API Key。'}
          </div>
          <input 
            type="password" 
            placeholder="sk-..."
            className="w-full p-2 text-sm border border-[var(--line)] rounded-md bg-[var(--panel2)] outline-none"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-bold">模型 (Model)</label>
          {provider === 'gemini' ? (
            <select 
              className="w-full p-2 text-sm border border-[var(--line)] rounded-md bg-[var(--panel2)] outline-none"
              value={model}
              onChange={e => setModel(e.target.value)}
            >
              {GEMINI_MODELS.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          ) : (
            <input 
              type="text" 
              placeholder="例如: deepseek-chat"
              className="w-full p-2 text-sm border border-[var(--line)] rounded-md bg-[var(--panel2)] outline-none"
              value={model}
              onChange={e => setModel(e.target.value)}
            />
          )}
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold">AI 人格预设</label>
            <span className="text-xs text-[var(--accent)] cursor-pointer" onClick={() => setManagePersonas(!managePersonas)}>
              {managePersonas ? "取消管理" : "管理/自定义"}
            </span>
          </div>
          
          <div className="flex flex-wrap gap-2 mt-1">
            {customPersonas.map(p => (
              <div 
                key={p.id}
                className={`flex items-center gap-1 border border-[var(--line)] px-3 py-1.5 rounded-full text-xs cursor-pointer select-none transition-colors 
                  ${personaId === p.id && !managePersonas ? 'bg-[var(--accent)] text-white border-[var(--accent)]' : 'hover:bg-[var(--line)]'}`}
                onClick={() => {
                  if (managePersonas) {
                    setEditingPersona(p);
                  } else {
                    setPersonaId(p.id);
                  }
                }}
              >
                {p.name}
                {managePersonas && (
                  <span className="ml-1 opacity-60 hover:opacity-100 hover:text-red-500" onClick={(e) => handleDeletePersona(p.id, e)}>✕</span>
                )}
              </div>
            ))}
            {managePersonas && (
              <div 
                className="border border-dashed border-[var(--muted)] px-3 py-1.5 rounded-full text-xs cursor-pointer hover:border-[var(--accent)] hover:text-[var(--accent)]"
                onClick={() => setEditingPersona({ id: "p_" + Date.now(), name: "新人格", prompt: "" })}
              >
                + 添加人格
              </div>
            )}
          </div>
          
          {!managePersonas && (
            <div className="mt-2 p-2 bg-[var(--panel2)] rounded-md text-xs text-[var(--muted)] whitespace-pre-wrap">
              {customPersonas.find(p => p.id === personaId)?.prompt || "暂无提示词"}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-bold">快速提问 (预设 Prompt)</label>
          <div className="text-xs text-[var(--muted)] mb-1">
            每行输入一个快捷问题，它们会显示在新的对话或聊天空白时的提示中。
          </div>
          <textarea 
            className="w-full h-32 p-2 text-sm border border-[var(--line)] rounded-md bg-[var(--panel2)] outline-none resize-y whitespace-pre"
            value={quickPromptsText}
            onChange={e => setQuickPromptsText(e.target.value)}
            placeholder="今天怎么安排好呢？&#10;最近压力大怎么办？"
          />
        </div>

      </div>
    </Modal>
  );
}
