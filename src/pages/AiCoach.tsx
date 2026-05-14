import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../lib/store';
import { Button } from '../components/ui/Button';
import Markdown from 'react-markdown';
import { ChatSession, ChatMessage } from '../lib/types';
import { SettingsModal } from '../components/AiSettingsModal';
import { Bot, Plus, Settings, Download, Send, X } from 'lucide-react';

export function AiCoach() {
  const { db, updateDb } = useAppStore();
  const [inputVal, setInputVal] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  
  const bottomRef = useRef<HTMLDivElement>(null);
  const activeSessionId = db.aiChats.activeSessionId;
  const sessions = db.aiChats.sessions;
  const quickPrompts = db.aiChats.config.quickPrompts || [];
  
  const activeSession = sessions.find(s => s.id === activeSessionId);

  // Auto scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession?.messages]);

  const handleCreateNewChat = () => {
    const newSession: ChatSession = {
      id: "cs_" + Date.now().toString(16),
      title: "新对话",
      messages: [],
      updatedAt: Date.now()
    };
    const newDb = { ...db };
    newDb.aiChats.sessions = [newSession, ...newDb.aiChats.sessions];
    newDb.aiChats.activeSessionId = newSession.id;
    updateDb(newDb);
  };

  const handleSelectSession = (id: string) => {
    const newDb = { ...db };
    newDb.aiChats.activeSessionId = id;
    updateDb(newDb);
  };

  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("确认删除这个对话？")) return;
    const newDb = { ...db };
    newDb.aiChats.sessions = newDb.aiChats.sessions.filter(s => s.id !== id);
    if (newDb.aiChats.activeSessionId === id) {
      newDb.aiChats.activeSessionId = newDb.aiChats.sessions[0]?.id || null;
    }
    updateDb(newDb);
  };

  const updateSessionMessages = (id: string, messages: ChatMessage[], appendTitle?: string) => {
    const newDb = { ...db };
    const idx = newDb.aiChats.sessions.findIndex(s => s.id === id);
    if (idx !== -1) {
      newDb.aiChats.sessions[idx].messages = messages;
      newDb.aiChats.sessions[idx].updatedAt = Date.now();
      if (appendTitle && newDb.aiChats.sessions[idx].title === "新对话") {
        newDb.aiChats.sessions[idx].title = appendTitle.slice(0, 15) + (appendTitle.length > 15 ? "..." : "");
      }
    }
    updateDb(newDb);
  };

  const handleExportData = () => {
    const dataStr = JSON.stringify(db.aiChats.sessions, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `timedonut-ai-chats-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSend = async (text: string) => {
    if (!text.trim() || isGenerating) return;
    
    let currentSession = activeSession;
    if (!currentSession) {
      handleCreateNewChat();
      // wait for react cycle or manually apply
      const newSession: ChatSession = {
        id: "cs_" + Date.now().toString(16),
        title: text.slice(0, 15),
        messages: [],
        updatedAt: Date.now()
      };
      const newDb = { ...db };
      newDb.aiChats.sessions = [newSession, ...newDb.aiChats.sessions];
      newDb.aiChats.activeSessionId = newSession.id;
      updateDb(newDb);
      currentSession = newSession;
    }

    const newMessages: ChatMessage[] = [
      ...currentSession!.messages,
      { role: 'user', text: text.trim() }
    ];
    updateSessionMessages(currentSession!.id, newMessages, text);
    setInputVal("");
    setIsGenerating(true);

    try {
      // Build contexts
      let promptContext = "这是系统内的用户当前数据信息，不要主动提及，除非分析需要。\n";
      promptContext += JSON.stringify({
        days: db.days,
        habits: db.habits.list,
        taskTypes: db.taskTypes.list
      }).slice(0, 3000); // prevent token overload

      let activePersonaObj = db.aiChats.config.customPersonas?.find((p: any) => p.id === db.aiChats.config.personaId);
      let personaPrompt = activePersonaObj ? activePersonaObj.prompt : `你扮演的角色是：${db.aiChats.config.persona || "时间管理大师"}。`;
      let systemInstruction = `${personaPrompt}\n\n${promptContext}`;

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, parts: [{ text: m.text }] })),
          apiKey: db.aiChats.config.apiKey,
          model: db.aiChats.config.model,
          systemInstruction: systemInstruction,
          provider: db.aiChats.config.provider,
          baseUrl: db.aiChats.config.baseUrl
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "请求失败");
      }

      if (!res.body) throw new Error("No response body");

      // Set up reader
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let assistantText = "";
      
      // Push an empty assistant message first
      updateSessionMessages(currentSession!.id, [
        ...newMessages,
        { role: 'model', text: "" }
      ]);

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          const chunkStr = decoder.decode(value, { stream: true });
          const lines = chunkStr.split("\n_^_^_^"); // Wait, SSE is format data: xxx \n\n
          
          let bufLines = chunkStr.split("\n\n");
          for (let bl of bufLines) {
            if (bl.startsWith("data: ")) {
               const jsonStr = bl.slice(6);
               if (jsonStr === "[DONE]") {
                 done = true;
                 break;
               }
               try {
                 const parsed = JSON.parse(jsonStr);
                 if (parsed.text) {
                   assistantText += parsed.text;
                   updateSessionMessages(currentSession!.id, [
                     ...newMessages,
                     { role: 'model', text: assistantText }
                   ]);
                 }
               } catch (e) {}
            }
          }
        }
      }

    } catch(err: any) {
      alert(err.message);
      // Remove last user message if fail? Or just show error
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-140px)] min-h-[500px] border border-[var(--line)] rounded-[var(--radius)] bg-[var(--panel)] shadow-[var(--shadow)] overflow-hidden">
      
      {/* Sidebar */}
      <div className="w-[240px] border-r border-[var(--line)] bg-[var(--panel2)] hidden md:flex flex-col">
        <div className="p-3 border-b border-[var(--line)] flex gap-2">
          <Button variant="primary" className="flex-1" onClick={handleCreateNewChat}>+ 新对话</Button>
        </div>
        <div className="p-3 border-b border-[var(--line)] flex gap-2">
          <Button className="flex-1" onClick={() => setSettingsOpen(true)}>设置</Button>
          <Button className="flex-1" onClick={handleExportData}>导出记忆</Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
          {sessions.map(s => (
            <div 
              key={s.id} 
              className={`flex items-center justify-between p-2 rounded-md cursor-pointer text-sm transition-colors ${activeSessionId === s.id ? 'bg-[var(--accent)] text-white' : 'hover:bg-[var(--line)] text-[var(--text)]'}`}
              onClick={() => handleSelectSession(s.id)}
            >
              <span className="truncate flex-1">{s.title}</span>
              <span className="opacity-50 hover:opacity-100 px-1 ml-1" onClick={(e) => handleDeleteSession(s.id, e)}>✕</span>
            </div>
          ))}
          {sessions.length === 0 && (
            <div className="text-xs text-[var(--muted)] text-center mt-10">暂无对话记录</div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative">
        <div className="md:hidden flex p-2 border-b border-[var(--line)] bg-[var(--panel2)] justify-between">
            <Button variant="primary" onClick={handleCreateNewChat}>+ 新对话</Button>
            <div className="flex gap-2">
              <Button onClick={() => setSettingsOpen(true)}>设置</Button>
              <Button onClick={handleExportData}>导出</Button>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {(!activeSession || activeSession.messages.length === 0) && (
            <div className="flex-1 flex flex-col items-center justify-center mb-10 text-[var(--muted)]">
              <div className="text-4xl mb-4 text-[var(--accent)]"><Bot className="w-12 h-12" /></div>
              <h3 className="text-lg font-bold mb-2 text-[var(--text)]">你好！我是你的 AI 教练</h3>
              <p className="text-sm mb-8 text-center max-w-[300px]">我可以根据你的数据给出建议，或者听你倒苦水。试试下面的预设问题：</p>
              <div className="flex flex-wrap gap-2 justify-center max-w-[400px]">
                {quickPrompts.map((p, i) => (
                  <div 
                    key={i} 
                    className="border border-[var(--line)] px-3 py-1.5 rounded-full text-xs cursor-pointer hover:bg-[var(--line)] hover:text-[var(--text)] transition-colors"
                    onClick={() => handleSend(p)}
                  >
                    {p}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSession?.messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] md:max-w-[70%] p-3 rounded-2xl ${m.role === 'user' ? 'bg-[var(--accent)] text-white rounded-tr-sm' : 'bg-[var(--panel2)] text-[var(--text)] border border-[var(--line)] rounded-tl-sm'}`}>
                {m.role === 'user' ? (
                  <div className="whitespace-pre-wrap text-sm">{m.text}</div>
                ) : (
                  <div className="markdown-body text-sm">
                    <Markdown>{m.text}</Markdown>
                  </div>
                )}
              </div>
            </div>
          ))}
          {isGenerating && activeSession?.messages[activeSession.messages.length - 1]?.role === 'user' && (
            <div className="flex justify-start">
              <div className="max-w-[70%] p-3 rounded-2xl bg-[var(--panel2)] text-[var(--text)] border border-[var(--line)] rounded-tl-sm text-sm">
                <span className="animate-pulse">思考中...</span>
              </div>
            </div>
          )}
          <div ref={bottomRef}></div>
        </div>

        {/* Input Form */}
        <div className="p-3 border-t border-[var(--line)] bg-[var(--panel)]">
          <form className="flex gap-2" onSubmit={e => { e.preventDefault(); handleSend(inputVal); }}>
            <input 
              type="text" 
              className="flex-1 p-2 rounded-md border border-[var(--line)] bg-[var(--panel2)] outline-none text-sm text-[var(--text)]"
              placeholder="输入你的问题或想法..."
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              disabled={isGenerating}
            />
            <Button variant="primary" type="submit" disabled={isGenerating || !inputVal.trim()}>发送</Button>
          </form>
          <div className="text-[10px] text-[var(--muted)] text-center mt-2">
            当前人格：{db.aiChats.config.customPersonas?.find(p => p.id === db.aiChats.config.personaId)?.name || db.aiChats.config.persona || "时间管理大师"}
          </div>
        </div>
      </div>

      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}
