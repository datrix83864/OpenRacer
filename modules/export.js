// modules/export.js
// Generates CSV and portable JSON packages for race results

function formatTime(seconds) {
  if (seconds == null) return '';
  const s = parseFloat(seconds);
  const mins = Math.floor(s / 60);
  const secs = (s % 60).toFixed(3).padStart(6, '0');
  return mins > 0 ? `${mins}:${secs}` : secs;
}

function csvCell(val) {
  if (val == null) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

// Build CSV from a list of runs, optionally scored by a ScoringEngine instance.
// DNF/DSQ runs are appended after ranked finishers.
function exportRunsToCSV(runs, scoringEngine = null) {
  const headers = ['Rank', 'Bib', 'First Name', 'Last Name', 'Course',
    'Raw Time', 'Adjusted Time', 'Score', 'Status', 'Gender', 'Age', 'Notes'];

  const completed = runs.filter(r => r.status === 'completed');
  const other     = runs.filter(r => r.status !== 'completed');

  const ranked = scoringEngine ? scoringEngine.getLeaderboard(completed) : completed
    .map(r => ({ ...r, score: r.adjustedTime ?? r.totalTime }))
    .sort((a, b) => (a.score ?? Infinity) - (b.score ?? Infinity))
    .map((r, i) => ({ ...r, rank: i + 1 }));

  const allRows = [...ranked, ...other];

  const rows = allRows.map(run => {
    const rank = run.rank ?? '';
    const scoreStr = run.score != null
      ? (scoringEngine ? scoringEngine.formatScore(run.score) : formatTime(run.score))
      : '';
    const notes = run.status === 'dnf'
      ? (run.dnfReason ?? 'DNF')
      : run.status === 'disqualified'
        ? ('DSQ: ' + (run.dsqReason ?? ''))
        : '';

    return [
      rank,
      run.bibNumber ?? '',
      run.metadata?.firstName ?? '',
      run.metadata?.lastName ?? '',
      run.metadata?.course === 'right' ? 'B' : 'A',
      formatTime(run.totalTime),
      formatTime(run.adjustedTime),
      scoreStr,
      run.status,
      run.metadata?.gender ?? '',
      run.metadata?.age ?? '',
      notes
    ].map(csvCell).join(',');
  });

  return [headers.map(csvCell).join(','), ...rows].join('\n');
}

// Build a portable JSON package containing both runs and racers for transfer
// between machines or archiving.
function exportToPackage(runs, racers, config = {}) {
  return JSON.stringify({
    version:    '1.0',
    exportedAt: new Date().toISOString(),
    mountain:   config.mountainId ?? 'unknown',
    raceId:     config.raceId ?? null,
    formula:    config.formula ?? { type: 'raw_time' },
    runs:       runs ?? [],
    racers:     racers ?? []
  }, null, 2);
}

// Parse an imported package. Returns { runs, racers, formula, metadata }.
function importFromPackage(json) {
  const data = typeof json === 'string' ? JSON.parse(json) : json;
  return {
    runs:   data.runs   ?? [],
    racers: data.racers ?? [],
    formula: data.formula ?? { type: 'raw_time' },
    metadata: {
      version:    data.version,
      exportedAt: data.exportedAt,
      mountain:   data.mountain,
      raceId:     data.raceId
    }
  };
}

module.exports = { exportRunsToCSV, exportToPackage, importFromPackage };
