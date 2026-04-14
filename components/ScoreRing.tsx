"use client";

interface ScoreRingProps {
  score: number;
  max: number;
}

export default function ScoreRing({ score, max }: ScoreRingProps) {
  const percentage = max > 0 ? score / max : 0;
  const isPass = percentage >= 0.6;
  const color = isPass ? "var(--success)" : "var(--error)";
  const bgColor = isPass ? "var(--success-soft)" : "var(--error-soft)";

  return (
    <div
      className="w-[130px] h-[130px] rounded-full flex items-center justify-center mx-auto mb-2"
      style={{ border: `5px solid ${color}`, background: bgColor }}
    >
      <span
        className="font-mono text-[42px] font-bold tracking-tighter"
        style={{ color }}
      >
        {score}
      </span>
    </div>
  );
}
