// ui/components/leaderboard.js
// Live results leaderboard with pluggable scoring formula

class LeaderboardPanel {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.runs = [];          // all non-active runs (completed + dnf + dsq)
    this.formulaType = 'raw_time';
    this._pacesetterTime = 0;
    this._courseFilter = 'all';
    this._cleanupFns = [];

    if (!this.container) return;
    this._render();
    this.loadData();
    this._setupUpdates();
  }

  // ── build skeleton ──────────────────────────────────────────────────────────

  _render() {
    this.container.innerHTML = `
      <div class="lb-toolbar">
        <div class="lb-filters">
          <select id="lb-course-filter" class="form-control">
            <option value="all">All Courses</option>
            <option value="left">Course A (Left)</option>
            <option value="right">Course B (Right)</option>
          </select>
          <select id="lb-formula-select" class="form-control">
            <option value="raw_time">Raw Time</option>
            <option value="pacesetter_percent">NASTAR % (pacesetter)</option>
            <option value="handicap">Handicap-adjusted</option>
          </select>
        </div>
        <div class="lb-actions">
          <button id="lb-refresh"         class="btn btn-secondary btn-sm">Refresh</button>
          <button id="lb-export-csv"      class="btn btn-secondary btn-sm">Export CSV</button>
          <button id="lb-export-package"  class="btn btn-secondary btn-sm">Export Package</button>
          <button id="lb-import-package"  class="btn btn-secondary btn-sm">Import Package</button>
        </div>
      </div>
      <div id="lb-body" style="overflow-y:auto;flex:1;"></div>
    `;

    this.container.querySelector('#lb-course-filter').addEventListener('change', e => {
      this._courseFilter = e.target.value;
      this._renderTable();
    });

    this.container.querySelector('#lb-formula-select').addEventListener('change', e => {
      this.formulaType = e.target.value;
      this._renderTable();
    });

    this.container.querySelector('#lb-refresh').addEventListener('click', () => this.loadData());

    this.container.querySelector('#lb-export-csv').addEventListener('click', () => {
      window.raceTiming.export('csv').then(r => {
        if (r?.success)   window.showNotification?.('Exported', `CSV saved to ${r.filePath}`);
        else if (r?.error) window.showNotification?.('Export failed', r.error);
      });
    });

    this.container.querySelector('#lb-export-package').addEventListener('click', () => {
      window.raceTiming.export('package').then(r => {
        if (r?.success)   window.showNotification?.('Exported', `Package saved to ${r.filePath}`);
        else if (r?.error) window.showNotification?.('Export failed', r.error);
      });
    });

    this.container.querySelector('#lb-import-package').addEventListener('click', () => {
      window.raceTiming.importPackage().then(r => {
        if (r?.success) {
          window.showNotification?.('Imported', `${r.runCount} run(s) and ${r.racerCount} racer(s) merged.`);
          this.loadData();
        } else if (r?.error) {
          window.showNotification?.('Import failed', r.error);
        }
      });
    });
  }

  // ── data loading ────────────────────────────────────────────────────────────

  async loadData() {
    try {
      const runs = await window.raceTiming.getAllRuns();
      this.runs = Array.isArray(runs) ? runs : [];
      this._renderTable();
    } catch (err) {
      console.error('Leaderboard loadData failed:', err);
    }
  }

  _setupUpdates() {
    const refresh = () => this.loadData();
    const c1 = window.raceTiming.onRunCompleted(refresh);
    const c2 = window.raceTiming.onRunDNF(refresh);
    const c3 = window.raceTiming.onRunDisqualified(refresh);
    if (typeof c1 === 'function') this._cleanupFns.push(c1);
    if (typeof c2 === 'function') this._cleanupFns.push(c2);
    if (typeof c3 === 'function') this._cleanupFns.push(c3);
  }

  // ── scoring (browser-side, mirrors modules/scoring.js) ─────────────────────

  _score(run) {
    if (run.status !== 'completed') return null;
    const base = run.adjustedTime ?? run.totalTime;
    if (base == null) return null;

    switch (this.formulaType) {
      case 'handicap': {
        const h = parseFloat(run.metadata?.handicap ?? 0) || 0;
        return parseFloat(Math.max(0, base - h).toFixed(3));
      }
      case 'pacesetter_percent': {
        if (!this._pacesetterTime) return null;
        return parseFloat(((this._pacesetterTime / base) * 100).toFixed(2));
      }
      default:
        return base;
    }
  }

  _higherBetter() { return this.formulaType === 'pacesetter_percent'; }

  // ── rendering ───────────────────────────────────────────────────────────────

  _renderTable() {
    const body = this.container.querySelector('#lb-body');

    const pool = this._courseFilter === 'all'
      ? this.runs
      : this.runs.filter(r => (r.metadata?.course ?? 'left') === this._courseFilter);

    const completed = pool.filter(r => r.status === 'completed');
    const others    = pool.filter(r => r.status === 'dnf' || r.status === 'disqualified');

    if (!completed.length && !others.length) {
      body.innerHTML = '<div class="lb-empty">No results yet.</div>';
      return;
    }

    // Score and rank
    const scored = completed
      .map(r => ({ ...r, score: this._score(r) }))
      .filter(r => r.score != null);
    const higherBetter = this._higherBetter();
    scored.sort((a, b) => higherBetter ? b.score - a.score : a.score - b.score);
    const leaderScore = scored[0]?.score ?? null;

    const hasAdj = scored.some(r => r.adjustedTime != null && r.adjustedTime !== r.totalTime);
    const showScore = this.formulaType !== 'raw_time';

    let html = '';

    // Pacesetter input when needed
    if (this.formulaType === 'pacesetter_percent') {
      html += `<div class="lb-pacesetter-row">
        Pacesetter time (seconds):
        <input id="lb-pt-input" class="form-control" type="number" step="0.001" min="0"
               placeholder="e.g. 28.5" style="width:100px;display:inline-block;"
               value="${this._pacesetterTime || ''}">
        <button class="btn btn-secondary btn-sm" id="lb-pt-apply">Apply</button>
      </div>`;
    }

    // Summary row
    html += `<div class="lb-summary">
      ${scored.length} finisher(s)
      ${others.length ? `&nbsp;·&nbsp; ${others.length} DNF/DSQ` : ''}
      ${completed.length && leaderScore != null ? `&nbsp;·&nbsp; Leader: <span class="mono">${this._fmtScore(leaderScore)}</span>` : ''}
    </div>`;

    if (scored.length) {
      html += `<table class="lb-table">
        <thead><tr>
          <th class="lb-rank">Rank</th>
          <th class="lb-bib">Bib</th>
          <th class="lb-name">Name</th>
          <th>Course</th>
          <th class="mono">Time</th>
          ${hasAdj ? '<th class="mono">Adj.</th>' : ''}
          ${showScore ? '<th>Score</th>' : ''}
          <th>Gap</th>
        </tr></thead>
        <tbody>`;

      scored.forEach((run, i) => {
        const rank = i + 1;
        const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank;
        const name  = this._racerName(run);
        const crs   = run.metadata?.course === 'right' ? 'B' : 'A';
        const gap   = i === 0 ? '' : ('+' + this._fmtGap(run.score, leaderScore));
        const rowCls = rank === 1 ? 'lb-first' : rank <= 3 ? 'lb-podium' : '';

        html += `<tr class="lb-row ${rowCls}">
          <td class="lb-rank">${medal}</td>
          <td class="lb-bib">${run.bibNumber ?? '—'}</td>
          <td class="lb-name">${this._esc(name)}</td>
          <td>Course ${this._esc(crs)}</td>
          <td class="mono">${this._fmtTime(run.totalTime)}</td>
          ${hasAdj ? `<td class="mono">${this._fmtTime(run.adjustedTime)}</td>` : ''}
          ${showScore ? `<td>${this._fmtScore(run.score)}</td>` : ''}
          <td class="text-secondary">${gap}</td>
        </tr>`;
      });

      html += '</tbody></table>';
    }

    if (others.length) {
      html += `<div class="lb-dnf-section">
        <div class="lb-dnf-header">Did Not Finish / Disqualified</div>
        ${others.map(r => {
          const reason = r.status === 'dnf'
            ? (r.dnfReason ?? 'DNF')
            : `DSQ: ${r.dsqReason ?? 'Disqualified'}`;
          return `<div class="lb-dnf-row">
            <span class="lb-bib">${r.bibNumber ?? '—'}</span>
            <span>${this._esc(this._racerName(r))}</span>
            <span class="badge badge-${r.status === 'dnf' ? 'warning' : 'danger'}">${this._esc(reason)}</span>
          </div>`;
        }).join('')}
      </div>`;
    }

    body.innerHTML = html;

    // Wire pacesetter apply button
    if (this.formulaType === 'pacesetter_percent') {
      const inp = body.querySelector('#lb-pt-input');
      const btn = body.querySelector('#lb-pt-apply');
      if (btn && inp) {
        btn.addEventListener('click', () => {
          this._pacesetterTime = parseFloat(inp.value) || 0;
          this._renderTable();
        });
        inp.addEventListener('keydown', e => {
          if (e.key === 'Enter') { this._pacesetterTime = parseFloat(inp.value) || 0; this._renderTable(); }
        });
      }
    }
  }

  // ── helpers ─────────────────────────────────────────────────────────────────

  _racerName(run) {
    const first = run.metadata?.firstName ?? '';
    const last  = run.metadata?.lastName  ?? '';
    return (first + ' ' + last).trim() || `Bib #${run.bibNumber ?? '?'}`;
  }

  _fmtTime(s) {
    if (s == null) return '—';
    const v    = parseFloat(s);
    const mins = Math.floor(v / 60);
    const secs = (v % 60).toFixed(3).padStart(6, '0');
    return mins > 0 ? `${mins}:${secs}` : secs;
  }

  _fmtScore(score) {
    if (score == null) return '—';
    return this.formulaType === 'pacesetter_percent'
      ? score.toFixed(2) + '%'
      : this._fmtTime(score);
  }

  _fmtGap(score, leaderScore) {
    if (score == null || leaderScore == null) return '—';
    const diff = Math.abs(score - leaderScore);
    return this.formulaType === 'pacesetter_percent'
      ? diff.toFixed(2) + '%'
      : this._fmtTime(diff);
  }

  _esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  destroy() {
    this._cleanupFns.forEach(fn => fn());
    this._cleanupFns = [];
  }
}

window.LeaderboardPanel = LeaderboardPanel;
