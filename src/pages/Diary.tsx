import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAppStore } from '../lib/store';
import { Button } from '../components/ui/Button';
import { ymd, parseYMD } from '../lib/utils';
import { Modal } from '../components/ui/Modal';
import { DiaryChart } from '../components/DiaryChart';
import { Smile, Meh, Frown } from 'lucide-react';

const MOODS = [
  { v: 0, t: "全部", icon: null },
  { v: 1, t: "开心", icon: Smile },
  { v: 2, t: "满意", icon: Smile },
  { v: 3, t: "普通", icon: Meh },
  { v: 4, t: "难过", icon: Frown },
  { v: 5, t: "很糟糕", icon: Frown },
];

export function DiaryScreen() {
  const { db, selectedDate, setSelectedDate, getDayData, updateDayData } = useAppStore();
  const dateKey = ymd(selectedDate);
  const diary = getDayData(dateKey).diary;

  const [dateModalOpen, setDateModalOpen] = useState(false);
  const [datePickerVal, setDatePickerVal] = useState(dateKey);
  
  const [searchWord, setSearchWord] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [moodFilter, setMoodFilter] = useState<number>(0); // 0=all

  // Local state for auto-save
  const [isSaved, setIsSaved] = useState(true);
  const [title, setTitle] = useState(diary.title);
  const [text, setText] = useState(diary.text);
  const [tags, setTags] = useState(diary.tags.join(', '));
  const [mood, setMood] = useState(diary.mood);

  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setTitle(diary.title);
    setText(diary.text);
    setTags(diary.tags.join(', '));
    setMood(diary.mood);
    setIsSaved(true);
  }, [dateKey]);

  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    }
  }, []);

  const triggerAutoSave = () => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    setIsSaved(false);
    autoSaveTimerRef.current = setTimeout(() => {
      saveDiary();
    }, 600);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    if (e.target.name === 'title') setTitle(e.target.value);
    if (e.target.name === 'text') setText(e.target.value);
    if (e.target.name === 'tags') setTags(e.target.value);
    triggerAutoSave();
  };

  const handleMoodClick = (v: number) => {
    setMood(v);
    triggerAutoSave();
  };

  const saveDiary = () => {
    const updatedTags = tags.split(/[,，]/g).map(x => x.trim()).filter(Boolean).slice(0, 20);
    updateDayData(dateKey, {
      diary: { title: title.trim(), text, mood, tags: updatedTags, updatedAt: Date.now() }
    });
    setIsSaved(true);
  };

  const handleDelete = () => {
    if (!title.trim() && !text.trim()) return alert("当天没有日记。");
    if (!confirm(`确定删除 ${dateKey} 的日记吗？`)) return;
    updateDayData(dateKey, {
      diary: { title: "", text: "", mood: 0, tags: [], updatedAt: 0 }
    });
  };

  const wordCount = (s: string) => s.replace(/\s+/g, "").length;
  const currentWordCount = wordCount(title + text);

  // List processing
  const listItems = useMemo(() => {
    const keys = Object.keys(db.days).filter(k => {
      const d = db.days[k].diary;
      return d && (d.title.trim() || d.text.trim());
    });
    keys.sort((a,b) => {
      const da = db.days[a].diary.updatedAt;
      const dbb = db.days[b].diary.updatedAt;
      if (dbb !== da) return dbb - da;
      return b > a ? 1 : -1;
    });
    return keys;
  }, [db.days]);

  const filteredItems = useMemo(() => {
    const q = searchWord.trim().toLowerCase();
    const tf = tags.split(/[,，]/g).map(x => x.trim()).filter(Boolean);
    
    return listItems.filter(k => {
      const d = db.days[k].diary;
      if (moodFilter !== 0 && d.mood !== moodFilter) return false;
      
      if (tf.length > 0) {
        const set = new Set(d.tags.map(x => x.toLowerCase()));
        if (!tf.every(t => set.has(t.toLowerCase()))) return false;
      }

      if (q) {
        const blob = `${d.title} ${d.text} ${d.tags.join(" ")}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    }).slice(0, 60);
  }, [listItems, searchWord, tags, moodFilter, db.days]);

  const handleJumpToday = () => {
    setSelectedDate(new Date(new Date().setHours(0,0,0,0)));
  };

  const insertTemplate = () => {
    const tpl = `# 今日三件事\n1.\n2.\n3.\n\n# 一句话复盘\n-\n\n# 情绪/能量\n- 情绪：\n- 能量：`;
    setText(text.trim() ? text + "\n\n" + tpl : tpl);
    triggerAutoSave();
  };

  const copyFullText = async () => {
    const content = `${title}\n\n${text}`.trim();
    if (!content) return alert("没有可复制内容。");
    try {
      await navigator.clipboard.writeText(content);
      alert("已复制到剪贴板。");
    } catch {
      alert("复制失败：浏览器未授权剪贴板。");
    }
  };

  return (
    <div className="grid md:grid-cols-[1fr_minmax(0,1fr)] gap-3.5 mt-4 items-start">
      {/* Editor */}
      <div className="bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius)] shadow-[var(--shadow)] overflow-hidden">
        <div className="flex items-center justify-between p-3 border-b border-[color-mix(in_srgb,var(--line)_85%,transparent)] bg-[color-mix(in_srgb,var(--panel2)_65%,transparent)] flex-wrap gap-2.5">
          <h2 className="m-0 text-[13px] font-bold">编辑日记</h2>
          <Button onClick={handleJumpToday}>写当天</Button>
        </div>
        <div className="p-3.5 flex flex-col gap-3.5">
          <div>
             <div className="text-[var(--muted)] text-xs mb-1">今天日期</div>
             <div className="text-base cursor-pointer hover:underline" onClick={() => {
                setDatePickerVal(ymd(selectedDate));
                setDateModalOpen(true);
             }}>{dateKey}</div>
          </div>
          
          <div className="flex flex-col gap-2.5">
            <input 
               type="text" 
               name="title"
               placeholder="标题（可空）" 
               className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[color-mix(in_srgb,var(--panel2)_62%,transparent)] text-[var(--text)] outline-none"
               value={title}
               onChange={handleTextChange}
            />
            
            <div className="flex flex-wrap gap-2 items-center">
               <div className="border border-[var(--line)] px-2.5 py-1 rounded-full text-xs text-[var(--muted)] select-none">心情</div>
               <div className="flex gap-1.5">
                  {MOODS.filter(m => m.v !== 0).map(m => (
                    <button 
                      key={m.v}
                      className={`w-7 h-7 rounded-full border border-[var(--line)] bg-transparent text-sm flex items-center justify-center cursor-pointer transition-colors ${mood === m.v ? 'border-[color-mix(in_srgb,var(--accent)_70%,var(--line))] text-[var(--accent)]' : 'text-[var(--muted)]'}`}
                      onClick={() => handleMoodClick(m.v)}
                      title={m.t}
                    >
                      {m.icon && <m.icon className="w-4 h-4" />}
                    </button>
                  ))}
               </div>
               <div className="border border-[var(--line)] px-2.5 py-1 rounded-full text-xs text-[var(--muted)] select-none">{currentWordCount} 字</div>
            </div>

            <input 
               type="text" 
               name="tags"
               placeholder="标签：例如 学习, 运动, 想法（逗号分隔）" 
               className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[color-mix(in_srgb,var(--panel2)_62%,transparent)] text-[var(--text)] outline-none text-xs"
               value={tags}
               onChange={handleTextChange}
            />

            <textarea 
               rows={12}
               name="text"
               placeholder="写点什么…（支持纯文本）"
               className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[color-mix(in_srgb,var(--panel2)_62%,transparent)] text-[var(--text)] outline-none resize-y min-h-[120px]"
               value={text}
               onChange={handleTextChange}
            />

            <div className="flex justify-between flex-wrap gap-2 mt-2">
               <div className="flex items-center gap-2">
                 <Button onClick={insertTemplate}>插入模板</Button>
                 <Button onClick={copyFullText}>复制全文</Button>
                 <span className="text-[11px] ml-2" style={{ color: isSaved ? 'var(--good)' : 'var(--muted)' }}>
                   {isSaved ? "已保存" : "未保存"}
                 </span>
               </div>
               <div className="flex items-center gap-2">
                 <Button variant="danger" onClick={handleDelete}>删除当天</Button>
                 <Button variant="primary" onClick={saveDiary}>保存</Button>
               </div>
            </div>

          </div>
        </div>
      </div>

      {/* List and Chart */}
      <div className="bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius)] shadow-[var(--shadow)] overflow-hidden">
        <div className="flex items-center justify-between p-3 border-b border-[color-mix(in_srgb,var(--line)_85%,transparent)] bg-[color-mix(in_srgb,var(--panel2)_65%,transparent)] flex-wrap gap-2.5">
          <h2 className="m-0 text-[13px] font-bold">日记库</h2>
          <Button onClick={handleJumpToday}>今天</Button>
        </div>
        <div className="p-3.5 flex flex-col gap-3.5">
          
          <input 
            type="text" 
            placeholder="搜索：标题 / 正文 / 标签…" 
            className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[color-mix(in_srgb,var(--panel2)_62%,transparent)] text-[var(--text)] outline-none text-xs"
            value={searchWord}
            onChange={e => setSearchWord(e.target.value)}
          />

          <div className="flex flex-wrap gap-2">
            <div 
              className="border border-[var(--line)] px-2.5 py-1.5 rounded-full text-xs text-[var(--muted)] cursor-pointer select-none hover:bg-slate-800 flex items-center gap-1.5"
              onClick={() => {
                setMoodFilter((moodFilter + 1) % 6);
              }}
            >
              心情：
              {moodFilter === 0 ? "全部" : (
                <>
                  {(() => {
                    const m = MOODS.find(x => x.v === moodFilter);
                    return m && m.icon ? <m.icon className="w-3 h-3" /> : null;
                  })()}
                  <span className="text-[10px]">{MOODS.find(x => x.v === moodFilter)?.t}</span>
                </>
              )}
            </div>
            <input 
               className="flex-1 min-w-[180px] p-1.5 rounded-xl border border-[var(--line)] bg-[color-mix(in_srgb,var(--panel2)_62%,transparent)] text-[var(--text)] outline-none text-xs px-3"
               placeholder="标签过滤（逗号分隔）"
               value={tagFilter}
               onChange={e => setTagFilter(e.target.value)}
            />
            <Button onClick={() => { setMoodFilter(0); setSearchWord(''); setTagFilter(''); }}>重置</Button>
          </div>

          <div className="h-[1px] bg-[color-mix(in_srgb,var(--line)_85%,transparent)] my-1"></div>
          
          <div className="text-[11px] text-[var(--muted)]">最近记录</div>
          
          <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
             {filteredItems.length === 0 ? (
               <div className="text-[var(--muted)] text-sm py-4">暂无匹配日记。可以点“写当天”。</div>
             ) : (
               filteredItems.map(k => {
                 const d = db.days[k].diary;
                 const isActive = k === dateKey;
                 const snippet = (d.text || "").trim().slice(0, 44).replace(/\s+/g, " ");
                 const m = MOODS.find(x => x.v === d.mood);
                 const moodIcon = m && m.icon ? <m.icon className="w-3 h-3" /> : null;
                 const wc = wordCount(d.title + d.text);
                 
                 return (
                   <div 
                     key={k} 
                     className={`border border-[var(--line)] bg-[color-mix(in_srgb,var(--panel2)_62%,transparent)] rounded-xl p-2.5 cursor-pointer transition-all duration-140 hover:-translate-y-px hover:border-[color-mix(in_srgb,var(--accent)_45%,var(--line))] ${isActive ? 'border-[color-mix(in_srgb,var(--accent)_70%,var(--line))] shadow-md' : ''}`}
                     onClick={() => setSelectedDate(parseYMD(k))}
                   >
                     <div className="flex justify-between items-center gap-2 mb-1.5">
                       <b className="text-xs">{d.title || "（无标题）"}</b>
                       <span className="text-[10px] px-2 py-0.5 rounded-full border border-[var(--line)] text-[var(--muted)]">{k}</span>
                     </div>
                     <div className="text-[11px] text-[var(--muted)] mb-2 whitespace-nowrap overflow-hidden text-ellipsis">
                       {snippet || "（无正文）"}
                     </div>
                     <div className="flex flex-wrap gap-1.5 items-center text-[10px]">
                       <span className="px-2 py-0.5 rounded-full border border-[var(--line)] text-[var(--muted)] flex items-center gap-1">心情 {moodIcon}</span>
                       <span className="px-2 py-0.5 rounded-full border border-[var(--line)] text-[var(--muted)]">{wc} 字</span>
                       {d.tags.slice(0,3).map((t, idx) => (
                          <span key={idx} className="px-2 py-0.5 rounded-full border border-[var(--line)] text-[var(--muted)]">#{t}</span>
                       ))}
                     </div>
                   </div>
                 )
               })
             )}
          </div>

          <div className="h-[1px] bg-[color-mix(in_srgb,var(--line)_85%,transparent)] my-1"></div>
          
          <div className="text-[11px] text-[var(--muted)]">近 14 天日记字数</div>
          <DiaryChart db={db} />

        </div>
      </div>

      {dateModalOpen && (
        <Modal
          title="选择日期"
          onClose={() => setDateModalOpen(false)}
          footer={
             <Button variant="primary" onClick={() => {
                if (datePickerVal) {
                  setSelectedDate(parseYMD(datePickerVal));
                  setDateModalOpen(false);
                }
             }}>确定</Button>
          }
        >
           <input 
              type="date" 
              className="w-full text-base p-2 border border-[var(--line)] rounded-xl bg-[color-mix(in_srgb,var(--panel2)_62%,transparent)] outline-none"
              value={datePickerVal}
              onChange={(e) => setDatePickerVal(e.target.value)}
           />
        </Modal>
      )}

    </div>
  );
}
