/**
 * Helpers for visual grading tags, review badges, and status colors
 */

export function getGradeBadge(grade?: string | null) {
  switch (grade) {
    case 'Grade A':
      return {
        label: 'Grade A',
        bg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        badge: 'bg-emerald-500 text-white',
        text: 'text-emerald-700',
      };
    case 'Grade B':
      return {
        label: 'Grade B',
        bg: 'bg-blue-100 text-blue-800 border-blue-300',
        badge: 'bg-blue-500 text-white',
        text: 'text-blue-700',
      };
    case 'Grade C':
      return {
        label: 'Grade C',
        bg: 'bg-amber-100 text-amber-800 border-amber-300',
        badge: 'bg-amber-500 text-white',
        text: 'text-amber-700',
      };
    case 'Reject':
      return {
        label: 'Reject',
        bg: 'bg-rose-100 text-rose-800 border-rose-300',
        badge: 'bg-rose-600 text-white',
        text: 'text-rose-700',
      };
    default:
      return {
        label: grade || 'Pending',
        bg: 'bg-slate-100 text-slate-700 border-slate-300',
        badge: 'bg-slate-500 text-white',
        text: 'text-slate-600',
      };
  }
}

export function getQualityBadge(quality?: string | null) {
  if (quality === 'Healthy') {
    return {
      label: 'Healthy',
      bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      dot: 'bg-emerald-500',
    };
  }
  if (quality === 'Unhealthy') {
    return {
      label: 'Unhealthy',
      bg: 'bg-rose-50 text-rose-700 border-rose-200',
      dot: 'bg-rose-500',
    };
  }
  return {
    label: quality || 'Unknown',
    bg: 'bg-slate-50 text-slate-700 border-slate-200',
    dot: 'bg-slate-400',
  };
}

export function getReviewStatusBadge(reviewStatus?: string | null, needsReview?: boolean | null) {
  if (reviewStatus === 'AUTO_ACCEPTABLE' && !needsReview) {
    return {
      label: 'AUTO ACCEPTABLE',
      description: 'High model confidence; passed quality thresholds.',
      bg: 'bg-emerald-50 text-emerald-800 border-emerald-300',
      dot: 'bg-emerald-500',
    };
  }
  if (reviewStatus === 'REVIEW_RECOMMENDED' || needsReview) {
    return {
      label: 'REVIEW RECOMMENDED',
      description: 'Borderline size, geometry, or quality score.',
      bg: 'bg-amber-50 text-amber-800 border-amber-300',
      dot: 'bg-amber-500',
    };
  }
  if (reviewStatus === 'MANUAL_REVIEW_REQUIRED') {
    return {
      label: 'MANUAL REVIEW REQUIRED',
      description: 'Low model confidence or severe geometry anomaly.',
      bg: 'bg-rose-50 text-rose-800 border-rose-300',
      dot: 'bg-rose-600',
    };
  }
  return {
    label: reviewStatus || 'STANDARD',
    description: '',
    bg: 'bg-slate-100 text-slate-700 border-slate-200',
    dot: 'bg-slate-400',
  };
}

export function getVarietyStyle(variety?: string | null) {
  const v = (variety || '').toLowerCase();
  if (v.includes('red')) {
    return {
      label: 'Red Onion',
      pill: 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300',
      text: 'text-fuchsia-700',
    };
  }
  if (v.includes('yellow') || v.includes('white')) {
    return {
      label: 'Yellow Onion',
      pill: 'bg-amber-100 text-amber-800 border-amber-300',
      text: 'text-amber-700',
    };
  }
  return {
    label: variety || 'Onion',
    pill: 'bg-slate-100 text-slate-800 border-slate-300',
    text: 'text-slate-700',
  };
}
