// ui/components/dual-timing-panel.js
// Dual course timing system with customizable layouts

class DualTimingPanel {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      throw new Error(`Container '${containerId}' not found`);
    }

    this.courses = {
      left: { name: 'Course A', color: '#667eea', enabled: true },
      right: { name: 'Course B', color: '#10b981', enabled: true }
    };

    this.layoutMode = 'dual';
    this.activeRunsPerCourse = { left: [], right: [] };
    this.completedRunsPerCourse = { left: [], right: [] };
    this.isSubscribed = false;
    this.liveTimerInterval = null;
    this.raceSessionStarted = false;

    this.init();
  }

  async init() {
    await this.loadCourseSettings();
    this.render();
    this.attachEventListeners();
    this.updateLayout();
    await this.loadActiveRuns();
    this.setupRealtimeUpdates();
    await this.ensureRaceSession();
    this.startLiveTimer();
  }

  // ── Settings ────────────────────────────────────────────────────────────────

  async loadCourseSettings() {
    try {
      const config = await window.electronAPI.loadConfig();
      if (config.courses) {
        this.courses.left.name  = config.courses.left?.name  || 'Course A';
        this.courses.left.color = config.courses.left?.color || '#667eea';
        this.courses.left.enabled = config.courses.left?.enabled !== false;
        this.courses.right.name  = config.courses.right?.name  || 'Course B';
        this.courses.right.color = config.courses.right?.color || '#10b981';
        this.courses.right.enabled = config.courses.right?.enabled !== false;
      }
      this.layoutMode = config.layoutMode || 'dual';
      this.isSubscribed = config.subscriptionExpiry
        ? new Date(config.subscriptionExpiry) > new Date()
        : false;
    } catch (_err) {
      this.courses.left.enabled  = true;
      this.courses.right.enabled = true;
      this.layoutMode = 'dual';
    }
  }

  // ── Race session ─────────────────────────────────────────────────────────────

  async ensureRaceSession() {
    if (this.raceSessionStarted) return;

    // If there are already active runs from persistent state, the session is live
    const hasActive = Object.values(this.activeRunsPerCourse).some(r => r.length > 0);
    if (hasActive) {
      this.raceSessionStarted = true;
      return;
    }

    try {
      const raceId = `RACE-${Date.now()}`;
      const today  = new Date().toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric'
      });
      await window.raceTiming.startRace(raceId, `Race — ${today}`, {
        courses: this.courses
      });
    } catch (err) {
      console.error('Race session start failed:', err);
    }
    this.raceSessionStarted = true;
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  render() {
    this.container.innerHTML = `
      <div class="timing-toolbar">
        <div class="layout-switcher">
          <button class="btn btn-sm layout-btn ${this.layoutMode === 'dual' ? 'active' : ''}" data-layout="dual">
            Both Courses
          </button>
          <button class="btn btn-sm layout-btn ${this.layoutMode === 'left-only' ? 'active' : ''}" data-layout="left-only">
            ${this.courses.left.name} Only
          </button>
          <button class="btn btn-sm layout-btn ${this.layoutMode === 'right-only' ? 'active' : ''}" data-layout="right-only">
            ${this.courses.right.name} Only
          </button>
        </div>
        <div class="toolbar-actions">
          <button class="btn btn-sm btn-secondary" id="exportResultsBtn">Export Results</button>
          <button class="btn btn-sm btn-danger" id="newDayBtn">New Day</button>
        </div>
      </div>

      <div class="dual-timing-container layout-${this.layoutMode}">
        <div class="course-panel" data-course="left">
          ${this.renderCoursePanel('left')}
        </div>
        <div class="course-panel" data-course="right">
          ${this.renderCoursePanel('right')}
        </div>
      </div>
    `;

    this.addStyles();
  }

  renderCoursePanel(side) {
    const course = this.courses[side];
    return `
      <div class="course-header" style="background:${course.color}20; border-left:4px solid ${course.color};">
        <h2 class="course-title">${course.name}</h2>
        <button class="btn btn-sm btn-secondary settings-btn" data-course="${side}">Settings</button>
      </div>

      <div class="timing-controls">
        <div class="input-group racer-input-wrap">
          <label>Racer ID / Bib #</label>
          <input
            type="text"
            class="racer-input"
            data-course="${side}"
            placeholder="Scan RFID or enter bib…"
            autocomplete="off"
          />
          <div class="racer-suggestions" data-course="${side}"></div>
        </div>

        <div class="button-group-compact">
          <button class="btn btn-success start-btn" data-course="${side}" title="Start run (Ctrl+Enter)">
            <span class="btn-icon">▶</span> Start
          </button>
          <button class="btn btn-primary finish-btn" data-course="${side}" disabled
            title="Finish oldest active run (Ctrl+${side === 'left' ? '[' : ']'})">
            <span class="btn-icon">■</span> Finish
          </button>
          <button class="btn btn-warning dnf-btn" data-course="${side}" disabled>DNF</button>
          <button class="btn btn-danger dsq-btn" data-course="${side}" disabled>DSQ</button>
        </div>
        <div class="shortcut-hints">
          <span class="shortcut-hint">Start: <kbd>Ctrl+Enter</kbd></span>
          <span class="shortcut-hint">Finish: <kbd>Ctrl+${side === 'left' ? '[' : ']'}</kbd></span>
        </div>
      </div>

      <div class="active-runs-section">
        <h3 class="section-title">On Course</h3>
        <div class="active-runs-list" data-course="${side}">
          <p class="empty-state">No active runs</p>
        </div>
      </div>

      <div class="completed-runs-section">
        <h3 class="section-title">Today's Results</h3>
        <div class="completed-runs-list" data-course="${side}">
          <p class="empty-state">No completed runs</p>
        </div>
      </div>
    `;
  }

  // ── Layout ───────────────────────────────────────────────────────────────────

  updateLayout() {
    const container = this.container.querySelector('.dual-timing-container');
    if (!container) return;
    const leftPanel  = container.querySelector('[data-course="left"]');
    const rightPanel = container.querySelector('[data-course="right"]');

    container.classList.remove('layout-dual', 'layout-single-left', 'layout-single-right');

    if (this.layoutMode === 'left-only') {
      container.classList.add('layout-single-left');
      leftPanel.style.display  = 'flex';
      rightPanel.style.display = 'none';
    } else if (this.layoutMode === 'right-only') {
      container.classList.add('layout-single-right');
      leftPanel.style.display  = 'none';
      rightPanel.style.display = 'flex';
    } else {
      container.classList.add('layout-dual');
      leftPanel.style.display  = this.courses.left.enabled  ? 'flex' : 'none';
      rightPanel.style.display = this.courses.right.enabled ? 'flex' : 'none';
    }
  }

  async changeLayout(layout) {
    this.layoutMode = layout;

    document.querySelectorAll('.layout-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.layout === layout);
    });

    this.updateLayout();

    try {
      const config = await window.electronAPI.loadConfig();
      config.layoutMode = layout;
      await window.electronAPI.saveConfig(config);
    } catch (err) {
      console.error('Failed to save layout preference:', err);
    }
  }

  // ── Event listeners ──────────────────────────────────────────────────────────

  attachEventListeners() {
    // Layout switcher
    document.querySelectorAll('.layout-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.changeLayout(e.target.dataset.layout);
      });
    });

    // Per-course buttons
    document.querySelectorAll('.start-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.handleStartRun(e.target.closest('[data-course]').dataset.course);
      });
    });

    document.querySelectorAll('.finish-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.handleFinishRun(e.target.closest('[data-course]').dataset.course);
      });
    });

    document.querySelectorAll('.dnf-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.handleDNF(e.target.closest('[data-course]').dataset.course);
      });
    });

    document.querySelectorAll('.dsq-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.handleDSQ(e.target.closest('[data-course]').dataset.course);
      });
    });

    document.querySelectorAll('.settings-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.showCourseSettings(e.target.dataset.course);
      });
    });

    // Toolbar buttons
    const exportBtn = document.getElementById('exportResultsBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => window.raceTiming.export());
    }

    const newDayBtn = document.getElementById('newDayBtn');
    if (newDayBtn) {
      newDayBtn.addEventListener('click', () => this.handleNewDay());
    }

    // Racer input — autocomplete only; Ctrl+Enter to start (plain Enter is intentionally blocked)
    document.querySelectorAll('.racer-input').forEach(input => {
      input.addEventListener('input', (e) => {
        this.handleRacerSearch(e.target.dataset.course, e.target.value);
      });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.ctrlKey) {
          e.preventDefault();
          this.handleStartRun(e.target.dataset.course);
        } else if (e.key === 'Enter') {
          // Block plain Enter — prevents accidental run start while typing bib/name
          e.preventDefault();
        }
        if (e.key === 'Escape') {
          this.hideSuggestions(e.target.dataset.course);
        }
      });
    });

    // Global finish shortcuts: Ctrl+[ = Finish left, Ctrl+] = Finish right
    // These fire even while typing the next bib number
    document.addEventListener('keydown', (e) => {
      if (!e.ctrlKey) return;
      if (e.key === '[') {
        e.preventDefault();
        this.handleFinishRun('left');
      } else if (e.key === ']') {
        e.preventDefault();
        this.handleFinishRun('right');
      }
    });

    // Close suggestions when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.racer-input-wrap')) {
        ['left', 'right'].forEach(c => this.hideSuggestions(c));
      }
    });
  }

  // ── Racer autocomplete ────────────────────────────────────────────────────────

  async handleRacerSearch(course, query) {
    if (!query || query.length < 1) {
      this.hideSuggestions(course);
      return;
    }
    try {
      const suggestions = await window.racerDB.autocomplete(query, 6);
      if (suggestions && !suggestions.error && suggestions.length > 0) {
        this.showSuggestions(course, suggestions);
      } else {
        this.hideSuggestions(course);
      }
    } catch (_err) {
      this.hideSuggestions(course);
    }
  }

  showSuggestions(course, suggestions) {
    const container = document.querySelector(`.racer-suggestions[data-course="${course}"]`);
    if (!container) return;

    container.innerHTML = suggestions.map(s => {
      const courseKey  = course === 'left' ? 'courseA' : 'courseB';
      const bestTime   = s.bestTimes?.[courseKey]?.handicapped;
      const sourceIcon = s.source === 'today' ? '🏁' : '📁';
      return `
        <div class="suggestion-item" data-racer-id="${s.id}" data-course="${course}">
          <div class="suggestion-primary">
            ${sourceIcon} #${s.bibNumber} — ${s.firstName} ${s.lastName}
          </div>
          <div class="suggestion-secondary">
            ${s.gender || ''} · ${s.discipline || ''}
            ${bestTime ? ` · Best: ${bestTime.toFixed(3)}s` : ''}
            ${s.hasRacePass ? ' · ✓ Pass' : ''}
          </div>
        </div>
      `;
    }).join('');

    container.classList.add('active');

    container.querySelectorAll('.suggestion-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const racerId  = e.currentTarget.dataset.racerId;
        const c        = e.currentTarget.dataset.course;
        const input    = document.querySelector(`.racer-input[data-course="${c}"]`);
        input.value    = racerId;
        this.hideSuggestions(c);
      });
    });
  }

  hideSuggestions(course) {
    const container = document.querySelector(`.racer-suggestions[data-course="${course}"]`);
    if (container) container.classList.remove('active');
  }

  // ── Run actions ───────────────────────────────────────────────────────────────

  async handleStartRun(course) {
    const input      = document.querySelector(`.racer-input[data-course="${course}"]`);
    const racerQuery = input.value.trim();

    if (!racerQuery) {
      window.showNotification('Entry Required', 'Scan an RFID tag or enter a bib number.');
      input.focus();
      return;
    }

    await this.ensureRaceSession();

    try {
      const isOnline = await window.electronAPI.checkInternet();
      const result   = await window.racerDB.search(racerQuery, {
        checkCloud:   this.isSubscribed && isOnline,
        isSubscribed: this.isSubscribed,
        isOnline
      });

      if (!result || !result.racer) {
        this.showNewRacerModal(racerQuery, course);
        return;
      }

      const racer      = result.racer;
      const needsWaiver = await window.racerDB.needsWaiver(racer.id);
      if (needsWaiver) {
        this.showWaiverModal(racer, course);
        return;
      }

      await this.startRunForRacer(racer, course);

    } catch (err) {
      console.error('Start run error:', err);
      window.showNotification('Error', err.message || 'Failed to start run');
    }
  }

  async startRunForRacer(racer, course) {
    const run = await window.raceTiming.startRun(racer.id, racer.bibNumber, {
      course,
      racerName:  `${racer.firstName} ${racer.lastName}`,
      gender:     racer.gender,
      discipline: racer.discipline
    });

    if (run && run.error) {
      window.showNotification('Error', run.error);
      return;
    }

    run._displayName = `${racer.firstName} ${racer.lastName}`;
    run._displayBib  = racer.bibNumber;

    this.activeRunsPerCourse[course].push(run);
    this.updateActiveRunsUI(course);
    this.updateButtonStates(course);

    const input = document.querySelector(`.racer-input[data-course="${course}"]`);
    input.value = '';
    input.focus();

    window.showNotification(
      'Started',
      `#${racer.bibNumber} ${racer.firstName} ${racer.lastName} → ${this.courses[course].name}`
    );
  }

  async handleFinishRun(course, racerId = null) {
    const activeRuns = this.activeRunsPerCourse[course];
    if (activeRuns.length === 0) {
      window.showNotification('No Active Runs', `Nothing running on ${this.courses[course].name}`);
      return;
    }

    // FIFO unless a specific racer was requested
    const target = racerId
      ? activeRuns.find(r => r.racerId === racerId)
      : activeRuns[0];

    if (!target) return;

    try {
      const result = await window.raceTiming.finishRun(target.racerId);
      if (result && result.error) {
        window.showNotification('Error', result.error);
        return;
      }

      result._displayName = target._displayName;
      result._displayBib  = target._displayBib;

      this.activeRunsPerCourse[course] = activeRuns.filter(r => r.racerId !== target.racerId);
      this.completedRunsPerCourse[course].push(result);

      this.updateActiveRunsUI(course);
      this.updateCompletedRunsUI(course);
      this.updateButtonStates(course);

      window.showNotification(
        'Finished',
        `#${target._displayBib} ${target._displayName} — ${this.formatTime(result.adjustedTime)}`
      );

    } catch (err) {
      window.showNotification('Error', err.message || 'Failed to finish run');
    }
  }

  async handleDNF(course, racerId = null) {
    const activeRuns = this.activeRunsPerCourse[course];
    if (activeRuns.length === 0) {
      window.showNotification('No Active Runs', `Nothing running on ${this.courses[course].name}`);
      return;
    }

    let target;
    if (racerId) {
      target = activeRuns.find(r => r.racerId === racerId);
    } else if (activeRuns.length === 1) {
      target = activeRuns[0];
    } else {
      this.showRacerPickerModal(course, 'dnf', activeRuns);
      return;
    }

    if (!target) return;

    const reason = prompt('DNF Reason (optional):', 'Did Not Finish');
    if (reason === null) return;

    try {
      const result = await window.raceTiming.markDNF(
        target.racerId,
        reason || 'Did Not Finish'
      );
      if (result && result.error) {
        window.showNotification('Error', result.error);
        return;
      }

      result._displayName = target._displayName;
      result._displayBib  = target._displayBib;

      this.activeRunsPerCourse[course] = activeRuns.filter(r => r.racerId !== target.racerId);
      this.completedRunsPerCourse[course].push(result);

      this.updateActiveRunsUI(course);
      this.updateCompletedRunsUI(course);
      this.updateButtonStates(course);

      window.showNotification(
        'DNF',
        `#${target._displayBib} ${target._displayName} — Did Not Finish`
      );

    } catch (err) {
      window.showNotification('Error', err.message || 'Failed to mark DNF');
    }
  }

  async handleDSQ(course, racerId = null) {
    const activeRuns = this.activeRunsPerCourse[course];
    if (activeRuns.length === 0) {
      window.showNotification('No Active Runs', `Nothing running on ${this.courses[course].name}`);
      return;
    }

    let target;
    if (racerId) {
      target = activeRuns.find(r => r.racerId === racerId);
    } else if (activeRuns.length === 1) {
      target = activeRuns[0];
    } else {
      this.showRacerPickerModal(course, 'dsq', activeRuns);
      return;
    }

    if (!target) return;

    const reason = prompt('Disqualification Reason:', 'Missed Gate');
    if (!reason) return;

    try {
      const result = await window.raceTiming.disqualify(target.racerId, reason);
      if (result && result.error) {
        window.showNotification('Error', result.error);
        return;
      }

      result._displayName = target._displayName;
      result._displayBib  = target._displayBib;

      this.activeRunsPerCourse[course] = activeRuns.filter(r => r.racerId !== target.racerId);
      this.completedRunsPerCourse[course].push(result);

      this.updateActiveRunsUI(course);
      this.updateCompletedRunsUI(course);
      this.updateButtonStates(course);

      window.showNotification(
        'DSQ',
        `#${target._displayBib} ${target._displayName} — ${reason}`
      );

    } catch (err) {
      window.showNotification('Error', err.message || 'Failed to disqualify run');
    }
  }

  async handleNewDay() {
    if (!confirm('Start a new day? This will clear today\'s active runs and allow a fresh session.')) return;
    try {
      await window.racerDB.clearToday();
      await window.raceTiming.reset();
      this.activeRunsPerCourse    = { left: [], right: [] };
      this.completedRunsPerCourse = { left: [], right: [] };
      this.raceSessionStarted     = false;
      ['left', 'right'].forEach(c => {
        this.updateActiveRunsUI(c);
        this.updateCompletedRunsUI(c);
        this.updateButtonStates(c);
      });
      await this.ensureRaceSession();
      window.showNotification('New Day', 'Session reset. Ready for today\'s racers.');
    } catch (err) {
      window.showNotification('Error', err.message || 'Failed to reset session');
    }
  }

  // ── UI updates ────────────────────────────────────────────────────────────────

  updateButtonStates(course) {
    const panel = document.querySelector(`.course-panel[data-course="${course}"]`);
    if (!panel) return;
    const hasActive = this.activeRunsPerCourse[course].length > 0;
    panel.querySelector('.finish-btn').disabled = !hasActive;
    panel.querySelector('.dnf-btn').disabled    = !hasActive;
    panel.querySelector('.dsq-btn').disabled    = !hasActive;
    panel.querySelector('.start-btn').disabled  = false;
  }

  updateActiveRunsUI(course) {
    const list = document.querySelector(`.active-runs-list[data-course="${course}"]`);
    if (!list) return;

    const runs = this.activeRunsPerCourse[course];
    if (runs.length === 0) {
      list.innerHTML = '<p class="empty-state">No active runs</p>';
      return;
    }

    list.innerHTML = runs.map(run => `
      <div class="run-item run-active" data-run-id="${run.runId}" data-racer-id="${run.racerId}">
        <div class="run-info">
          <span class="run-bib">#${run._displayBib || run.bibNumber}</span>
          <span class="run-name">${run._displayName || ''}</span>
        </div>
        <span class="run-time active" data-start="${run.startTime}">0.000s</span>
        <div class="run-inline-actions">
          <button class="btn-inline btn-finish-inline" data-course="${course}" data-racer-id="${run.racerId}" title="Finish">F</button>
          <button class="btn-inline btn-dnf-inline"    data-course="${course}" data-racer-id="${run.racerId}" title="Did Not Finish">DNF</button>
          <button class="btn-inline btn-dsq-inline"    data-course="${course}" data-racer-id="${run.racerId}" title="Disqualify">DSQ</button>
        </div>
      </div>
    `).join('');

    list.querySelectorAll('.btn-finish-inline').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.handleFinishRun(e.target.dataset.course, e.target.dataset.racerId);
      });
    });
    list.querySelectorAll('.btn-dnf-inline').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.handleDNF(e.target.dataset.course, e.target.dataset.racerId);
      });
    });
    list.querySelectorAll('.btn-dsq-inline').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.handleDSQ(e.target.dataset.course, e.target.dataset.racerId);
      });
    });
  }

  updateCompletedRunsUI(course) {
    const list = document.querySelector(`.completed-runs-list[data-course="${course}"]`);
    if (!list) return;

    const runs = this.completedRunsPerCourse[course];
    if (runs.length === 0) {
      list.innerHTML = '<p class="empty-state">No completed runs</p>';
      return;
    }

    // Sort finished runs by adjusted time; append DNF/DSQ at the bottom
    const finished = [...runs]
      .filter(r => r.status === 'completed')
      .sort((a, b) => (a.adjustedTime ?? Infinity) - (b.adjustedTime ?? Infinity));
    const others = runs.filter(r => r.status !== 'completed');
    const display = [...finished, ...others];

    list.innerHTML = display.map((run, idx) => {
      let timeStr = '--';
      let statusClass = '';
      let badge = '';
      let rankEl = '';

      if (run.status === 'completed') {
        timeStr     = this.formatTime(run.adjustedTime);
        statusClass = 'run-completed';
        rankEl      = `<span class="run-rank">${idx + 1}</span>`;
      } else if (run.status === 'dnf') {
        timeStr     = 'DNF';
        statusClass = 'run-dnf';
        badge       = '<span class="run-badge badge-dnf">DNF</span>';
        rankEl      = '<span class="run-rank"></span>';
      } else if (run.status === 'disqualified') {
        timeStr     = 'DSQ';
        statusClass = 'run-dsq';
        badge       = `<span class="run-badge badge-dsq" title="${run.dsqReason || ''}">DSQ</span>`;
        rankEl      = '<span class="run-rank"></span>';
      }

      return `
        <div class="run-item ${statusClass}">
          <div class="run-info">
            ${rankEl}
            <span class="run-bib">#${run._displayBib || run.bibNumber}</span>
            <span class="run-name">${run._displayName || ''}</span>
            ${badge}
          </div>
          <span class="run-time ${statusClass}">${timeStr}</span>
        </div>
      `;
    }).join('');
  }

  // ── Live timer ────────────────────────────────────────────────────────────────

  startLiveTimer() {
    if (this.liveTimerInterval) clearInterval(this.liveTimerInterval);
    this.liveTimerInterval = setInterval(() => {
      document.querySelectorAll('.run-time.active[data-start]').forEach(el => {
        const elapsed = (Date.now() - parseInt(el.dataset.start)) / 1000;
        el.textContent = this.formatTime(elapsed);
      });
    }, 100);
  }

  formatTime(seconds) {
    if (seconds === null || seconds === undefined || isNaN(seconds)) return '--:--.---';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}:${secs.toFixed(3).padStart(6, '0')}`;
    }
    return `${secs.toFixed(3)}s`;
  }

  // ── Load persisted state ──────────────────────────────────────────────────────

  async loadActiveRuns() {
    try {
      const activeRuns = await window.raceTiming.getActiveRuns();
      if (activeRuns && !activeRuns.error) {
        for (const run of activeRuns) {
          const course = run.metadata?.course;
          if (course && this.activeRunsPerCourse[course]) {
            this.activeRunsPerCourse[course].push(run);
          }
        }
      }

      const completedRuns = await window.raceTiming.getCompletedRuns('finishTime');
      if (completedRuns && !completedRuns.error) {
        for (const run of completedRuns) {
          const course = run.metadata?.course;
          if (course && this.completedRunsPerCourse[course]) {
            this.completedRunsPerCourse[course].push(run);
          }
        }
      }

      ['left', 'right'].forEach(course => {
        this.updateActiveRunsUI(course);
        this.updateCompletedRunsUI(course);
        this.updateButtonStates(course);
      });
    } catch (err) {
      console.error('Failed to load run history:', err);
    }
  }

  // ── Real-time updates from backend (e.g., hardware triggers) ─────────────────

  setupRealtimeUpdates() {
    window.raceTiming.onRunStarted((run) => {
      const course = run.metadata?.course;
      if (!course) return;
      const alreadyTracked = this.activeRunsPerCourse[course]?.some(r => r.runId === run.runId);
      if (!alreadyTracked) {
        this.activeRunsPerCourse[course].push(run);
        this.updateActiveRunsUI(course);
        this.updateButtonStates(course);
      }
    });

    window.raceTiming.onRunCompleted((run) => {
      this._moveToCompleted(run);
    });

    window.raceTiming.onRunDNF((run) => {
      this._moveToCompleted(run);
    });

    window.raceTiming.onRunDisqualified(({ run }) => {
      this._moveToCompleted(run);
    });
  }

  _moveToCompleted(run) {
    const course = run.metadata?.course;
    if (!course || !this.activeRunsPerCourse[course]) return;

    const existing = this.activeRunsPerCourse[course].find(r => r.racerId === run.racerId);
    if (existing) {
      run._displayName = existing._displayName;
      run._displayBib  = existing._displayBib;
    }

    this.activeRunsPerCourse[course] = this.activeRunsPerCourse[course].filter(
      r => r.racerId !== run.racerId
    );

    const alreadyDone = this.completedRunsPerCourse[course]?.some(r => r.runId === run.runId);
    if (!alreadyDone) {
      this.completedRunsPerCourse[course].push(run);
    }

    this.updateActiveRunsUI(course);
    this.updateCompletedRunsUI(course);
    this.updateButtonStates(course);
  }

  // ── Modals ────────────────────────────────────────────────────────────────────

  showNewRacerModal(query, course) {
    const isBibQuery = /^\d+$/.test(query);
    const nameParts  = !isBibQuery ? query.split(' ') : [];

    const modal = document.createElement('div');
    modal.className = 'modal active or-modal';
    modal.innerHTML = `
      <div class="modal-content modal-lg">
        <h2 class="modal-heading">Register New Racer</h2>
        <p class="text-sm text-secondary mb-lg">No racer found for <strong>"${query}"</strong>. Fill in details to register and start.</p>

        <div class="form-grid">
          <div class="input-group">
            <label>First Name *</label>
            <input type="text" id="nrFirst" placeholder="First name" value="${nameParts[0] || ''}" />
          </div>
          <div class="input-group">
            <label>Last Name *</label>
            <input type="text" id="nrLast" placeholder="Last name" value="${nameParts[1] || ''}" />
          </div>
          <div class="input-group">
            <label>Bib # *</label>
            <input type="number" id="nrBib" placeholder="Bib number" value="${isBibQuery ? query : ''}" min="1" />
          </div>
          <div class="input-group">
            <label>Gender</label>
            <select id="nrGender">
              <option value="M">Male</option>
              <option value="F">Female</option>
              <option value="X">Non-binary / Other</option>
            </select>
          </div>
          <div class="input-group">
            <label>Category</label>
            <select id="nrDiscipline">
              <option value="Recreational">Recreational</option>
              <option value="Junior">Junior</option>
              <option value="Senior">Senior</option>
              <option value="Expert">Expert</option>
            </select>
          </div>
          <div class="input-group" style="display:flex; align-items:center; padding-top:24px;">
            <label style="display:flex; align-items:center; gap:8px; cursor:pointer; margin:0;">
              <input type="checkbox" id="nrPass" style="width:auto;" />
              Has Race Pass
            </label>
          </div>
        </div>

        <div class="modal-actions">
          <button class="btn btn-secondary" id="nrCancel">Cancel</button>
          <button class="btn btn-primary"   id="nrSave">Register &amp; Start</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Auto-fill next available bib if not searching by number
    if (!isBibQuery) {
      window.racerDB.nextBib().then(nextBib => {
        if (nextBib && !nextBib.error) {
          document.getElementById('nrBib').value = nextBib;
        }
      });
    }

    document.getElementById('nrFirst').focus();

    document.getElementById('nrCancel').addEventListener('click', () => modal.remove());

    document.getElementById('nrSave').addEventListener('click', async () => {
      const firstName  = document.getElementById('nrFirst').value.trim();
      const lastName   = document.getElementById('nrLast').value.trim();
      const bibNumber  = parseInt(document.getElementById('nrBib').value);
      const gender     = document.getElementById('nrGender').value;
      const discipline = document.getElementById('nrDiscipline').value;
      const hasRacePass = document.getElementById('nrPass').checked;

      if (!firstName || !lastName) {
        window.showNotification('Required', 'First and last name are required.');
        return;
      }
      if (!bibNumber || isNaN(bibNumber) || bibNumber < 1) {
        window.showNotification('Required', 'A valid bib number is required.');
        return;
      }

      try {
        const saved = await window.racerDB.save({
          firstName, lastName, bibNumber, gender, discipline, hasRacePass,
          waiverSigned: false,
          createdAt: new Date().toISOString()
        });

        if (saved && saved.error) {
          window.showNotification('Error', saved.error);
          return;
        }

        modal.remove();
        // Populate bib into input — operator presses Ctrl+Enter or Start button when ready
        const input = document.querySelector(`.racer-input[data-course="${course}"]`);
        if (input) { input.value = bibNumber.toString(); input.focus(); }
        window.showNotification(
          'Registered',
          `#${bibNumber} ${firstName} ${lastName} — press Ctrl+Enter or Start when ready`
        );
      } catch (err) {
        window.showNotification('Error', err.message || 'Failed to register racer');
      }
    });

    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
  }

  showWaiverModal(racer, course) {
    const modal = document.createElement('div');
    modal.className = 'modal active or-modal';
    modal.innerHTML = `
      <div class="modal-content">
        <h2 class="modal-heading">Waiver Required</h2>
        <p class="text-base mb-md">
          <strong>${racer.firstName} ${racer.lastName}</strong> needs to sign the liability waiver before racing.
        </p>
        <div class="waiver-text">
          <p>By checking the box below, the participant acknowledges that ski racing involves inherent risks of injury and agrees to hold the mountain, race organizers, and staff harmless for any injury or damage arising from participation in this event. This waiver is valid for the current season.</p>
        </div>
        <label class="waiver-check-label">
          <input type="checkbox" id="waiverCheck" />
          I have read and agree to the liability waiver
        </label>
        <div class="modal-actions">
          <button class="btn btn-secondary" id="waiverCancel">Cancel</button>
          <button class="btn btn-primary"   id="waiverConfirm" disabled>Sign &amp; Start</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('waiverCheck').addEventListener('change', (e) => {
      document.getElementById('waiverConfirm').disabled = !e.target.checked;
    });

    document.getElementById('waiverCancel').addEventListener('click', () => modal.remove());

    document.getElementById('waiverConfirm').addEventListener('click', async () => {
      try {
        await window.racerDB.signWaiver(racer.id);
        modal.remove();
        // Keep query in input — next Ctrl+Enter will re-check and proceed without waiver prompt
        window.showNotification(
          'Waiver Signed',
          `${racer.firstName} ${racer.lastName} — press Ctrl+Enter or Start when ready`
        );
      } catch (err) {
        window.showNotification('Error', err.message || 'Failed to record waiver');
      }
    });

    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
  }

  showCourseSettings(course) {
    const courseData = this.courses[course];

    const modal = document.createElement('div');
    modal.className = 'modal active or-modal';
    modal.innerHTML = `
      <div class="modal-content">
        <h2 class="modal-heading">Course Settings</h2>
        <div class="input-group">
          <label>Course Name</label>
          <input type="text" id="csName" value="${courseData.name}" placeholder="Course name" />
        </div>
        <div class="input-group" style="margin-top:var(--spacing-md);">
          <label>Course Color</label>
          <div style="display:flex; align-items:center; gap:var(--spacing-sm); margin-top:var(--spacing-xs);">
            <input type="color" id="csColor" value="${courseData.color}"
              style="width:48px; height:36px; padding:2px; cursor:pointer; border-radius:4px; border:1px solid var(--border-primary);" />
            <span id="csColorHex" class="text-sm text-secondary">${courseData.color}</span>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" id="csCancel">Cancel</button>
          <button class="btn btn-primary"   id="csSave">Save</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('csColor').addEventListener('input', (e) => {
      document.getElementById('csColorHex').textContent = e.target.value;
    });

    document.getElementById('csCancel').addEventListener('click', () => modal.remove());

    document.getElementById('csSave').addEventListener('click', async () => {
      const newName  = document.getElementById('csName').value.trim() || courseData.name;
      const newColor = document.getElementById('csColor').value;

      this.courses[course].name  = newName;
      this.courses[course].color = newColor;

      // Update header in-place (no full re-render needed)
      const header = document.querySelector(`.course-panel[data-course="${course}"] .course-header`);
      if (header) {
        header.style.background  = `${newColor}20`;
        header.style.borderLeft  = `4px solid ${newColor}`;
        header.querySelector('.course-title').textContent = newName;
      }
      // Update layout button labels
      const leftBtn  = document.querySelector('[data-layout="left-only"]');
      const rightBtn = document.querySelector('[data-layout="right-only"]');
      if (leftBtn)  leftBtn.textContent  = `${this.courses.left.name} Only`;
      if (rightBtn) rightBtn.textContent = `${this.courses.right.name} Only`;

      try {
        const config = await window.electronAPI.loadConfig();
        if (!config.courses) config.courses = {};
        config.courses[course] = { name: newName, color: newColor, enabled: true };
        await window.electronAPI.saveConfig(config);
      } catch (err) {
        console.error('Failed to save course settings:', err);
      }

      modal.remove();
      window.showNotification('Saved', `${newName} settings updated.`);
    });

    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
  }

  showRacerPickerModal(course, action, activeRuns) {
    const actionLabel = action === 'dnf' ? 'DNF' : 'Disqualify';

    const modal = document.createElement('div');
    modal.className = 'modal active or-modal';
    modal.innerHTML = `
      <div class="modal-content">
        <h2 class="modal-heading">Select Racer — ${actionLabel}</h2>
        <p class="text-sm text-secondary mb-md">
          Multiple runners on ${this.courses[course].name}. Choose which to ${actionLabel.toLowerCase()}:
        </p>
        <div class="racer-picker-list">
          ${activeRuns.map(run => `
            <button class="racer-picker-item" data-racer-id="${run.racerId}">
              <span class="run-bib">#${run._displayBib || run.bibNumber}</span>
              <span style="margin-left:8px;">${run._displayName || ''}</span>
            </button>
          `).join('')}
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" id="pickerCancel">Cancel</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelectorAll('.racer-picker-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const racerId = e.currentTarget.dataset.racerId;
        modal.remove();
        if (action === 'dnf') {
          this.handleDNF(course, racerId);
        } else {
          this.handleDSQ(course, racerId);
        }
      });
    });

    document.getElementById('pickerCancel').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
  }

  // ── Styles ────────────────────────────────────────────────────────────────────

  addStyles() {
    if (document.getElementById('dual-timing-styles')) return;

    const style = document.createElement('style');
    style.id = 'dual-timing-styles';
    style.textContent = `
      .timing-toolbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: var(--spacing-md);
        margin-bottom: var(--spacing-md);
        background: var(--bg-card);
        border: 1px solid var(--border-primary);
        border-radius: var(--radius-lg);
      }

      .layout-switcher {
        display: flex;
        gap: var(--spacing-xs);
      }

      .toolbar-actions {
        display: flex;
        gap: var(--spacing-xs);
      }

      .layout-btn {
        padding: var(--spacing-xs) var(--spacing-md);
        opacity: 0.6;
        transition: all var(--transition-base);
      }

      .layout-btn.active {
        opacity: 1;
        background: var(--color-primary);
        color: white;
      }

      .dual-timing-container {
        display: grid;
        gap: var(--spacing-md);
        height: calc(100vh - 180px);
      }

      .dual-timing-container.layout-dual {
        grid-template-columns: 1fr 1fr;
      }

      .dual-timing-container.layout-single-left,
      .dual-timing-container.layout-single-right {
        grid-template-columns: 1fr;
        max-width: 800px;
        margin: 0 auto;
      }

      .course-panel {
        background: var(--bg-card);
        border: 1px solid var(--border-primary);
        border-radius: var(--radius-lg);
        padding: var(--spacing-lg);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        min-width: 0;
      }

      .course-header {
        padding: var(--spacing-md);
        border-radius: var(--radius-md);
        margin-bottom: var(--spacing-lg);
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .course-title {
        font-size: var(--font-size-xl);
        font-weight: var(--font-weight-bold);
        margin: 0;
      }

      .timing-controls {
        margin-bottom: var(--spacing-lg);
      }

      .racer-input-wrap {
        position: relative;
      }

      .racer-suggestions {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: var(--bg-tertiary);
        border: 1px solid var(--border-primary);
        border-radius: var(--radius-md);
        max-height: 220px;
        overflow-y: auto;
        z-index: var(--z-dropdown);
        display: none;
        box-shadow: var(--shadow-lg);
      }

      .racer-suggestions.active {
        display: block;
      }

      .suggestion-item {
        padding: var(--spacing-sm) var(--spacing-md);
        cursor: pointer;
        transition: background var(--transition-fast);
        border-bottom: 1px solid var(--border-secondary);
      }

      .suggestion-item:last-child { border-bottom: none; }

      .suggestion-item:hover {
        background: var(--bg-card-hover);
      }

      .suggestion-primary {
        font-weight: var(--font-weight-semibold);
        color: var(--text-primary);
      }

      .suggestion-secondary {
        font-size: var(--font-size-xs);
        color: var(--text-secondary);
        margin-top: 2px;
      }

      .button-group-compact {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--spacing-xs);
        margin-top: var(--spacing-sm);
      }

      .button-group-compact .btn {
        padding: var(--spacing-sm);
        font-size: var(--font-size-sm);
        min-width: 0;
        white-space: nowrap;
      }

      .shortcut-hints {
        display: flex;
        gap: var(--spacing-md);
        margin-top: 4px;
        padding: 3px 0;
      }

      .shortcut-hint {
        font-size: 11px;
        color: var(--text-tertiary);
        display: flex;
        align-items: center;
        gap: 4px;
      }

      kbd {
        display: inline-block;
        background: var(--bg-tertiary);
        border: 1px solid var(--border-primary);
        border-radius: 3px;
        padding: 0 4px;
        font-family: var(--font-family-mono);
        font-size: 10px;
        line-height: 1.6;
        color: var(--text-secondary);
      }

      .section-title {
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-semibold);
        margin-bottom: var(--spacing-sm);
        color: var(--text-secondary);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .active-runs-section {
        margin-bottom: var(--spacing-md);
      }

      .completed-runs-section {
        flex: 1;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        min-height: 0;
      }

      .active-runs-list,
      .completed-runs-list {
        background: rgba(0,0,0,0.2);
        border-radius: var(--radius-md);
        padding: var(--spacing-sm);
        overflow-y: auto;
      }

      .completed-runs-list {
        flex: 1;
        min-height: 0;
      }

      .run-item {
        background: var(--bg-input);
        border: 1px solid var(--border-primary);
        border-radius: var(--radius-md);
        padding: var(--spacing-sm);
        margin-bottom: var(--spacing-xs);
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: var(--font-size-sm);
        gap: var(--spacing-xs);
        transition: border-color var(--transition-fast);
      }

      .run-item:last-child { margin-bottom: 0; }

      .run-item.run-active {
        border-color: var(--color-success);
        background: rgba(74, 222, 128, 0.06);
      }

      .run-item.run-dnf {
        opacity: 0.7;
        border-color: var(--color-warning);
      }

      .run-item.run-dsq {
        opacity: 0.7;
        border-color: var(--color-danger);
      }

      .run-info {
        display: flex;
        gap: var(--spacing-xs);
        align-items: center;
        min-width: 0;
        flex: 1;
      }

      .run-rank {
        font-size: var(--font-size-xs);
        color: var(--text-tertiary);
        min-width: 18px;
        text-align: right;
        flex-shrink: 0;
      }

      .run-bib {
        font-size: var(--font-size-lg);
        font-weight: var(--font-weight-bold);
        flex-shrink: 0;
      }

      .run-name {
        color: var(--text-secondary);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        flex: 1;
      }

      .run-time {
        font-family: var(--font-family-mono);
        font-size: var(--font-size-base);
        font-weight: var(--font-weight-semibold);
        flex-shrink: 0;
        min-width: 72px;
        text-align: right;
      }

      .run-time.active     { color: var(--color-success); }
      .run-time.run-dnf    { color: var(--color-warning); }
      .run-time.run-dsq    { color: var(--color-danger); }

      .run-badge {
        font-size: 10px;
        font-weight: var(--font-weight-bold);
        padding: 1px 5px;
        border-radius: 3px;
        flex-shrink: 0;
      }

      .badge-dnf { background: rgba(234,179,8,0.2);  color: var(--color-warning); }
      .badge-dsq { background: rgba(239,68,68,0.2);  color: var(--color-danger); }

      .run-inline-actions {
        display: flex;
        gap: 3px;
        flex-shrink: 0;
      }

      .btn-inline {
        padding: 2px 6px;
        font-size: 10px;
        font-weight: var(--font-weight-semibold);
        border-radius: 3px;
        border: 1px solid transparent;
        cursor: pointer;
        transition: all var(--transition-fast);
        line-height: 1.4;
      }

      .btn-finish-inline {
        background: rgba(74,222,128,0.15);
        color: var(--color-success);
        border-color: rgba(74,222,128,0.3);
      }
      .btn-finish-inline:hover { background: rgba(74,222,128,0.3); }

      .btn-dnf-inline {
        background: rgba(234,179,8,0.15);
        color: var(--color-warning);
        border-color: rgba(234,179,8,0.3);
      }
      .btn-dnf-inline:hover { background: rgba(234,179,8,0.3); }

      .btn-dsq-inline {
        background: rgba(239,68,68,0.15);
        color: var(--color-danger);
        border-color: rgba(239,68,68,0.3);
      }
      .btn-dsq-inline:hover { background: rgba(239,68,68,0.3); }

      .empty-state {
        text-align: center;
        color: var(--text-tertiary);
        font-style: italic;
        padding: var(--spacing-lg);
      }

      /* Modal additions */
      .or-modal .modal-heading {
        font-size: var(--font-size-xl);
        font-weight: var(--font-weight-bold);
        margin-bottom: var(--spacing-md);
      }

      .modal-lg {
        max-width: 640px !important;
      }

      .form-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--spacing-md);
        margin-bottom: var(--spacing-lg);
      }

      .waiver-text {
        background: rgba(0,0,0,0.2);
        border: 1px solid var(--border-secondary);
        border-radius: var(--radius-md);
        padding: var(--spacing-md);
        font-size: var(--font-size-sm);
        color: var(--text-secondary);
        line-height: 1.6;
        margin-bottom: var(--spacing-md);
      }

      .waiver-check-label {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
        cursor: pointer;
        margin-bottom: var(--spacing-md);
        font-size: var(--font-size-sm);
      }

      .waiver-check-label input[type="checkbox"] {
        width: auto;
        flex-shrink: 0;
      }

      .racer-picker-list {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-xs);
        margin-bottom: var(--spacing-md);
      }

      .racer-picker-item {
        background: var(--bg-input);
        border: 1px solid var(--border-primary);
        border-radius: var(--radius-md);
        padding: var(--spacing-sm) var(--spacing-md);
        text-align: left;
        cursor: pointer;
        transition: all var(--transition-fast);
        display: flex;
        align-items: center;
        font-size: var(--font-size-base);
        color: var(--text-primary);
      }

      .racer-picker-item:hover {
        background: var(--bg-card-hover);
        border-color: var(--color-primary);
      }

      /* Responsive — always side-by-side */
      @media (max-width: 1400px) {
        .dual-timing-container.layout-dual { gap: var(--spacing-sm); }
        .course-panel { padding: var(--spacing-md); }
        .course-title { font-size: var(--font-size-lg); }
        .button-group-compact .btn { font-size: var(--font-size-xs); }
        .btn-icon { display: none; }
      }

      @media (max-width: 900px) {
        .dual-timing-container.layout-dual { grid-template-columns: 1fr 1fr; gap: 4px; }
        .course-panel { padding: var(--spacing-sm); }
        .course-title { font-size: var(--font-size-base); }
        .button-group-compact .btn { padding: 6px; font-size: 10px; }
        .form-grid { grid-template-columns: 1fr; }
      }
    `;

    document.head.appendChild(style);
  }
}

window.DualTimingPanel = DualTimingPanel;
