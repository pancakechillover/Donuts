import React, { useRef, useEffect } from 'react';
import { useAppStore } from '../lib/store';
import { ymd, roundRect, timeToMin } from '../lib/utils';

export function SleepTimelineChart() {
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

    ctx.save();
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
        const sl = db.days[k]?.sleep || {wake: "", bed: ""};
        const bedM = timeToMin(sl.bed);
        const wakeM = timeToMin(sl.wake);
        
        arr.push({
            k,
            bed: bedM != null ? ((bedM < 6 * 60 ? bedM + 24 * 60 : bedM) / 60) : null,
            wake: wakeM != null ? ((wakeM < 6 * 60 ? wakeM + 24 * 60 : wakeM) / 60) : null
        });
    }

    const N = arr.length;
    const stepX = W / (N - 1 || 1);

    ctx.strokeStyle = theme === 'light' ? "rgba(10,20,40,.10)" : "rgba(255,255,255,.10)";
    ctx.beginPath(); ctx.moveTo(padL, padT + H); ctx.lineTo(padL + W, padT + H); ctx.stroke();

    const minHour = 6, maxHour = 30;
    ctx.font = "13px sans-serif";
    ctx.fillStyle = "#888";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";

    for (let h = minHour; h <= maxHour; h += 2) {
        const y = padT + ((h - minHour) / (maxHour - minHour)) * H;
        const hrLabel = (h >= 24 ? h - 24 : h).toString().padStart(2, "0") + ":00";
        ctx.fillText(hrLabel, padL - 8, y);
        ctx.strokeStyle = theme === 'light' ? "#e0e7ef" : "rgba(255,255,255,.08)";
        ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padL + W, y); ctx.stroke();
    }

    function drawLine(data: (number|null)[], color: string) {
        ctx.save();
        ctx.beginPath();
        let started = false;
        for (let i = 0; i < N; i++) {
            const v = data[i];
            if (v == null) continue;
            const x = padL + i * stepX;
            const y = padT + ((v - minHour) / (maxHour - minHour)) * H;
            if (!started) { ctx.moveTo(x, y); started = true; }
            else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.stroke();
        
        ctx.beginPath();
        started = false;
        for (let i = 0; i < N; i++) {
            const v = data[i];
            if (v == null) continue;
            const x = padL + i * stepX;
            const y = padT + ((v - minHour) / (maxHour - minHour)) * H;
            if (!started) { ctx.moveTo(x, y); started = true; }
            else ctx.lineTo(x, y);
        }
        ctx.lineTo(padL + (N - 1) * stepX, padT + H);
        ctx.lineTo(padL, padT + H);
        ctx.closePath();

        const grad = ctx.createLinearGradient(0, padT, 0, padT + H);
        grad.addColorStop(0, color + "22");
        grad.addColorStop(1, color + "03");
        ctx.fillStyle = grad;
        ctx.fill();

        for (let i = 0; i < N; i++) {
            const v = data[i];
            if (v == null) continue;
            const x = padL + i * stepX;
            const y = padT + ((v - minHour) / (maxHour - minHour)) * H;
            ctx.beginPath(); ctx.arc(x, y, 5, 0, 2 * Math.PI);
            ctx.fillStyle = color; ctx.globalAlpha = 0.9; ctx.fill();
        }
        ctx.restore();
    }

    drawLine(arr.map(x => x.bed), "#A78BFA");
    drawLine(arr.map(x => x.wake), "#FFCC66");

    ctx.font = "12px sans-serif";
    ctx.fillStyle = "#888";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (let i = 0; i < N; i++) {
        const x = padL + i * stepX;
        ctx.fillText(arr[i].k.slice(5), x, padT + H + 6);
    }

    ctx.font = "13px sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#FFCC66";
    ctx.fillRect(padL + 310, padT - 18, 18, 6);
    ctx.fillStyle = theme === 'light' ? "#222" : "#eee";
    ctx.fillText("起床时间", padL + 334, padT - 15);

    ctx.fillStyle = "#A78BFA";
    ctx.fillRect(padL + 410, padT - 18, 18, 6);
    ctx.fillStyle = theme === 'light' ? "#222" : "#eee";
    ctx.fillText("入睡时间", padL + 434, padT - 15);

    ctx.restore();
  }, [db, theme]);

  return <canvas ref={canvasRef} style={{ width: '100%', height: '500px', display: 'block' }} />;
}
