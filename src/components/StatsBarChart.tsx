import React, { useRef, useEffect } from 'react';
import { useAppStore } from '../lib/store';
import { roundRect, setCanvasFont } from '../lib/utils';
import { Database } from '../lib/types';

interface StatsBarChartProps {
  mode: 'byday' | 'bycat';
  rangeDays: string[];
  typeId: string;
  statsDayKey: string;
  onBarClick: (dayKey: string) => void;
}

export function StatsBarChart({ mode, rangeDays, typeId, statsDayKey, onBarClick }: StatsBarChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { db, theme, getCombinedActivities } = useAppStore();
  const hitBoxesRef = useRef<{x:number, y:number, w:number, h:number, dayKey: string}[]>([]);

  useEffect(() => {
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
    hitBoxesRef.current = [];

    ctx.fillStyle = theme === 'light' ? "rgba(10,20,40,.03)" : "rgba(255,255,255,.03)";
    roundRect(ctx, 10, 10, rect.width - 20, rect.height - 20, 14, true, false);

    const W = rect.width;
    const H = rect.height;

    const sumMinsForType = (day: string, tid: string) => {
      const acts = getCombinedActivities(day);
      return acts.filter(a => (a.typeId || "uncat") === tid).reduce((s, a) => s + (a.endMin - a.startMin), 0);
    };
    
    const getTypeColor = (tid: string) => {
      return db.taskTypes.list.find(t => t.id === tid)?.color || "#7aa2ff";
    };

    if (mode === 'byday') {
      const padL = 44, padR = 16, padT = 22, padB = 28;
      const actW = W - padL - padR;
      const actH = H - padT - padB;

      const vals = rangeDays.map(k => sumMinsForType(k, typeId));
      const maxV = Math.max(1, ...vals);
      const barW = actW / rangeDays.length;

      ctx.strokeStyle = theme === 'light' ? "rgba(10,20,40,.10)" : "rgba(255,255,255,.10)";
      ctx.beginPath(); ctx.moveTo(padL, padT + actH); ctx.lineTo(padL + actW, padT + actH); ctx.stroke();

      const col = getTypeColor(typeId);

      for (let i = 0; i < rangeDays.length; i++) {
        const v = vals[i];
        const h = (v / maxV) * (actH * 0.9);
        const x = padL + i * barW + 2;
        const y = padT + (actH - h);
        const w = Math.max(2, barW - 4);

        ctx.fillStyle = col;
        ctx.globalAlpha = (rangeDays[i] === statsDayKey) ? 0.95 : 0.60;
        ctx.fillRect(x, y, w, h);
        ctx.globalAlpha = 1;

        hitBoxesRef.current.push({ x, y, w, h, dayKey: rangeDays[i] });
      }

      ctx.fillStyle = theme === 'light' ? "rgba(19,25,39,.88)" : "rgba(233,238,252,.88)";
      setCanvasFont(ctx, 12, 600);
      const name = db.taskTypes.list.find(t=>t.id===typeId)?.name || '未分类';
      ctx.fillText(`近 ${rangeDays.length} 天：${name}（分钟）`, padL, 18);

      ctx.fillStyle = theme === 'light' ? "rgba(90,103,134,.95)" : "rgba(169,179,204,.9)";
      setCanvasFont(ctx, 11, 500);
      if (rangeDays.length > 0) {
        ctx.fillText(rangeDays[0], padL, H - 8);
        ctx.fillText(rangeDays[rangeDays.length - 1], padL + actW - 78, H - 8);
      }
    } else {
      const padL = 190, padR = 16, padT = 22, padB = 22;
      const actW = W - padL - padR;
      const actH = H - padT - padB;

      const totals = db.taskTypes.list.map(t => {
          let s = 0;
          for (const k of rangeDays) s += sumMinsForType(k, t.id);
          return { id: t.id, name: t.name, color: t.color, v: s };
      }).filter(x => x.v > 0 || x.id === "uncat");

      const maxV = Math.max(1, ...totals.map(x => x.v));
      const rowH = actH / Math.max(1, totals.length);

      ctx.fillStyle = theme === 'light' ? "rgba(19,25,39,.88)" : "rgba(233,238,252,.88)";
      setCanvasFont(ctx, 12, 600);
      ctx.fillText(`近 ${rangeDays.length} 天：按类别总时长（分钟）`, 44, 18);

      for (let i = 0; i < totals.length; i++) {
        const y = padT + i * rowH + 6;
        const h = Math.max(12, rowH - 12);
        const w = (totals[i].v / maxV) * (actW * 0.95);

        ctx.fillStyle = theme === 'light' ? "rgba(19,25,39,.75)" : "rgba(233,238,252,.75)";
        setCanvasFont(ctx, 11, 600);
        ctx.fillText(totals[i].name, 44, y + h * 0.72);

        ctx.fillStyle = totals[i].color;
        ctx.globalAlpha = 0.60;
        ctx.fillRect(padL, y, w, h);
        ctx.globalAlpha = 1;

        ctx.fillStyle = theme === 'light' ? "rgba(90,103,134,.95)" : "rgba(169,179,204,.9)";
        setCanvasFont(ctx, 11, 500);
        ctx.fillText(`${totals[i].v}`, padL + w + 8, y + h * 0.72);
      }
    }
  }, [db, mode, rangeDays, typeId, statsDayKey, theme]);

  const handleCanvasClick = (ev: React.MouseEvent<HTMLCanvasElement>) => {
    if (mode !== 'byday') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (ev.clientX - rect.left) * (canvas.width / rect.width / (window.devicePixelRatio || 1));
    const y = (ev.clientY - rect.top) * (canvas.height / rect.height / (window.devicePixelRatio || 1));
    
    for (const hb of hitBoxesRef.current) {
        if (x >= hb.x && x <= hb.x + hb.w && y >= hb.y && y <= hb.y + hb.h) {
            onBarClick(hb.dayKey);
            return;
        }
    }
  };

  return (
    <canvas 
      ref={canvasRef} 
      style={{ width: '100%', height: '260px', display: 'block', cursor: mode === 'byday' ? 'pointer' : 'default' }}
      onClick={handleCanvasClick}
    />
  );
}
