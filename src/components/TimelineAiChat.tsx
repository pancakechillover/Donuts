import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../lib/store';
import { Button } from './ui/Button';
import Markdown from 'react-markdown';
import { ChatSession, ChatMessage, ActivitySegment, PendingTask } from '../lib/types';
import { SettingsModal } from './AiSettingsModal';
import { Bot, Play, Square, Copy, RefreshCw, Trash2, Edit, Check, X, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { minToTime, timeToMin } from '../lib/utils';

export function TimelineAiChat({ dateKey }: { dateKey: string }) {
  const { db, updateDb } = useAppStore();
  const [inputVal, setInputVal] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  const activeSessionId = db.aiTimeChats?.activeSessionId;
  const sessions = db.aiTimeChats?.sessions || [];
  const activeSession = sessions.find(s => s.id === activeSessionId);
  const pendingTasks = activeSession?.pendingTasks || null;

  const setPendingTasks = (tasks: PendingTask[] | null) => {
    if (!activeSessionId) return;
    const newDb = JSON.parse(JSON.stringify(db));
    const idx = newDb.aiTimeChats.sessions.findIndex((s: any) => s.id === activeSessionId);
    if (idx !== -1) {
      newDb.aiTimeChats.sessions[idx].pendingTasks = tasks || undefined;
      updateDb(newDb);
    }
  };

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
    
    // Clear pending tasks and update messages in one go
    const dbCopy = JSON.parse(JSON.stringify(db));
    const sIdx = dbCopy.aiTimeChats.sessions.findIndex((s: any) => s.id === currentSession!.id);
    if (sIdx !== -1) {
      dbCopy.aiTimeChats.sessions[sIdx].messages = newMessages;
      dbCopy.aiTimeChats.sessions[sIdx].updatedAt = Date.now();
      dbCopy.aiTimeChats.sessions[sIdx].pendingTasks = undefined; // Clear pending
      if (text && dbCopy.aiTimeChats.sessions[sIdx].title === "新对话") {
        dbCopy.aiTimeChats.sessions[sIdx].title = text.slice(0, 15) + (text.length > 15 ? "..." : "");
      }
    }
    updateDb(dbCopy);

    if (!forceMessages) setInputVal("");
    setIsGenerating(true);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const typesList = db.taskTypes?.list || [];
      const typesInfo = typesList.map(t => `${t.id}: ${t.name}`).join("\n");
      
      let systemInstruction = `
你是一个时间记录助手。用户会告诉你他们做了什么，请你从用户的描述中提取时间信息和任务信息。
你既要用亲切自然的口吻回复用户，又要返回结构化的 JSON 格式任务数据。

当前上下文：
- 今天的日期 (YYYY-MM-DD): ${dateKey}
- 当前本地时间: ${new Date().toLocaleTimeString()}

可用的任务类型 (id: name):
${typesInfo}
如果用户没有提供类型，或者找不到合适的类型，请使用 "uncat"。

你必须输出一个包含 JSON 数组的 markdown 代码块，格式如下：
\`\`\`json
[
  { "targetDate": "${dateKey}", "startMin": 540, "endMin": 600, "label": "开早会", "typeId": "uncat", "isDeadline": false, "frequency": null }
]
\`\`\`
规则：
1. **targetDate**: 必须是 YYYY-MM-DD 格式。如果用户提到“明天”、“下周一”、“半个月后”，请根据当前日期 ${dateKey} 计算出准确的日期。
2. **多任务识别**: 用户可能会在一段话里描述多个任务（例如：今天下午开会，明天早上跑步），请将所有识别到的任务都放入数组中。
3. **startMin/endMin**: 是一天中的分钟数（例如 09:00 = 540）。请尽可能准确解析时间。
4. **isDeadline**: 如果用户描述中包含截止时间性质（如“10点前要交”、“在12点之前完成”），请设为 true。
5. **frequency**: 如果用户提到循环规律（如“每天”、“每周五”、“每月1号”），请识别为 "daily", "weekly", "monthly", "yearly"。如果不是循环任务，请填 null。
6. 不要输出任何多余的解释，除非你需要询问用户确认模糊的时间点。回复要简洁。
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
        const text = await res.text();
        try {
          const err = JSON.parse(text);
          throw new Error(err.error || "请求失败");
        } catch {
          throw new Error("请求失败: " + text.slice(0, 100));
        }
      }

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let assistantText = "";
      let lineBuffer = "";
      
      updateSessionMessages(currentSession!.id, [
        ...newMessages,
        { role: 'model', text: "" }
      ]);

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          const chunkStr = decoder.decode(value, { stream: true });
          lineBuffer += chunkStr;
          
          let lines = lineBuffer.split("\n");
          lineBuffer = lines.pop() || "";
          
          for (let line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith("data: ")) {
               const jsonStr = trimmed.slice(6);
               if (jsonStr === "[DONE]") {
                 done = true;
                 break;
               }
               try {
                 const parsed = JSON.parse(jsonStr);
                 if (parsed.error) {
                   throw new Error(parsed.error);
                 }
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
      const extractJson = (text: string) => {
        const match = text.match(/```json\s*([\s\S]*?)\s*```/);
        if (match) return match[1];
        
        // Fallback: search for [ ... ]
        const start = text.indexOf('[');
        const end = text.lastIndexOf(']');
        if (start !== -1 && end !== -1 && end > start) {
          return text.slice(start, end + 1);
        }
        return null;
      };

      const jsonStr = extractJson(assistantText);
      if (jsonStr) {
        try {
          const tasksArr = JSON.parse(jsonStr);
          const tasks = Array.isArray(tasksArr) ? tasksArr.filter((t: any) => t && t.startMin !== undefined) : [];
          if (tasks.length > 0) {
            const normalizedTasks: PendingTask[] = tasks.map((t: any) => ({
              id: Math.random().toString(36).substring(2, 9),
              startMin: t.startMin,
              endMin: t.endMin,
              label: t.label,
              typeId: t.typeId || 'uncat',
              targetDate: t.targetDate || dateKey,
              isDeadline: !!t.isDeadline,
              frequency: t.frequency
            }));

            if (db.aiChats.config.skipAiDoubleCheck) {
              // Direct apply to potentially multiple days or recurring list
              const newDb = JSON.parse(JSON.stringify(db));
              normalizedTasks.forEach(task => {
                if (task.frequency) {
                  // Add to recurring tasks
                  if (!newDb.recurringTasks) newDb.recurringTasks = { list: [] };
                  newDb.recurringTasks.list.push({
                    id: task.id!,
                    startMin: task.startMin,
                    endMin: task.endMin,
                    label: task.label,
                    typeId: task.typeId,
                    frequency: task.frequency,
                    startDate: task.targetDate,
                    isDeadline: task.isDeadline
                  });
                } else {
                  let dayData = newDb.days[task.targetDate];
                  if (!dayData) {
                    dayData = {
                      activities: [],
                      pomodoro: { morning: 0, noon: 0, evening: 0 },
                      sleep: { wake: "08:00", bed: "23:00" },
                      diary: { title: "", text: "", mood: 3, tags: [], updatedAt: Date.now() }
                    };
                    newDb.days[task.targetDate] = dayData;
                  }
                  dayData.activities.push({
                    id: task.id,
                    startMin: task.startMin,
                    endMin: task.endMin,
                    label: task.label,
                    typeId: task.typeId,
                    isDeadline: task.isDeadline
                  });
                }
              });
              updateDb(newDb);
            } else {
              setPendingTasks(normalizedTasks);
            }
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
    setPendingTasks(null);
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

  const confirmPendingTasks = () => {
    if (!pendingTasks || pendingTasks.length === 0) return;
    const newDb = JSON.parse(JSON.stringify(db));
    
    pendingTasks.forEach(task => {
      if (task.frequency) {
        // Add to recurring tasks
        if (!newDb.recurringTasks) newDb.recurringTasks = { list: [] };
        newDb.recurringTasks.list.push({
          id: task.id!,
          startMin: task.startMin,
          endMin: task.endMin,
          label: task.label,
          typeId: task.typeId,
          frequency: task.frequency,
          startDate: task.targetDate,
          isDeadline: task.isDeadline
        });
      } else {
        let dayData = newDb.days[task.targetDate];
        if (!dayData) {
          dayData = {
            activities: [],
            pomodoro: { morning: 0, noon: 0, evening: 0 },
            sleep: { wake: "08:00", bed: "23:00" },
            diary: { title: "", text: "", mood: 3, tags: [], updatedAt: Date.now() }
          };
          newDb.days[task.targetDate] = dayData;
        }
        dayData.activities.push({
          id: task.id,
          startMin: task.startMin,
          endMin: task.endMin,
          label: task.label,
          typeId: task.typeId,
          isDeadline: task.isDeadline
        });
      }
    });

    // Clear pending tasks in the same update
    const sessionIdx = newDb.aiTimeChats?.sessions.findIndex((s: any) => s.id === activeSessionId);
    if (sessionIdx !== -1) {
      newDb.aiTimeChats.sessions[sessionIdx].pendingTasks = undefined;
    }

    updateDb(newDb);
  };

  const cancelPendingTasks = () => {
    setPendingTasks(null);
  };

  const updatePendingTask = (index: number, updates: Partial<PendingTask>) => {
    if (!pendingTasks) return;
    const updated = [...pendingTasks];
    updated[index] = { ...updated[index], ...updates };
    setPendingTasks(updated);
  };

  const removePendingTask = (index: number) => {
    if (!pendingTasks) return;
    const updated = [...pendingTasks];
    updated.splice(index, 1);
    setPendingTasks(updated.length > 0 ? updated : null);
  };

  return (
    <div className="flex flex-col mt-4 border border-[var(--line)] rounded-[var(--radius)] bg-[var(--panel)] shadow-[var(--shadow)] overflow-hidden h-[400px]">
      <div className="flex h-full">
        {/* Sidebar */}
        {!isSidebarCollapsed && (
          <div className="w-[180px] border-r border-[var(--line)] bg-[var(--panel2)] hidden md:flex flex-col relative">
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
            <button 
              className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-[var(--panel)] border border-[var(--line)] rounded-full flex items-center justify-center shadow-sm z-10 hover:bg-[var(--line)]"
              onClick={() => setIsSidebarCollapsed(true)}
            >
              <ChevronLeft className="w-3 h-3" />
            </button>
          </div>
        )}

        {isSidebarCollapsed && (
          <div className="w-6 border-r border-[var(--line)] bg-[var(--panel2)] hidden md:flex flex-col relative items-center py-4">
             <button 
              className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-[var(--panel)] border border-[var(--line)] rounded-full flex items-center justify-center shadow-sm z-10 hover:bg-[var(--line)]"
              onClick={() => setIsSidebarCollapsed(false)}
            >
              <ChevronRight className="w-3 h-3" />
            </button>
            <div className="flex flex-col gap-4 opacity-50">
               <Bot className="w-4 h-4" />
               <Clock className="w-4 h-4" />
            </div>
          </div>
        )}

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
                 <p className="text-xs text-center px-4">输入你的安排（支持多任务、跨天、DDL 及循环任务），AI 会自动识别并供你确认。</p>
                 <div className="mt-2 flex flex-wrap justify-center gap-2 max-w-[280px]">
                    <span className="text-[10px] bg-[var(--panel2)] border border-[var(--line)] px-2 py-1 rounded cursor-pointer hover:bg-[var(--line)]" onClick={() => handleSend("明天上午10点前要交论文")}>“明天10点前交论文”</span>
                    <span className="text-[10px] bg-[var(--panel2)] border border-[var(--line)] px-2 py-1 rounded cursor-pointer hover:bg-[var(--line)]" onClick={() => handleSend("每天早上8点起床跑步")}>“每天8点起床跑步”</span>
                    <span className="text-[10px] bg-[var(--panel2)] border border-[var(--line)] px-2 py-1 rounded cursor-pointer hover:bg-[var(--line)]" onClick={() => handleSend("明天10点健身，2点看电影")}>“明天10点健身，2点看电影”</span>
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
                       <Markdown>{m.text.replace(/```json[\s\S]*?```/g, "").trim()}</Markdown>
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
                 {m.role === 'model' && i === activeSession.messages.length - 1 && pendingTasks && (
                   <div className="w-full mt-2 p-3 bg-[var(--panel2)] border border-[var(--line)] rounded-lg shadow-sm">
                     <div className="flex items-center justify-between mb-2">
                       <h4 className="text-xs font-bold flex items-center gap-1">
                         <Clock className="w-3.5 h-3.5 text-[var(--accent)]" /> 确认解析出的任务
                       </h4>
                       <span className="text-[10px] text-[var(--muted)]">您可以直接修改下方内容</span>
                     </div>
                     <div className="flex flex-col gap-2">
                       {pendingTasks.map((t, idx) => (
                         <div key={idx} className="flex flex-wrap gap-2 items-center bg-[var(--panel)] p-2 rounded border border-[var(--line)] text-xs">
                           <input 
                             className="flex-1 min-w-[80px] bg-transparent outline-none border-b border-transparent focus:border-[var(--accent)]" 
                             value={t.label || ""} 
                             onChange={e => updatePendingTask(idx, { label: e.target.value })}
                             placeholder="任务名称"
                           />
                           <div className="flex flex-col gap-0.5">
                             {t.targetDate !== dateKey && (
                               <span className="text-[10px] text-[var(--accent)] font-medium">{t.targetDate}</span>
                             )}
                             {t.frequency && (
                               <span className="text-[10px] text-blue-400 font-medium">循环: {t.frequency}</span>
                             )}
                             {t.isDeadline && (
                               <span className="text-[10px] text-red-400 font-medium font-bold">DDL!</span>
                             )}
                             <div className="flex items-center gap-1 text-[var(--muted)]">
                               <input 
                                 className="w-12 bg-transparent text-center outline-none border-[var(--line)] border border-transparent hover:border-[var(--line)] rounded" 
                                 value={minToTime(t.startMin || 0).replace("NaN:NaN", "00:00")} 
                                 onChange={e => {
                                   const m = timeToMin(e.target.value);
                                   if (m !== null) updatePendingTask(idx, { startMin: m });
                                 }}
                               />
                               <span>-</span>
                               <input 
                                 className="w-12 bg-transparent text-center outline-none border-[var(--line)] border border-transparent hover:border-[var(--line)] rounded" 
                                 value={minToTime(t.endMin || 0).replace("NaN:NaN", "00:00")} 
                                 onChange={e => {
                                   const m = timeToMin(e.target.value);
                                   if (m !== null) updatePendingTask(idx, { endMin: m });
                                 }}
                               />
                             </div>
                           </div>
                           <select 
                             className="bg-transparent text-[var(--muted)] outline-none"
                             value={t.typeId}
                             onChange={e => updatePendingTask(idx, { typeId: e.target.value })}
                           >
                             {db.taskTypes.list.map(type => (
                               <option key={type.id} value={type.id}>{type.name}</option>
                             ))}
                             <option value="uncat">未分类</option>
                           </select>
                           <label className="flex items-center gap-1 text-[10px] cursor-pointer">
                             <input 
                               type="checkbox" 
                               checked={t.isDeadline} 
                               onChange={e => updatePendingTask(idx, { isDeadline: e.target.checked })}
                             />
                             <span>DDL</span>
                           </label>
                           <select 
                             className="bg-transparent text-[10px] text-[var(--muted)] outline-none"
                             value={t.frequency || ""}
                             onChange={e => updatePendingTask(idx, { frequency: (e.target.value as any) || undefined })}
                           >
                             <option value="">单次</option>
                             <option value="daily">每天</option>
                             <option value="weekly">每周</option>
                             <option value="monthly">每月</option>
                             <option value="yearly">每年</option>
                           </select>
                           <button className="text-red-400 hover:text-red-500 ml-auto" onClick={() => removePendingTask(idx)}>
                             <X className="w-3.5 h-3.5" />
                           </button>
                         </div>
                       ))}
                     </div>
                     <div className="flex justify-end gap-2 mt-3 pt-2 border-t border-[var(--line)]/50">
                       <Button variant="ghost" onClick={cancelPendingTasks} className="text-xs px-2 py-1">取消</Button>
                       <Button variant="primary" onClick={confirmPendingTasks} className="text-xs px-2 py-1 flex items-center gap-1">
                         <Check className="w-3 h-3" /> 加入时间环
                       </Button>
                     </div>
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
