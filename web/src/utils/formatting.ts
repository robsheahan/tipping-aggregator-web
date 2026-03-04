import { format, parseISO } from 'date-fns';

export function formatProbability(prob: number | undefined | null): string {
  if (prob === undefined || prob === null) return 'N/A';
  return `${(prob * 100).toFixed(1)}%`;
}

export function formatConfidence(confidence: number | undefined | null): string {
  if (confidence === undefined || confidence === null) return 'N/A';
  const percent = confidence * 100;
  if (percent >= 70) return `${percent.toFixed(1)}% (High)`;
  if (percent >= 55) return `${percent.toFixed(1)}% (Medium)`;
  return `${percent.toFixed(1)}% (Low)`;
}

export function formatDateTime(dateStr: string | undefined): string {
  if (!dateStr) return 'N/A';
  try {
    const date = parseISO(dateStr);
    return format(date, 'MMM d, yyyy h:mm a');
  } catch {
    return 'Invalid date';
  }
}

export function formatTimeUntil(dateStr: string | undefined): string {
  if (!dateStr) return 'N/A';
  try {
    const kickoff = parseISO(dateStr);
    const now = new Date();
    const diff = kickoff.getTime() - now.getTime();

    if (diff < 0) return 'Started';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `in ${days}d ${hours % 24}h`;
    }
    if (hours > 0) return `in ${hours}h ${minutes}m`;
    return `in ${minutes}m`;
  } catch {
    return 'Invalid date';
  }
}

export function getTipColor(tip: string | undefined): string {
  if (!tip) return 'text-gray-500';
  if (tip === 'home') return 'text-blue-600';
  if (tip === 'away') return 'text-red-600';
  return 'text-yellow-600';
}

export function getConfidenceColor(confidence: number | undefined | null): string {
  if (!confidence) return 'text-gray-500';
  const percent = confidence * 100;
  if (percent >= 70) return 'text-green-600';
  if (percent >= 55) return 'text-yellow-600';
  return 'text-red-600';
}

export function formatSpread(spread: number | undefined | null): string {
  if (spread === undefined || spread === null) return 'N/A';
  return spread > 0 ? `+${spread.toFixed(1)}` : spread.toFixed(1);
}

export function formatScore(score: number | undefined | null): string {
  if (score === undefined || score === null) return '-';
  return Math.round(score).toString();
}

export function formatConsensusStrength(strength: string | undefined | null): string {
  if (!strength) return 'N/A';
  const labels: Record<string, string> = {
    unanimous: 'Unanimous',
    strong: 'Strong',
    lean: 'Lean',
    split: 'Split',
  };
  return labels[strength] || strength;
}

export function getConsensusColor(strength: string | undefined | null): string {
  if (!strength) return 'text-gray-500';
  if (strength === 'unanimous') return 'text-green-700';
  if (strength === 'strong') return 'text-green-600';
  if (strength === 'lean') return 'text-yellow-600';
  return 'text-red-600';
}
