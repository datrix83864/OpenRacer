// modules/results.js
// Result summary utilities — kept separate so main.js stays lean

function buildSummary(runs) {
  const completed    = runs.filter(r => r.status === 'completed');
  const dnf          = runs.filter(r => r.status === 'dnf');
  const dsq          = runs.filter(r => r.status === 'disqualified');
  const times        = completed.map(r => r.adjustedTime ?? r.totalTime).filter(t => t != null);
  const avg          = times.length ? times.reduce((a, b) => a + b, 0) / times.length : null;

  return {
    totalRuns:     runs.length,
    completedRuns: completed.length,
    dnfCount:      dnf.length,
    dsqCount:      dsq.length,
    averageTime:   avg != null ? parseFloat(avg.toFixed(3)) : null,
    fastestTime:   times.length ? Math.min(...times) : null,
    slowestTime:   times.length ? Math.max(...times) : null
  };
}

// Split runs by course metadata field
function splitByCourse(runs) {
  const left  = runs.filter(r => (r.metadata?.course ?? 'left') === 'left');
  const right = runs.filter(r => r.metadata?.course === 'right');
  return { left, right };
}

module.exports = { buildSummary, splitByCourse };
