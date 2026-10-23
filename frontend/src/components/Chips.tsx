import type { ReactNode } from 'react';

type ChipTone = 'green' | 'red' | 'amber' | 'blue' | 'neutral';

const TONE_CLASSES: Record<ChipTone, string> = {
  green: 'bg-green-100 text-green-700',
  red: 'bg-red-100 text-red-700',
  amber: 'bg-amber-100 text-amber-700',
  blue: 'bg-blue-100 text-blue-700',
  neutral: 'bg-gray-100 text-gray-500',
};

export function Chip({ tone, children }: { tone: ChipTone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}

export function answerTone(answer: 'Yes' | 'No' | null): ChipTone {
  if (answer === 'Yes') return 'green';
  if (answer === 'No') return 'red';
  return 'neutral';
}

export function dispositionTone(d: 'RL' | 'AB'): ChipTone {
  return d === 'RL' ? 'green' : 'red';
}

export function ratingTone(rating: number): ChipTone {
  if (rating >= 4) return 'green';
  if (rating === 3) return 'amber';
  return 'red';
}

export function ratingLabel(rating: number): string {
  switch (rating) {
    case 5:
      return '5 — Excellent';
    case 4:
      return '4 — Good';
    case 3:
      return '3 — Neutral';
    case 2:
      return '2 — Poor';
    default:
      return '1 — Very poor';
  }
}
