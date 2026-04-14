"use client";

import { useState, useEffect } from "react";

interface ExamTimerProps {
  startedAt: number;
  duration: number; // seconds
  onTimeUp: () => void;
}

export default function ExamTimer({ startedAt, duration, onTimeUp }: ExamTimerProps) {
  const [remaining, setRemaining] = useState(() => {
    const elapsed = Math.floor((Date.now() - startedAt) / 1000);
    return Math.max(0, duration - elapsed);
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const left = Math.max(0, duration - elapsed);
      setRemaining(left);
      if (left <= 0) {
        clearInterval(timer);
        onTimeUp();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [startedAt, duration, onTimeUp]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const timeStr = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  const isUrgent = remaining <= 300; // last 5 minutes

  return (
    <span
      className={`font-mono text-[13px] font-semibold px-3 py-1 rounded-full ${
        isUrgent
          ? "text-error bg-error-soft animate-pulse"
          : "text-text-muted bg-surface-2"
      }`}
    >
      ⏱ {timeStr}
    </span>
  );
}
