import React, { useRef, useEffect } from 'react';
import { useAppStore } from '../lib/store';
import { ymd, roundRect, setCanvasFont, minutesBetween, timeToMin, fmtDuration } from '../lib/utils';

export function SleepChart() {
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

    const padL = 48, padR = 12, padT = 24, padB = 38;
    const W = rect.width - padL - padR;
    const H = rect.height - padT - padB;

    const arr = [];
    const today = new Date();
    for (let i = 13; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
        const k = ymd(d);
        const sl = db.days[k]?.sleep || {wake:"", bed:""};
        const dd = minutesBetween(timeToMin(sl.bed), timeToMin(sl.wake));
        arr.push({ k, dur: dd });
    }

    const vals = arr.map(x => x.dur).filter((x): x is number => x != null);
    const maxV = Math.max(1, ...(vals.length ? vals : [1]));
    const maxHour = Math.ceil(maxV / 60);
    const barW = W / arr.length;

    // 画横轴
    ctx.strokeStyle = theme === 'light' ? "rgba(10,20,40,.10)" : "rgba(255,255,255,.10)";
    ctx.beginPath();
    ctx.moveTo(padL, padT + H);
    ctx.lineTo(padL + W, padT + H);
    ctx.stroke();

    // 纵轴
    ctx.font = "13px sans-serif";
    ctx.fillStyle = "#888";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (let i = 0; i <= maxHour; i++) {
        const y = padT + H - (H * (i / maxHour));
        ctx.fillText(i + "h", padL - 8, y);
        ctx.strokeStyle = theme === 'light' ? "#e0e7ef" : "rgba(255,255,255,.08)";
        ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padL + W, y); ctx.stroke();
    }

    const hitBoxes = [];
    for (let i = 0; i < arr.length; i++) {
        const v = arr[i].dur;
        const x = padL + i * barW + 2;
        if (v == null) {
            ctx.fillStyle = theme === 'light' ? "rgba(10,20,40,.08)" : "rgba(255,255,255,.10)";
            ctx.fillRect(x, padT + H - 10, Math.max(2, barW - 4), 10);
            continue;
        }
        const h = (v / (maxHour * 60)) * (H * 0.9);
        ctx.fillStyle = "#3b6cff";
        ctx.globalAlpha = 0.85;
        ctx.fillRect(x, padT + (H - h), Math.max(8, barW - 8), h);
        ctx.globalAlpha = 1;
        hitBoxes.push({ x, y: padT + (H - h), w: Math.max(8, barW - 8), h, idx: i, item: arr[i] });
    }

    // 日期标签
    ctx.save();
    ctx.font = "12px sans-serif";
    ctx.fillStyle = "#888";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (let i = 0; i < arr.length; i++) {
        const x = padL + i * barW + barW / 2;
        const label = arr[i].k.slice(5); 
        ctx.fillText(label, x, padT + H + 6);
    }
    ctx.restore();

    canvas.onclick = (ev) => {
        const r = canvas.getBoundingClientRect();
        const px = (ev.clientX - r.left) * (canvas.width / r.width / window.devicePixelRatio);
        const py = (ev.clientY - r.top) * (canvas.height / r.height / window.devicePixelRatio);
        for(let hb of hitBoxes) {
            if(px >= hb.x && px <= hb.x + hb.w && py >= hb.y && py <= hb.y + hb.h) {
                if(hb.item.dur != null) {
                    alert(`${hb.item.k}\n睡眠时长：${fmtDuration(hb.item.dur)}`);
                }
            }
        }
    };
  }, [db, theme]);

  return <canvas ref={canvasRef} style={{ width: '100%', height: '400px', display: 'block' }} />;
}
