import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useAppStore } from '../lib/store';
import { ymd, clamp } from '../lib/utils';
import { ActivityModal } from './ActivityModal';
import { ActivitySegment } from '../lib/types';

interface SegmentInfo {
  startMin: number;
  endMin: number;
}

export function RingChart() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { db, selectedDate, theme, getDayData, getCombinedActivities } = useAppStore();
  
  const [modalOpen, setModalOpen] = useState(false);
  const [dragPreview, setDragPreview] = useState<SegmentInfo | null>(null);
  const [selectedRange, setSelectedRange] = useState<SegmentInfo | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const dateKey = ymd(selectedDate);
  const isToday = ymd(new Date()) === dateKey;
  const acts = getCombinedActivities(dateKey);
  const typeMap = useMemo(() => {
    const map = new Map<string, string>();
    db.taskTypes.list.forEach(t => map.set(t.id, t.color));
    map.set("uncat", "#7aa2ff");
    return map;
  }, [db.taskTypes.list]);

  // Drawing
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);

    const w = rect.width;
    const h = rect.height;
    const cx = w / 2;
    const cy = h / 2;
    const outer = Math.min(w, h) * 0.45;
    const inner = outer * 0.72;

    const minToAngle = (min: number) => {
      const ratio = min / 1440;
      return (-Math.PI / 2) + ratio * Math.PI * 2;
    };

    // 背景盘
    ctx.beginPath();
    ctx.arc(cx, cy, outer, 0, Math.PI * 2);
    ctx.arc(cx, cy, inner, 0, Math.PI * 2, true);
    ctx.fillStyle = theme === 'light' ? "rgba(10,20,40,.03)" : "rgba(255,255,255,.03)";
    ctx.fill("evenodd");

    // 刻度
    for (let m = 0; m < 1440; m += 15) {
      const a = minToAngle(m);
      const isHour = m % 60 === 0;
      const hr = Math.floor(m / 60);
      const strong = isHour && (hr % 6 === 0);
      const medium = isHour && !strong;
      
      const tickInner = strong ? inner - 8 : (medium ? inner - 4 : inner - 2);
      const tickOuter = strong ? outer + 4 : (medium ? outer + 2 : outer);
      
      const x1 = cx + Math.cos(a) * tickInner;
      const y1 = cy + Math.sin(a) * tickInner;
      const x2 = cx + Math.cos(a) * tickOuter;
      const y2 = cy + Math.sin(a) * tickOuter;
      
      if (strong) {
        ctx.strokeStyle = theme === 'light' ? "rgba(10,20,40,.25)" : "rgba(255,255,255,.3)";
        ctx.lineWidth = 2.5;
      } else if (medium) {
        ctx.strokeStyle = theme === 'light' ? "rgba(10,20,40,.12)" : "rgba(255,255,255,.15)";
        ctx.lineWidth = 1.5;
      } else {
        ctx.strokeStyle = theme === 'light' ? "rgba(10,20,40,.05)" : "rgba(255,255,255,.05)";
        ctx.lineWidth = 1;
      }
      
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();

      if (isHour && (hr % 3 === 0)) {
        const tx = cx + Math.cos(a) * (inner - 24);
        const ty = cy + Math.sin(a) * (inner - 24);
        ctx.fillStyle = theme === 'light' ? "rgba(19,25,39,.7)" : "rgba(233,238,252,.7)";
        ctx.font = `600 11px ui-sans-serif, system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(hr).padStart(2, "0") + ":00", tx, ty);
      }
    }

    // 活动段
    acts.forEach(seg => {
      let a1 = minToAngle(seg.startMin);
      let a2 = minToAngle(seg.endMin);
      
      // 添加极小间距以区隔不同任务块
      const margin = 0.01;
      if ((a2 - a1) > margin * 2.5) {
        a1 += margin;
        a2 -= margin;
      }

      ctx.beginPath();
      ctx.arc(cx, cy, outer - 2, a1, a2);
      ctx.arc(cx, cy, inner + 2, a2, a1, true);
      ctx.closePath();
      ctx.fillStyle = typeMap.get(seg.typeId) || "#7aa2ff";
      ctx.globalAlpha = 0.86;
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    // 预览
    if (dragPreview) {
      const a1 = minToAngle(dragPreview.startMin);
      const a2 = minToAngle(dragPreview.endMin);
      ctx.beginPath();
      ctx.arc(cx, cy, outer, a1, a2);
      ctx.arc(cx, cy, inner, a2, a1, true);
      ctx.closePath();
      ctx.fillStyle = theme === 'light' ? "rgba(10,20,40,.10)" : "rgba(255,255,255,.16)";
      ctx.fill();
    }

    // 当前时间指针
    if (isToday) {
      const now = new Date();
      const nowMin = now.getHours() * 60 + now.getMinutes();
      const a = minToAngle(nowMin);
      const x1 = cx + Math.cos(a) * (inner - 2);
      const y1 = cy + Math.sin(a) * (inner - 2);
      const x2 = cx + Math.cos(a) * (outer + 10);
      const y2 = cy + Math.sin(a) * (outer + 10);
      ctx.strokeStyle = "rgba(70,211,154,.9)";
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.fillStyle = "rgba(70,211,154,.95)";
      ctx.beginPath(); ctx.arc(x2, y2, 4, 0, Math.PI * 2); ctx.fill();
    }

    // 中心文本
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    if (dragPreview) {
      const { startMin, endMin } = dragPreview;
      const sH = Math.floor(startMin / 60);
      const sM = startMin % 60;
      const eH = Math.floor(endMin / 60);
      const eM = endMin % 60;
      const timeStr = `${String(sH).padStart(2, "0")}:${String(sM).padStart(2, "0")} - ${String(eH).padStart(2, "0")}:${String(eM).padStart(2, "0")}`;
      
      const dur = endMin - startMin;
      const dH = Math.floor(dur / 60);
      const dM = dur % 60;
      let durStr = "";
      if (dH > 0) durStr += `${dH}小时`;
      if (dM > 0 || dH === 0) durStr += `${dM}分钟`;

      ctx.fillStyle = theme === 'light' ? "rgba(19,25,39,.92)" : "rgba(233,238,252,.92)";
      ctx.font = `700 20px ui-sans-serif, system-ui, sans-serif`;
      ctx.fillText(timeStr, cx, cy - 12);
      
      ctx.fillStyle = theme === 'light' ? "rgba(19,25,39,.6)" : "rgba(233,238,252,.6)";
      ctx.font = `500 14px ui-sans-serif, system-ui, sans-serif`;
      ctx.fillText(durStr, cx, cy + 14);
    } else {
      const dateStr = `${selectedDate.getFullYear()}年${String(selectedDate.getMonth() + 1).padStart(2, "0")}月${String(selectedDate.getDate()).padStart(2, "0")}日`;
      ctx.fillStyle = theme === 'light' ? "rgba(19,25,39,.92)" : "rgba(233,238,252,.92)";
      ctx.font = `700 22px ui-sans-serif, system-ui, sans-serif`;
      ctx.fillText(dateStr, cx, cy - 16);
      
      if (isToday) {
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
        ctx.font = `700 18px ui-sans-serif, system-ui, sans-serif`;
        ctx.fillText(timeStr, cx, cy + 12);
      }
    }
  }, [acts, dragPreview, selectedDate, theme, isToday, typeMap]);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    // 强制每分钟重绘当天时间指针
    if (!isToday) return;
    const interval = setInterval(draw, 60000);
    return () => clearInterval(interval);
  }, [draw, isToday]);

  // Handle Drag
  type DragAction = 'create' | 'move' | 'resize-start' | 'resize-end';
  const draggingRef = useRef(false);
  const dragStartRef = useRef<number | null>(null);
  const dragHitIndexRef = useRef<number>(-1);
  const dragModeRef = useRef<DragAction>('create');
  const dragOriginalActRef = useRef<ActivitySegment | null>(null);

  const getAngle = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    if (!canvasRef.current) return null;
    let clientX, clientY;
    if ('touches' in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    const rect = canvasRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    const w = rect.width;
    const h = rect.height;
    const cx = w / 2;
    const cy = h / 2;
    const outer = Math.min(w, h) * 0.45;
    const inner = outer * 0.72;

    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.hypot(dx, dy);
    
    // Looser hit detection for edges
    if (dist < inner - 20 || dist > outer + 30) return null;
    return Math.atan2(dy, dx);
  };

  const { updateDb } = useAppStore();

  const angleToMin = (ang: number) => {
    let a = ang - (-Math.PI / 2);
    while (a < 0) a += Math.PI * 2;
    while (a >= Math.PI * 2) a -= Math.PI * 2;
    const min = Math.round((a / (Math.PI * 2)) * 1440);
    return Math.round(min / 5) * 5; // Snap to 5 minutes
  };

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    const ang = getAngle(e);
    if (ang == null) return;
    draggingRef.current = true;
    const min = angleToMin(ang);
    dragStartRef.current = min;

    let hitIndex = -1;
    let dragMode: DragAction = 'create';
    let originalAct = null;

    // Search backwards to hit topmost drawn items
    for (let i = acts.length - 1; i >= 0; i--) {
      const seg = acts[i];
      // Check if min falls within segment boundaries with a small tolerance
      if (min >= seg.startMin - 15 && min <= seg.endMin + 15) {
        hitIndex = i;
        originalAct = seg;
        const distStart = Math.abs(min - seg.startMin);
        const distEnd = Math.abs(min - seg.endMin);
        const dur = seg.endMin - seg.startMin;
        
        const edgeThreshold = Math.min(20, dur / 3); // Dynamic edge area
        
        if (distStart <= edgeThreshold && distStart <= distEnd) {
          dragMode = 'resize-start';
        } else if (distEnd <= edgeThreshold) {
          dragMode = 'resize-end';
        } else {
          dragMode = 'move';
        }
        break;
      }
    }

    dragHitIndexRef.current = hitIndex;
    dragModeRef.current = dragMode;
    dragOriginalActRef.current = originalAct;

    if (dragMode === 'create') {
      setDragPreview({ startMin: min, endMin: min });
    } else if (originalAct) {
      setDragPreview({ startMin: originalAct.startMin, endMin: originalAct.endMin });
    }
  };

  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!draggingRef.current || dragStartRef.current == null) return;
      const ang = getAngle(e);
      if (ang == null) return;
      
      const min = angleToMin(ang);
      const mode = dragModeRef.current;
      const originalAct = dragOriginalActRef.current;
      
      let s = 0, end = 0;

      if (mode === 'create') {
        s = Math.min(dragStartRef.current, min);
        end = Math.max(dragStartRef.current, min);
      } else if (originalAct) {
        if (mode === 'resize-start') {
          s = Math.min(min, originalAct.endMin - 5); // Prevent negative duration
          end = originalAct.endMin;
        } else if (mode === 'resize-end') {
          s = originalAct.startMin;
          end = Math.max(min, originalAct.startMin + 5);
        } else if (mode === 'move') {
          const offset = min - dragStartRef.current;
          const dur = originalAct.endMin - originalAct.startMin;
          s = originalAct.startMin + offset;
          end = s + dur;
          
          // Clamp to stay within 24h
          if (s < 0) {
            s = 0;
            end = dur;
          } else if (end > 1440) {
            end = 1440;
            s = 1440 - dur;
          }
        }
      }
      
      setDragPreview({ startMin: s, endMin: end });
    };

    const handleUp = (e: MouseEvent | TouchEvent) => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      
      // Determine click vs drag
      let isClick = true;
      if (dragStartRef.current != null) {
        const ang = getAngle(e);
        if (ang != null) {
          const min = angleToMin(ang);
          if (Math.abs(min - dragStartRef.current) > 10) {
            isClick = false;
          }
        } else if (dragPreview) { // Pointer left canvas but still dragged
          const movedStart = Math.abs(dragPreview.startMin - (dragOriginalActRef.current?.startMin || dragStartRef.current));
          const movedEnd = Math.abs(dragPreview.endMin - (dragOriginalActRef.current?.endMin || dragStartRef.current));
          if (movedStart > 10 || movedEnd > 10) isClick = false;
        }
      }

      if (isClick && dragHitIndexRef.current !== -1) {
        // It's a click on an existing segment
        const act = acts[dragHitIndexRef.current];
        setDragPreview(null);
        setSelectedRange({ startMin: act.startMin, endMin: act.endMin });
        setEditingIndex(dragHitIndexRef.current);
        setModalOpen(true);
        return;
      }

      if (isClick && dragHitIndexRef.current === -1) {
        // Clicked empty space
        let s = dragStartRef.current || 0;
        let end = clamp(s + 30, 0, 1440);
        setDragPreview(null);
        setSelectedRange({ startMin: s, endMin: end });
        setEditingIndex(null);
        setModalOpen(true);
        return;
      }

      // It was a drag!
      if (dragPreview && dragOriginalActRef.current && dragModeRef.current !== 'create') {
        const actingAct = dragOriginalActRef.current;
        const newDb = JSON.parse(JSON.stringify(db)); // Deep copy using util inside? No we can't deep copy whole DB if functions are there. Actually wait, db is JSON serializable.
        // Let's manually apply update
        
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

        const newActs = [...todaysData.activities];

        const seg: ActivitySegment = { 
          ...actingAct,
          startMin: dragPreview.startMin,
          endMin: dragPreview.endMin
        };

        if (actingAct.isRecurring) {
          // If it was a recurring task from global, we must create an override instance 
          // because drag-and-drop on RingChart modifies ONLY the current day's instance.
          const normIdx = newActs.findIndex((a: ActivitySegment) => a.id === actingAct.id || (a.startMin === actingAct.startMin && a.endMin === actingAct.endMin && a.label === actingAct.label));
          if (normIdx >= 0) {
            newActs[normIdx] = seg;
          } else {
            // Give the override an ID representing this specific day if missing? No, segId is fine
            seg.id = seg.id || Math.random().toString(36).substring(2, 9);
            newActs.push(seg);
          }
        } else {
          // Update normal task
          const normIdx = newActs.findIndex((a: ActivitySegment) => a.id === actingAct.id || (a.startMin === actingAct.startMin && a.endMin === actingAct.endMin && a.label === actingAct.label));
          if(normIdx >= 0) newActs[normIdx] = seg;
          else newActs.push(seg);
        }
        
        newDb.days[dateKey].activities = newActs;
        updateDb(newDb);
        setDragPreview(null);
        return;
      }

      // If it was a create drag
      if (dragPreview && dragModeRef.current === 'create') {
        setDragPreview(null);
        setSelectedRange({ startMin: dragPreview.startMin, endMin: dragPreview.endMin });
        setEditingIndex(null);
        setModalOpen(true);
        return;
      }

      setDragPreview(null);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleUp);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
    };
  }, [dragPreview, db, dateKey, updateDb, acts]); // acts is needed for hit tests? acts changes draw so it's fresh.


  return (
    <div className="w-full flex items-center justify-center relative touch-none" ref={containerRef}>
      <canvas 
        ref={canvasRef} 
        style={{ width: '100%', maxWidth: '520px', aspectRatio: '1/1', display: 'block' }} 
        onMouseDown={handlePointerDown}
        onTouchStart={handlePointerDown}
      />
      
      {modalOpen && selectedRange && (
        <ActivityModal 
          isOpen={modalOpen} 
          onClose={() => setModalOpen(false)} 
          initialRange={selectedRange} 
          editingIndex={editingIndex} 
        />
      )}
    </div>
  );
}
