// ui/components/racer-list.js
// Today's racer check-in list with search, export/import, and waiver tracking

class RacerList {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.racers = [];
    this._query = '';
    this._cleanupFns = [];

    if (!this.container) return;
    this._render();
    this.loadRacers();
    this._setupUpdates();
  }

  // ── skeleton ─────────────────────────────────────────────────────────────────

  _render() {
    this.container.innerHTML = `
      <div class="rl-toolbar">
        <div class="rl-search">
          <input id="rl-search" class="form-control" type="text"
                 placeholder="Search by name or bib…" autocomplete="off">
        </div>
        <div class="rl-actions">
          <button id="rl-export-db"  class="btn btn-secondary btn-sm">Export Racers</button>
          <button id="rl-import-db"  class="btn btn-secondary btn-sm">Import Racers</button>
          <button id="rl-export-pkg" class="btn btn-secondary btn-sm">Export Package</button>
          <button id="rl-import-pkg" class="btn btn-secondary btn-sm">Import Package</button>
          <button id="rl-new-day"    class="btn btn-warning btn-sm">New Day</button>
        </div>
      </div>
      <div id="rl-stats" class="rl-stats"></div>
      <div id="rl-body" style="overflow-y:auto;flex:1;"></div>
    `;

    this.container.querySelector('#rl-search').addEventListener('input', e => {
      this._query = e.target.value;
      this._renderList();
    });

    this.container.querySelector('#rl-export-db').addEventListener('click', async () => {
      const r = await window.racerDB.export(true);
      if (r?.success)   window.showNotification?.('Exported', 'Racer database saved.');
      else if (r?.error) window.showNotification?.('Export failed', r.error);
    });

    this.container.querySelector('#rl-import-db').addEventListener('click', async () => {
      const r = await window.racerDB.import();
      if (r?.success) {
        window.showNotification?.('Imported', `${r.count} racer(s) imported.`);
        this.loadRacers();
      } else if (r?.error) {
        window.showNotification?.('Import failed', r.error);
      }
    });

    this.container.querySelector('#rl-export-pkg').addEventListener('click', () => {
      window.raceTiming.export('package').then(r => {
        if (r?.success)   window.showNotification?.('Exported', `Package saved to ${r.filePath}`);
        else if (r?.error) window.showNotification?.('Export failed', r.error);
      });
    });

    this.container.querySelector('#rl-import-pkg').addEventListener('click', () => {
      window.raceTiming.importPackage().then(r => {
        if (r?.success) {
          window.showNotification?.('Imported', `${r.runCount} run(s) and ${r.racerCount} racer(s) merged.`);
          this.loadRacers();
        } else if (r?.error) {
          window.showNotification?.('Import failed', r.error);
        }
      });
    });

    this.container.querySelector('#rl-new-day').addEventListener('click', async () => {
      if (!confirm("Start a new day? Today's check-ins will be cleared (history is preserved).")) return;
      await window.racerDB.clearToday();
      window.showNotification?.('New Day', "Today's check-ins cleared.");
      this.loadRacers();
    });
  }

  // ── data ─────────────────────────────────────────────────────────────────────

  async loadRacers() {
    try {
      const [racers, stats] = await Promise.all([
        window.racerDB.today(),
        window.racerDB.stats()
      ]);
      this.racers = Array.isArray(racers) ? racers : [];
      this._renderStats(stats);
      this._renderList();
    } catch (err) {
      console.error('RacerList loadRacers failed:', err);
    }
  }

  _setupUpdates() {
    const refresh = () => this.loadRacers();
    const c = window.racerDB.onRacerSaved(refresh);
    if (typeof c === 'function') this._cleanupFns.push(c);
  }

  // ── rendering ─────────────────────────────────────────────────────────────────

  _renderStats(stats) {
    const el = this.container.querySelector('#rl-stats');
    if (!stats) { el.innerHTML = ''; return; }
    el.innerHTML = `<div class="stat-row">
      <div class="stat-chip">Today: <strong>${stats.todaysRacersCount ?? 0}</strong></div>
      <div class="stat-chip">Total on file: <strong>${stats.totalRacersCount ?? 0}</strong></div>
      <div class="stat-chip">Next bib: <strong>${stats.nextAvailableBib ?? '—'}</strong></div>
    </div>`;
  }

  _renderList() {
    const body = this.container.querySelector('#rl-body');
    const q = this._query.trim().toLowerCase();

    const filtered = q
      ? this.racers.filter(r => {
          const name = `${r.firstName ?? ''} ${r.lastName ?? ''}`.toLowerCase();
          return name.includes(q) || String(r.bibNumber ?? '').includes(q);
        })
      : this.racers;

    if (!filtered.length) {
      body.innerHTML = `<div class="lb-empty">${q
        ? 'No racers match your search.'
        : 'No racers checked in today.'}</div>`;
      return;
    }

    body.innerHTML = `<table class="lb-table">
      <thead><tr>
        <th class="lb-bib">Bib</th>
        <th>Name</th>
        <th>Gender</th>
        <th class="mono">Best Time (A)</th>
        <th class="mono">Best Time (B)</th>
        <th>Waiver</th>
      </tr></thead>
      <tbody>
        ${filtered.map(r => {
          const name  = this._esc(`${r.firstName ?? ''} ${r.lastName ?? ''}`.trim() || r.id);
          const bestA = r.bestTimes?.courseA?.time != null ? this._fmtTime(r.bestTimes.courseA.time) : '—';
          const bestB = r.bestTimes?.courseB?.time != null ? this._fmtTime(r.bestTimes.courseB.time) : '—';
          const waiver = r.waiverSigned
            ? '<span class="badge badge-success">Signed</span>'
            : '<span class="badge badge-warning">Pending</span>';
          return `<tr>
            <td class="lb-bib">${r.bibNumber ?? '—'}</td>
            <td>${name}</td>
            <td>${this._esc(r.gender ?? '—')}</td>
            <td class="mono">${bestA}</td>
            <td class="mono">${bestB}</td>
            <td>${waiver}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>`;
  }

  // ── helpers ───────────────────────────────────────────────────────────────────

  _fmtTime(s) {
    if (s == null) return '—';
    const v    = parseFloat(s);
    const mins = Math.floor(v / 60);
    const secs = (v % 60).toFixed(3).padStart(6, '0');
    return mins > 0 ? `${mins}:${secs}` : secs;
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

window.RacerList = RacerList;
