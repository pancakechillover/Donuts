import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../lib/store';
import { Button } from './ui/Button';
import Markdown from 'react-markdown';
import { ChatSession, ChatMessage, ActivitySegment } from '../lib/types';
import { SettingsModal } from './AiSettingsModal';
import { Bot, Play, Square, Copy, RefreshCw, Trash2, Edit } from 'lucide-react';

export function TimelineAiChat({ dateKey }: { dateKey: string }) {
  const { db, updateDb } = useAppStore();
  const [inputVal, setInputVal] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Initialize aiTimeChats if missing
  useEffect(() => {
    if (!db.aiTimeChats) {
      const newDb = JSON.parse(JSON.stringify(db));
      newDb.aiTimeChats = {
        sessions: [],
        activeSessionId: null
      };
      updateDb(newDb);
    }
  }, [db.aiTimeChats, updateDb]);

  const activeSessionId = db.aiTimeChats?.activeSessionId;
  const sessions = db.aiTimeChats?.sessions || [];
  const activeSession = sessions.find(s => s.id === activeSessionId);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession?.messages]);

  const handleCreateNewChat = () => {
    const newSession: ChatSession = {
      id: "tcs_" + Date.now().toString(16),
      title: "新对话",
      messages: [],
      updatedAt: Date.now()
    };
    const newDb = JSON.parse(JSON.stringify(db));
    if (!newDb.aiTimeChats) newDb.aiTimeChats = { sessions: [], activeSessionId: null };
    newDb.aiTimeChats.sessions = [newSession, ...newDb.aiTimeChats.sessions];
    newDb.aiTimeChats.activeSessionId = newSession.id;
    updateDb(newDb);
  };

  const handleSelectSession = (id: string) => {
    const newDb = JSON.parse(JSON.stringify(db));
    newDb.aiTimeChats.activeSessionId = id;
    updateDb(newDb);
  };

  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("确认删除这个对话？")) return;
    const newDb = JSON.parse(JSON.stringify(db));
    newDb.aiTimeChats.sessions = newDb.aiTimeChats.sessions.filter((s:any) => s.id !== id);
    if (newDb.aiTimeChats.activeSessionId === id) {
      newDb.aiTimeChats.activeSessionId = newDb.aiTimeChats.sessions[0]?.id || null;
    }
    updateDb(newDb);
  };

  const updateSessionMessages = (id: string, messages: ChatMessage[], appendTitle?: string) => {
    const newDb = JSON.parse(JSON.stringify(db));
    const idx = newDb.aiTimeChats.sessions.findIndex((s:any) => s.id === id);
    if (idx !== -1) {
      newDb.aiTimeChats.sessions[idx].messages = messages;
      newDb.aiTimeChats.sessions[idx].updatedAt = Date.now();
      if (appendTitle && newDb.aiTimeChats.sessions[idx].title === "新对话") {
        newDb.aiTimeChats.sessions[idx].title = appendTitle.slice(0, 15) + (appendTitle.length > 15 ? "..." : "");
      }
    }
    updateDb(newDb);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const cancelGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsGenerating(false);
    }
  };

  const handleSend = async (text: string, forceMessages?: ChatMessage[]) => {
    if ((!text.trim() && !forceMessages) || isGenerating) return;
    
    let currentSession = activeSession;
    if (!currentSession) {
      handleCreateNewChat();
      const newSession: ChatSession = {
        id: "tcs_" + Date.now().toString(16),
        title: text.slice(0, 15) || "新对话",
        messages: [],
        updatedAt: Date.now()
      };
      const newDb = JSON.parse(JSON.stringify(db));
      if(!newDb.aiTimeChats) newDb.aiTimeChats = { sessions: [], activeSessionId: null };
      newDb.aiTimeChats.sessions = [newSession, ...newDb.aiTimeChats.sessions];
      newDb.aiTimeChats.activeSessionId = newSession.id;
      updateDb(newDb);
      currentSession = newSession;
    }

    const newMessages: ChatMessage[] = forceMessages || [
      ...currentSession!.messages,
      { role: 'user', text: text.trim() }
    ];
    
    updateSessionMessages(currentSession!.id, newMessages, text);
    if (!forceMessages) setInputVal("");
    setIsGenerating(true);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const typesList = db.taskTypes?.list || [];
      const typesInfo = typesList.map(t => `${t.id}: ${t.name}`).join("\n");
      
      let systemInstruction = `
你是一个时间记录助手。用户会告诉你他们做了什么，请你从用户的描述中提取时间信息和任务信息，并将其转化为结构化的 JSON 格式返回。
今天的日期标志是: ${dateKey}。
可用的任务类型 (id: name):
${typesInfo}
如果用户没有提供类型，或者找不到合适的类型，请使用 "uncat"。

你必须输出一个包含 JSON 数组的 markdown 代码块，格式如下：
\`\`\`json
[
  { "action": "add_task", "startMin": 540, "endMin": 600, "label": "开早会", "typeId": "uncat" }
]
\`\`\`
注意：startMin 和 endMin 是一天中的分钟数（例如 09:00 = 540）。其他字段见上面例子。不要输出任何其他文本，除非你需要询问用户确认时间。
`;

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortController.signal,
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

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let assistantText = "";
      
      updateSessionMessages(currentSession!.id, [
        ...newMessages,
        { role: 'model', text: "" }
      ]);

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          const chunkStr = decoder.decode(value, { stream: true });
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

      // Try parsing JSON block to automate the task additions
      const match = assistantText.match(/\`\`\`json\s*(\[\s*\{[\s\S]*?\])\s*\`\`\`/);
      if (match) {
        try {
          const tasks = JSON.parse(match[1]);
          if (tasks.length > 0) {
            // Apply tasks to activities
            const newDb = JSON.parse(JSON.stringify(db)); // Latest state
            let todaysData = newDb.days[dateKey];
            if (!todaysData) {
               todaysData = {
                  activities: [],
                  pomodoro: { morning: 0, noon: 0, evening: 0 },
                  sleep: { wake: "08:00", bed: "23:00" },
                  diary: { title: "", text: "", mood: 3, tags: [], updatedAt: Date.now() }
               };
               newDb.days[dateKey] = todaysData;
            }
            tasks.forEach((t: any) => {
              if (t.action === "add_task") {
                const segId = Math.random().toString(36).substring(2, 9);
                todaysData.activities.push({
                   id: segId,
                   startMin: t.startMin,
                   endMin: t.endMin,
                   label: t.label,
                   typeId: t.typeId || 'uncat'
                });
              }
            });
            updateDb(newDb);
          }
        } catch(e) {
          console.error("Failed to parse task JSON", e);
        }
      }

    } catch(err: any) {
      if (err.name === 'AbortError') {
        // aborted
      } else {
        alert(err.message);
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  const handleRetry = () => {
    if (!activeSession) return;
    const msgs = activeSession.messages;
    if (msgs.length === 0) return;
    let newMsgs = [...msgs];
    if (newMsgs[newMsgs.length - 1].role === 'model') {
      newMsgs.pop();
    }
    const lastUserMsg = newMsgs[newMsgs.length - 1];
    if (!lastUserMsg) return;
    handleSend(lastUserMsg.text, newMsgs);
  };

  return (
    <div className="flex flex-col mt-4 border border-[var(--line)] rounded-[var(--radius)] bg-[var(--panel)] shadow-[var(--shadow)] overflow-hidden h-[400px]">
      <div className="flex h-full">
        {/* Sidebar */}
        <div className="w-[180px] border-r border-[var(--line)] bg-[var(--panel2)] hidden md:flex flex-col">
          <div className="p-2 border-b border-[var(--line)] flex gap-2">
            <Button variant="primary" className="flex-1 text-xs" onClick={handleCreateNewChat}>+ 新对话</Button>
            <Button className="px-2" onClick={() => setSettingsOpen(true)}>
               <Edit className="w-3.5 h-3.5" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
            {sessions.map((s:any) => (
              <div 
                key={s.id} 
                className={`flex items-center justify-between p-1.5 rounded-md cursor-pointer text-xs transition-colors ${activeSessionId === s.id ? 'bg-[var(--accent)] text-white' : 'hover:bg-[var(--line)] text-[var(--text)]'}`}
                onClick={() => handleSelectSession(s.id)}
              >
                <span className="truncate flex-1">{s.title}</span>
                <span className="opacity-50 hover:opacity-100 px-1 ml-1" onClick={(e) => handleDeleteSession(s.id, e)}><Trash2 className="w-3 h-3" /></span>
              </div>
            ))}
            {sessions.length === 0 && (
              <div className="text-xs text-[var(--muted)] text-center mt-5">暂无对话记录</div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col relative bg-[var(--panel)]">
           <div className="md:hidden p-2 border-b border-[var(--line)] bg-[var(--panel2)] flex justify-between items-center">
             <Button variant="primary" className="text-xs py-1" onClick={handleCreateNewChat}>新对话</Button>
             <Button className="text-xs py-1" onClick={() => setSettingsOpen(true)}>设置</Button>
           </div>
           
           <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
             {(!activeSession || activeSession.messages.length === 0) && (
               <div className="flex-1 flex flex-col items-center justify-center text-[var(--muted)]">
                 <Bot className="w-8 h-8 mb-2 opacity-50" />
                 <p className="text-xs text-center">输入你的安排，AI会自动添加任务到时间环。</p>
                 <div className="mt-2 flex flex-wrap justify-center gap-2">
                    <span className="text-[10px] bg-[var(--panel2)] border border-[var(--line)] px-2 py-1 rounded cursor-pointer hover:bg-[var(--line)]" onClick={() => handleSend("我今天早上9点到10点开了一个会")}>“我今天早上9点到10点开了一个会”</span>
                 </div>
               </div>
             )}
             
             {activeSession?.messages.map((m, i) => (
               <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                 <div className={`max-w-[90%] md:max-w-[80%] p-2 rounded-xl text-sm ${m.role === 'user' ? 'bg-[var(--accent)] text-white rounded-tr-sm' : 'bg-[var(--panel2)] text-[var(--text)] border border-[var(--line)] rounded-tl-sm'}`}>
                   {m.role === 'user' ? (
                     <div className="whitespace-pre-wrap">{m.text}</div>
                   ) : (
                     <div className="markdown-body">
                       <Markdown>{m.text}</Markdown>
                     </div>
                   )}
                 </div>
                 {m.role === 'model' && i === activeSession.messages.length - 1 && !isGenerating && (
                    <div className="flex gap-2 mt-1 px-1">
                      <button className="text-[10px] text-[var(--muted)] hover:text-[var(--text)] flex items-center gap-1" onClick={() => copyToClipboard(m.text)}>
                        <Copy className="w-3 h-3" /> 复制
                      </button>
                      <button className="text-[10px] text-[var(--muted)] hover:text-[var(--text)] flex items-center gap-1" onClick={handleRetry}>
                        <RefreshCw className="w-3 h-3" /> 重新生成
                      </button>
                    </div>
                 )}
               </div>
             ))}
             {isGenerating && activeSession?.messages[activeSession.messages.length - 1]?.role === 'user' && (
               <div className="flex justify-start">
                 <div className="max-w-[80%] p-2 rounded-xl bg-[var(--panel2)] text-[var(--text)] border border-[var(--line)] rounded-tl-sm text-sm">
                   <span className="animate-pulse flex items-center gap-1.5"><Bot className="w-4 h-4" /> 处理中...</span>
                 </div>
               </div>
             )}
             <div ref={bottomRef}></div>
           </div>

           {/* Input Box */}
           <div className="p-2 border-t border-[var(--line)] bg-[var(--panel2)]">
             <form className="flex gap-2" onSubmit={e => { e.preventDefault(); handleSend(inputVal); }}>
               <input 
                 type="text" 
                 className="flex-1 p-1.5 rounded-md border border-[var(--line)] bg-[var(--panel)] outline-none text-sm text-[var(--text)] px-2"
                 placeholder="说点什么让 AI 记录..."
                 value={inputVal}
                 onChange={e => setInputVal(e.target.value)}
                 disabled={isGenerating}
               />
               {isGenerating ? (
                 <Button type="button" variant="ghost" className="text-red-500 hover:bg-red-500/10" onClick={cancelGeneration}>
                    <Square className="w-4 h-4" fill="currentColor" />
                 </Button>
               ) : (
                 <Button variant="primary" type="submit" disabled={!inputVal.trim()}>
                    <Play className="w-4 h-4" />
                 </Button>
               )}
             </form>
           </div>
        </div>
      </div>
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}
