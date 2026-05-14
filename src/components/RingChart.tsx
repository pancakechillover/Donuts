import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useAppStore } from '../lib/store';
import { ymd, clamp } from '../lib/utils';
import { ActivityModal } from './ActivityModal';

interface SegmentInfo {
  startMin: number;
  endMin: number;
}

export function RingChart() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { db, selectedDate, theme, getDayData } = useAppStore();
  
  const [modalOpen, setModalOpen] = useState(false);
  const [dragPreview, setDragPreview] = useState<SegmentInfo | null>(null);
  const [selectedRange, setSelectedRange] = useState<SegmentInfo | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const dateKey = ymd(selectedDate);
  const isToday = ymd(new Date()) === dateKey;
  const acts = getDayData(dateKey).activities;
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
  const draggingRef = useRef(false);
  const dragStartRef = useRef<number | null>(null);
  const dragHitIndexRef = useRef<number>(-1);

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
    
    if (dist < inner - 10 || dist > outer + 18) return null;
    return Math.atan2(dy, dx);
  };

  const angleToMin = (ang: number) => {
    let a = ang - (-Math.PI / 2);
    while (a < 0) a += Math.PI * 2;
    while (a >= Math.PI * 2) a -= Math.PI * 2;
    const min = Math.round((a / (Math.PI * 2)) * 1440);
    return Math.round(min / 5) * 5;
  };

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    const ang = getAngle(e);
    if (ang == null) return;
    draggingRef.current = true;
    const min = angleToMin(ang);
    dragStartRef.current = min;
    
    // Check if clicking on an existing segment
    const hitIndex = acts.findIndex(seg => min >= seg.startMin && min <= seg.endMin);
    dragHitIndexRef.current = hitIndex;

    setDragPreview({ startMin: min, endMin: min });
  };

  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!draggingRef.current || dragStartRef.current == null) return;
      const ang = getAngle(e);
      if (ang == null) return;
      const min = angleToMin(ang);
      const s = Math.min(dragStartRef.current, min);
      const end = Math.max(dragStartRef.current, min);
      setDragPreview({ startMin: s, endMin: end });
    };

    const handleUp = (e: MouseEvent | TouchEvent) => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      
      let s = dragPreview?.startMin || dragStartRef.current || 0;
      let end = dragPreview?.endMin || dragStartRef.current || 0;
      
      if (Math.abs(end - s) < 5) {
        if (dragHitIndexRef.current !== -1) {
          const act = acts[dragHitIndexRef.current];
          setDragPreview(null);
          setSelectedRange({ startMin: act.startMin, endMin: act.endMin });
          setEditingIndex(dragHitIndexRef.current);
          setModalOpen(true);
          return;
        }

        s = dragStartRef.current || 0;
        end = clamp(s + 30, 0, 1440);
      }
      
      setDragPreview(null);
      setSelectedRange({ startMin: s, endMin: end });
      setEditingIndex(null);
      setModalOpen(true);
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
  }, [dragPreview]);

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
