import React, { useRef, useEffect } from 'react';
import { useAppStore } from '../lib/store';
import { ymd, roundRect, setCanvasFont } from '../lib/utils';
import { Habit } from '../lib/types';

interface HabitChartProps {
  habit: Habit;
  getCycleStartForDate: (habit: Habit, dateObj: Date) => string;
  ensureCycleRecord: (habitId: string, cycleKey: string) => boolean[];
}

export function HabitChart({ habit, getCycleStartForDate, ensureCycleRecord }: HabitChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { theme } = useAppStore();

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

    const padL = 40, padR = 20, padT = 24, padB = 32;
    const W = rect.width - padL - padR;
    const H = rect.height - padT - padB;

    const bgGrad = ctx.createLinearGradient(0, 0, 0, rect.height);
    bgGrad.addColorStop(0, theme === 'light' ? "#e3f0ff" : "#232a3a");
    bgGrad.addColorStop(1, theme === 'light' ? "#f7fbff" : "#181c2b");
    ctx.fillStyle = bgGrad;
    roundRect(ctx, 10, 10, rect.width - 20, rect.height - 20, 18, true, false);

    const days = [];
    const today = new Date();
    for (let i = 9; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
        const cycleKey = getCycleStartForDate(habit, d);
        const curCycleStart = new Date(cycleKey);
        const idx = Math.floor((d.getTime() - curCycleStart.getTime()) / 86400000);
        const rec = ensureCycleRecord(habit.id, cycleKey);
        const done = (idx >= 0 && idx < 10) ? !!rec[idx] : false;
        days.push({ key: ymd(d), done });
    }

    const barW = W / days.length;
    ctx.strokeStyle = theme === 'light' ? "#b3d1ff" : "#2c3550";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padL, padT + H);
    ctx.lineTo(padL + W, padT + H);
    ctx.stroke();

    for (let i = 0; i < days.length; i++) {
        const x = padL + i * barW + 2;
        const h = days[i].done ? H * 0.75 : H * 0.2;
        let grad = ctx.createLinearGradient(x, padT + (H - h), x, padT + H);
        if (days[i].done) {
            grad.addColorStop(0, "#2563eb");
            grad.addColorStop(1, "#60a5fa");
        } else {
            grad.addColorStop(0, theme === 'light' ? "#dbeafe" : "#232a3a");
            grad.addColorStop(1, theme === 'light' ? "#e0e7ef" : "#181c2b");
        }
        ctx.fillStyle = grad;
        ctx.shadowColor = days[i].done ? "#60a5fa" : "transparent";
        ctx.shadowBlur = days[i].done ? 8 : 0;
        ctx.fillRect(x, padT + (H - h), Math.max(6, barW - 8), h);
        ctx.shadowBlur = 0;
    }

    ctx.fillStyle = theme === 'light' ? "#3b82f6" : "#7aa2ff";
    setCanvasFont(ctx, 13, 600);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    if (days.length > 0) {
      ctx.fillText(days[0].key.slice(5), padL + barW/2, rect.height - 12);
      ctx.fillText(days[days.length - 1].key.slice(5), padL + W - barW/2, rect.height - 12);
    }
  }, [habit, theme, getCycleStartForDate, ensureCycleRecord]);

  return <canvas ref={canvasRef} style={{ width: '100%', height: '300px', display: 'block' }} />;
}
