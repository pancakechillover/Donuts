import React, { useRef, useEffect } from 'react';
import { useAppStore } from '../lib/store';
import { roundRect, setCanvasFont, fmtDuration } from '../lib/utils';

export function StatsPieChart({ dayKey }: { dayKey: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { db, theme } = useAppStore();

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

    ctx.fillStyle = theme === 'light' ? "rgba(10,20,40,.03)" : "rgba(255,255,255,.03)";
    roundRect(ctx, 10, 10, rect.width - 20, rect.height - 20, 14, true, false);

    const W = rect.width;
    const H = rect.height;

    const map = new Map<string, number>();
    const acts = db.days[dayKey]?.activities || [];
    for (const a of acts) {
        const id = a.typeId || "uncat";
        map.set(id, (map.get(id) || 0) + (a.endMin - a.startMin));
    }
    const items = [];
    for (const [id, v] of map.entries()) {
        if (v > 0) {
          const typeDef = db.taskTypes.list.find(t=>t.id===id) || {name:'未分类', color:'#7aa2ff'};
          items.push({ id, v, color: typeDef.color, name: typeDef.name });
        }
    }
    const total = items.reduce((s, x) => s + x.v, 0);

    const cx = W * 0.28;
    const cy = H * 0.53;
    const r = Math.min(H, W) * 0.28;

    ctx.fillStyle = theme === 'light' ? "rgba(19,25,39,.88)" : "rgba(233,238,252,.88)";
    setCanvasFont(ctx, 12, 600);
    ctx.fillText("饼图：时间占比", 44, 18);

    if (!items.length) {
        ctx.fillStyle = theme === 'light' ? "rgba(90,103,134,.95)" : "rgba(169,179,204,.9)";
        setCanvasFont(ctx, 12, 500);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("暂无可统计数据", cx, cy);
        return;
    }

    let start = -Math.PI / 2;
    for (const it of items) {
        const ang = (it.v / total) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, r, start, start + ang);
        ctx.closePath();
        ctx.fillStyle = it.color;
        ctx.globalAlpha = 0.72;
        ctx.fill();
        ctx.globalAlpha = 1;
        start += ang;
    }

    ctx.fillStyle = theme === 'light' ? "rgba(19,25,39,.88)" : "rgba(233,238,252,.88)";
    setCanvasFont(ctx, 12, 700);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${Math.round(total / 60)} 小时`, cx, cy - 6);
    ctx.fillStyle = theme === 'light' ? "rgba(90,103,134,.95)" : "rgba(169,179,204,.9)";
    setCanvasFont(ctx, 11, 500);
    ctx.fillText("（已记录）", cx, cy + 12);
    ctx.textAlign = "start";
    ctx.textBaseline = "alphabetic";

    const lx = W * 0.55;
    let ly = 58;
    for (const it of items.sort((a, b) => b.v - a.v)) {
        const pct = Math.round((it.v / total) * 100);
        ctx.fillStyle = it.color;
        ctx.globalAlpha = 0.85;
        ctx.beginPath(); ctx.arc(lx, ly, 6, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;

        ctx.fillStyle = theme === 'light' ? "rgba(19,25,39,.85)" : "rgba(233,238,252,.85)";
        setCanvasFont(ctx, 12, 600);
        ctx.fillText(`${it.name}`, lx + 14, ly + 4);

        ctx.fillStyle = theme === 'light' ? "rgba(90,103,134,.95)" : "rgba(169,179,204,.9)";
        setCanvasFont(ctx, 11, 500);
        ctx.fillText(`${fmtDuration(it.v)} · ${pct}%`, lx + 140, ly + 4);

        ly += 24;
        if (ly > H - 20) break;
    }
  }, [db, dayKey, theme]);

  return (
    <canvas ref={canvasRef} style={{ width: '100%', height: '260px', display: 'block' }} />
  );
}
