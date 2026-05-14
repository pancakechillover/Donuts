import React, { useRef, useEffect } from 'react';
import { Database } from '../lib/types';
import { ymd, roundRect, setCanvasFont } from '../lib/utils';
import { useAppStore } from '../lib/store';

export function DiaryChart({ db }: { db: Database }) {
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

    const padL = 40, padR = 12, padT = 16, padB = 30;
    const W = rect.width - padL - padR, H = rect.height - padT - padB;

    const arr = [];
    const today = new Date();
    for (let i = 13; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
        const k = ymd(d);
        const dd = db.days[k]?.diary;
        const w = dd ? ((dd.title || "") + (dd.text || "")).replace(/\s+/g,"").length : 0;
        arr.push({ k, w });
    }
    const maxW = Math.max(10, ...arr.map(x => x.w));
    const bw = W / arr.length;

    // 轴
    ctx.strokeStyle = theme === 'light' ? "rgba(10,20,40,.10)" : "rgba(255,255,255,.10)";
    ctx.beginPath(); ctx.moveTo(padL, padT + H); ctx.lineTo(padL + W, padT + H); ctx.stroke();

    // 柱
    arr.forEach((it, idx) => {
        const h = (it.w / maxW) * H;
        const x = padL + idx * bw + bw * 0.18;
        const y = padT + (H - h);
        const w = bw * 0.64;

        ctx.fillStyle = theme === 'light' ? "rgba(59,108,255,.35)" : "rgba(122,162,255,.28)";
        roundRect(ctx, x, y, w, h, 10, true, false);

        // 每隔几天画日期
        if (idx % 3 === 0) {
            ctx.fillStyle = theme === 'light' ? "rgba(19,25,39,.70)" : "rgba(233,238,252,.70)";
            setCanvasFont(ctx, 11, 500);
            ctx.textAlign = "center"; ctx.textBaseline = "top";
            ctx.fillText(it.k.slice(5), x + w / 2, padT + H + 6);
        }
    });

  }, [db, theme]);

  return (
    <div className="w-full">
      <canvas ref={canvasRef} style={{ width: '100%', height: '220px', display: 'block' }} />
    </div>
  );
}
