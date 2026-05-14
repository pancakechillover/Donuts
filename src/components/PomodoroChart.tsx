import React, { useRef, useEffect } from 'react';
import { useAppStore } from '../lib/store';
import { ymd, roundRect } from '../lib/utils';

export function PomodoroChart() {
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
    for (let i = 9; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
        const k = ymd(d);
        const pp = db.days[k]?.pomodoro || { morning: 0, noon: 0, evening: 0 };
        const morning = pp.morning || 0;
        const noon = pp.noon || 0;
        const evening = pp.evening || 0;
        arr.push({
            k,
            morning,
            noon,
            evening,
            morningHour: +(morning * 25 / 60).toFixed(2),
            noonHour: +(noon * 25 / 60).toFixed(2),
            eveningHour: +(evening * 25 / 60).toFixed(2),
            hourTotal: +((morning + noon + evening) * 25 / 60).toFixed(2)
        });
    }

    const maxHour = Math.max(2, ...arr.map(x => x.hourTotal));
    const barW = W / arr.length;

    // 画横轴
    ctx.strokeStyle = theme === 'light' ? "rgba(10,20,40,.10)" : "rgba(255,255,255,.10)";
    ctx.beginPath(); ctx.moveTo(padL, padT + H); ctx.lineTo(padL + W, padT + H); ctx.stroke();

    // 画纵轴
    ctx.font = "13px sans-serif";
    ctx.fillStyle = "#888";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    const yStep = Math.ceil(maxHour);
    for (let i = 0; i <= yStep; i++) {
        const y = padT + H - (H * (i / yStep));
        ctx.fillText(i.toString(), padL - 8, y);
        ctx.strokeStyle = theme === 'light' ? "#f0f0f0" : "rgba(255,255,255,.08)";
        ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padL + W, y); ctx.stroke();
    }

    const colors = { morning: "#E06C6C", noon: "#ffb347", evening: "#7aa2ff" };

    for (let i = 0; i < arr.length; i++) {
        const x = padL + i * barW + 4;
        let y = padT + H;
        
        const hMorning = (arr[i].morningHour / maxHour) * H;
        ctx.fillStyle = colors.morning;
        ctx.fillRect(x, y - hMorning, Math.max(8, barW - 8), hMorning);
        y -= hMorning;
        
        const hNoon = (arr[i].noonHour / maxHour) * H;
        ctx.fillStyle = colors.noon;
        ctx.fillRect(x, y - hNoon, Math.max(8, barW - 8), hNoon);
        y -= hNoon;
        
        const hEvening = (arr[i].eveningHour / maxHour) * H;
        ctx.fillStyle = colors.evening;
        ctx.fillRect(x, y - hEvening, Math.max(8, barW - 8), hEvening);
    }

    ctx.save();
    ctx.font = "12px sans-serif";
    ctx.fillStyle = "#888";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (let i = 0; i < arr.length; i++) {
        const x = padL + i * barW + barW / 2;
        ctx.fillText(arr[i].k.slice(5), x, padT + H + 6);
    }
    ctx.restore();

    const legend = [
        { color: colors.morning, label: "早晨" },
        { color: colors.noon, label: "中午" },
        { color: colors.evening, label: "晚上" }
    ];
    legend.forEach((item, idx) => {
        ctx.fillStyle = item.color;
        ctx.fillRect(padL + 320 + idx * 70, padT - 18, 16, 12);
        ctx.font = "13px sans-serif";
        ctx.fillStyle = theme === 'light' ? "#444" : "#ccc";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(item.label, padL + 340 + idx * 70, padT - 12);
    });
  }, [db, theme]);

  return <canvas ref={canvasRef} style={{ width: '100%', height: '400px', display: 'block' }} />;
}
