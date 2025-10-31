// ui/components/dual-timing-panel.js
// Dual course timing system with customizable layouts

class DualTimingPanel {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      throw new Error(`Container '${containerId}' not found`);
    }

    this.courses = {
      left: {
        name: 'Course A',
        color: '#667eea',
        activeRuns: [],
        completedRuns: []
      },
      right: {
        name: 'Course B',
        color: '#10b981',
        activeRuns: [],
        completedRuns: []
      }
    };

    this.selectedRacers = {}; // Store selected racer data per course

    this.init();
  }

  async init() {
    await this.loadCourseSettings();
    this.render();
    this.attachEventListeners();
    await this.startRaceSession(); // Start race session to open gates
    await this.loadActiveRuns();
    this.setupRealtimeUpdates();
    this.updateLayout();
  }

  async startRaceSession() {
    try {
      // Generate a race session ID based on date/time
      const now = new Date();
      const raceId = `RACE-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${now.getTime()}`;
      const raceName = `Race Session ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;

      const result = await window.raceTiming.startRace(raceId, raceName, {
        leftCourse: this.courses.left.name,
        rightCourse: this.courses.right.name,
        startTime: now.toISOString()
      });

      if (result.error) {
        console.error('Failed to start race session:', result.error);
        this.updateSessionStatus('error', 'Gates Closed - Click to Open');
        window.showNotification('Warning', 'Race session failed to start. Click "Open Gates" to try again.');
      } else {
        console.log('Race session started:', result);
        this.updateSessionStatus('active', 'Gates Open - Ready to Race');
        window.showNotification('Race Session Started', 'Start gates are now open. Ready to time runs!');
      }
    } catch (err) {
      console.error('Error starting race session:', err);
      this.updateSessionStatus('error', 'Error - Click to Retry');
      window.showNotification('Error', 'Failed to start race session. Click "Open Gates" to retry.');
    }
  }

  updateSessionStatus(status, text) {
    const dot = this.container.querySelector('.session-dot');
    const statusText = this.container.querySelector('.session-text');
    const openGatesBtn = this.container.querySelector('.open-gates-btn');

    if (!dot || !statusText) return;

    // Remove all status classes
    dot.classList.remove('active', 'error');
    statusText.classList.remove('active');

    // Add appropriate class and text
    if (status === 'active') {
      dot.classList.add('active');
      statusText.classList.add('active');
      if (openGatesBtn) openGatesBtn.style.display = 'none';
    } else if (status === 'error') {
      dot.classList.add('error');
      if (openGatesBtn) openGatesBtn.style.display = 'block';
    }

    statusText.textContent = text;
  }

  async loadCourseSettings() {
    try {
      const config = await window.electronAPI.loadConfig();
      if (config.courses) {
        this.courses.left.name = config.courses.left?.name || 'Course A';
        this.courses.left.color = config.courses.left?.color || '#667eea';
        this.courses.left.enabled = config.courses.left?.enabled !== false;
        this.courses.right.name = config.courses.right?.name || 'Course B';
        this.courses.right.color = config.courses.right?.color || '#10b981';
        this.courses.right.enabled = config.courses.right?.enabled !== false;
      }
      this.layoutMode = config.layoutMode || 'dual';
    } catch (err) {
      console.log('Using default course settings');
      this.courses.left.enabled = true;
      this.courses.right.enabled = true;
      this.layoutMode = 'dual';
    }
  }

  updateLayout() {
    const container = this.container.querySelector('.dual-timing-container');
    const leftPanel = container.querySelector('[data-course="left"]');
    const rightPanel = container.querySelector('[data-course="right"]');

    container.classList.remove('layout-dual', 'layout-single-left', 'layout-single-right');

    if (this.layoutMode === 'left-only') {
      container.classList.add('layout-single-left');
      leftPanel.style.display = 'flex';
      rightPanel.style.display = 'none';
    } else if (this.layoutMode === 'right-only') {
      container.classList.add('layout-single-right');
      leftPanel.style.display = 'none';
      rightPanel.style.display = 'flex';
    } else {
      container.classList.add('layout-dual');
      leftPanel.style.display = 'flex';
      rightPanel.style.display = 'flex';
    }
  }

  render() {
    this.container.innerHTML = `
      <div class="timing-toolbar">
        <div class="race-session-status">
          <div class="session-indicator">
            <span class="session-dot"></span>
            <span class="session-text">Starting session...</span>
          </div>
          <button class="btn btn-sm btn-secondary open-gates-btn" style="display: none;">
            🚪 Open Gates
          </button>
        </div>
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
          <button class="btn btn-sm btn-primary export-results-btn">
            📊 Export Results
          </button>
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
      <div class="course-header" style="background: ${course.color}20; border-left: 4px solid ${course.color};">
        <h2 class="course-title">${course.name}</h2>
        <button class="btn btn-sm btn-secondary settings-btn" data-course="${side}">
          ⚙️ Settings
        </button>
      </div>

      <div class="timing-controls">
        <div class="input-group">
          <label>Racer ID / Bib #</label>
          <div class="racer-input-container">
            <input 
              type="text" 
              class="racer-input" 
              data-course="${side}"
              placeholder="Enter ID or bib number" 
              autocomplete="off"
            />
            <div class="racer-info-inline" data-course="${side}"></div>
          </div>
          <div class="racer-suggestions" data-course="${side}"></div>
        </div>

        <div class="button-group-compact">
          <button class="btn btn-success start-btn" data-course="${side}">
            <span class="btn-icon">▶</span> Start
          </button>
          <button class="btn btn-primary finish-btn" data-course="${side}" disabled>
            <span class="btn-icon">■</span> Finish
          </button>
          <button class="btn btn-warning dnf-btn" data-course="${side}" disabled>DNF</button>
          <button class="btn btn-danger dsq-btn" data-course="${side}" disabled>DSQ</button>
        </div>
      </div>

      <div class="active-runs-section">
        <h3 class="section-title">On Course</h3>
        <div class="active-runs-list" data-course="${side}">
          <p class="empty-state">No active runs</p>
        </div>
      </div>

      <div class="completed-runs-section">
        <h3 class="section-title">Finished Runs</h3>
        <div class="completed-runs-list" data-course="${side}">
          <p class="empty-state">No completed runs</p>
        </div>
      </div>
    `;
  }

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
        gap: var(--spacing-md);
      }

      .toolbar-actions {
        display: flex;
        gap: var(--spacing-sm);
      }

      .race-session-status {
        display: flex;
        align-items: center;
        gap: var(--spacing-md);
      }

      .session-indicator {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
        padding: var(--spacing-xs) var(--spacing-md);
        background: rgba(0, 0, 0, 0.2);
        border-radius: var(--radius-md);
      }

      .session-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: var(--text-tertiary);
        animation: pulse 2s infinite;
      }

      .session-dot.active {
        background: var(--color-success);
      }

      .session-dot.error {
        background: var(--color-danger);
        animation: none;
      }

      .session-text {
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-medium);
        color: var(--text-secondary);
      }

      .session-text.active {
        color: var(--color-success);
      }

      .layout-switcher {
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
        height: calc(100% - 80px);
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

      .settings-btn {
        padding: var(--spacing-xs) var(--spacing-sm);
        flex-shrink: 0;
      }

      .timing-controls {
        margin-bottom: var(--spacing-lg);
      }

      /* Racer input container - horizontal layout like NASTAR */
      .racer-input-container {
        display: flex;
        align-items: center;
        gap: var(--spacing-md);
        position: relative;
      }

      .racer-input {
        flex: 0 0 150px;
        min-width: 0;
        transition: all var(--transition-base);
      }

      .racer-input.validated {
        border-color: var(--color-success);
        background-color: rgba(16, 185, 129, 0.1);
      }

      .racer-input.invalid {
        border-color: var(--color-danger);
        background-color: rgba(239, 68, 68, 0.1);
      }

      /* Inline racer info display - appears next to input */
      .racer-info-inline {
        flex: 1;
        display: none;
        align-items: center;
        gap: var(--spacing-sm);
        padding: var(--spacing-sm) var(--spacing-md);
        background: rgba(102, 126, 234, 0.1);
        border: 1px solid rgba(102, 126, 234, 0.3);
        border-radius: var(--radius-md);
        min-height: 40px;
      }

      .racer-info-inline.active {
        display: flex;
      }

      .racer-name-display {
        font-size: var(--font-size-md);
        font-weight: var(--font-weight-semibold);
        color: var(--text-primary);
      }

      .racer-details-display {
        font-size: var(--font-size-sm);
        color: var(--text-secondary);
        margin-left: var(--spacing-xs);
      }

      /* Payment status badges */
      .payment-badge {
        display: inline-block;
        padding: var(--spacing-xs) var(--spacing-sm);
        border-radius: var(--radius-sm);
        font-size: var(--font-size-xs);
        font-weight: var(--font-weight-semibold);
        margin-left: var(--spacing-sm);
        white-space: nowrap;
      }

      .payment-badge.pass {
        background: rgba(16, 185, 129, 0.2);
        color: var(--color-success);
        border: 1px solid rgba(16, 185, 129, 0.3);
      }

      .payment-badge.needs-payment {
        background: rgba(245, 158, 11, 0.2);
        color: var(--color-warning);
        border: 1px solid rgba(245, 158, 11, 0.3);
        animation: pulse-payment 2s ease-in-out infinite;
      }

      @keyframes pulse-payment {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
      }

      .racer-suggestions {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: var(--bg-tertiary);
        border: 1px solid var(--border-primary);
        border-radius: var(--radius-md);
        max-height: 200px;
        overflow-y: auto;
        z-index: var(--z-dropdown);
        display: none;
        margin-top: var(--spacing-xs);
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

      .suggestion-item:hover {
        background: var(--bg-card-hover);
      }

      .suggestion-item:last-child {
        border-bottom: none;
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

      .button-group-compact .start-btn {
        grid-column: 1;
      }

      .button-group-compact .finish-btn {
        grid-column: 2;
      }

      .button-group-compact .dnf-btn {
        grid-column: 1;
      }

      .button-group-compact .dsq-btn {
        grid-column: 2;
      }

      .section-title {
        font-size: var(--font-size-base);
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
        background: rgba(0, 0, 0, 0.2);
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
        transition: all var(--transition-base);
        font-size: var(--font-size-sm);
      }

      .run-item.active-run {
        background: rgba(102, 126, 234, 0.1);
        border-color: rgba(102, 126, 234, 0.3);
      }

      .run-item:hover {
        background: var(--bg-card-hover);
        border-color: var(--border-focus);
      }

      .run-item:last-child {
        margin-bottom: 0;
      }

      .run-info {
        display: flex;
        gap: var(--spacing-sm);
        align-items: center;
        min-width: 0;
        flex: 1;
      }

      .run-bib {
        font-size: var(--font-size-lg);
        font-weight: var(--font-weight-bold);
        color: var(--color-primary);
        min-width: 40px;
        flex-shrink: 0;
      }

      .run-details {
        display: flex;
        flex-direction: column;
        min-width: 0;
        flex: 1;
      }

      .run-name {
        color: var(--text-primary);
        font-weight: var(--font-weight-medium);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .run-meta {
        font-size: var(--font-size-xs);
        color: var(--text-secondary);
      }

      .run-time {
        font-family: var(--font-family-mono);
        font-size: var(--font-size-base);
        font-weight: var(--font-weight-semibold);
        flex-shrink: 0;
        color: var(--text-primary);
      }

      .run-time.active {
        color: var(--color-success);
        font-size: var(--font-size-lg);
      }

      .run-time.run-status-dnf {
        color: var(--color-warning);
      }

      .empty-state {
        text-align: center;
        color: var(--text-tertiary);
        font-style: italic;
        padding: var(--spacing-lg);
      }

      /* Responsive adjustments */
      @media (max-width: 1400px) {
        .dual-timing-container.layout-dual {
          gap: var(--spacing-sm);
        }

        .course-panel {
          padding: var(--spacing-md);
        }

        .course-title {
          font-size: var(--font-size-lg);
        }

        .button-group-compact .btn {
          padding: var(--spacing-xs) var(--spacing-sm);
          font-size: var(--font-size-xs);
        }

        .btn-icon {
          display: none;
        }
      }

      @media (max-width: 1000px) {
        .course-header {
          flex-direction: column;
          gap: var(--spacing-xs);
          padding: var(--spacing-sm);
        }

        .section-title {
          font-size: var(--font-size-sm);
        }

        .run-item {
          padding: var(--spacing-xs);
          font-size: var(--font-size-xs);
        }

        .run-bib {
          font-size: var(--font-size-base);
          min-width: 30px;
        }

        .racer-input {
          flex: 0 0 120px;
        }
      }

      @media (max-width: 768px) {
        .dual-timing-container.layout-dual {
          grid-template-columns: 1fr 1fr;
          gap: 4px;
        }

        .course-panel {
          padding: var(--spacing-sm);
        }

        .course-title {
          font-size: var(--font-size-base);
        }

        .settings-btn {
          padding: 4px 8px;
          font-size: var(--font-size-xs);
        }

        .input-group label {
          font-size: var(--font-size-xs);
          margin-bottom: 4px;
        }

        .button-group-compact {
          gap: 4px;
        }

        .button-group-compact .btn {
          padding: 6px;
          font-size: 10px;
        }

        .racer-input-container {
          flex-direction: column;
          align-items: stretch;
        }

        .racer-input {
          flex: 1;
        }
      }
    `;

    document.head.appendChild(style);
  }

  attachEventListeners() {
    console.log('DualTimingPanel: Attaching event listeners...');

    // Open gates button (manual override)
    const openGatesBtn = this.container.querySelector('.open-gates-btn');
    if (openGatesBtn) {
      openGatesBtn.addEventListener('click', async () => {
        await this.startRaceSession();
      });
      console.log('DualTimingPanel: Open gates button listener attached');
    }

    // Export results button
    const exportBtn = this.container.querySelector('.export-results-btn');
    console.log('DualTimingPanel: Looking for export button...', exportBtn);

    if (exportBtn) {
      console.log('DualTimingPanel: Export button found, attaching listener');
      exportBtn.addEventListener('click', () => {
        console.log('DualTimingPanel: Export button clicked!');
        console.log('DualTimingPanel: resultsExportModal exists?', !!window.resultsExportModal);

        if (window.resultsExportModal) {
          console.log('DualTimingPanel: Opening results export modal...');
          window.resultsExportModal.open();
        } else {
          console.error('DualTimingPanel: resultsExportModal not found on window object');
          window.showNotification('Error', 'Export system not initialized. Please refresh the page.');
        }
      });
      console.log('DualTimingPanel: Export button listener attached successfully');
    } else {
      console.error('DualTimingPanel: Export results button NOT FOUND in DOM');
      console.log('DualTimingPanel: Container HTML:', this.container.innerHTML.substring(0, 500));
    }

    // Layout switcher buttons
    document.querySelectorAll('.layout-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const layout = e.target.dataset.layout;
        await this.changeLayout(layout);
      });
    });

    // Start buttons
    document.querySelectorAll('.start-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const course = e.target.closest('[data-course]').dataset.course;
        this.handleStartRun(course);
      });
    });

    // Finish buttons
    document.querySelectorAll('.finish-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const course = e.target.closest('[data-course]').dataset.course;
        this.handleFinishRun(course);
      });
    });

    // DNF buttons
    document.querySelectorAll('.dnf-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const course = e.target.closest('[data-course]').dataset.course;
        this.handleDNF(course);
      });
    });

    // DSQ buttons
    document.querySelectorAll('.dsq-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const course = e.target.closest('[data-course]').dataset.course;
        this.handleDSQ(course);
      });
    });

    // Settings buttons
    document.querySelectorAll('.settings-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const course = e.target.dataset.course;
        this.showCourseSettings(course);
      });
    });

    // Racer input with autocomplete
    document.querySelectorAll('.racer-input').forEach(input => {
      input.addEventListener('input', (e) => {
        const course = e.target.dataset.course;
        this.handleRacerSearch(course, e.target.value);
      });

      input.addEventListener('keydown', async (e) => {
        const course = e.target.dataset.course;

        if (e.key === 'Tab') {
          e.preventDefault();
          const targetCourse = course === 'left' ? 'right' : 'left';
          const targetInput = document.querySelector(`.racer-input[data-course="${targetCourse}"]`);

          await this.validateRacer(course);

          if (targetInput) {
            targetInput.focus();
            targetInput.select();
          }
          return;
        }

        if (e.key === 'Enter') {
          e.preventDefault();
          await this.validateAndPrepareRun(course);
        }
      });

      input.addEventListener('blur', async (e) => {
        const course = e.target.dataset.course;
        setTimeout(async () => {
          await this.validateRacer(course);
        }, 200);
      });
    });
  }

  calculateAge(birthdate) {
    if (!birthdate) return null;
    const today = new Date();
    const birth = new Date(birthdate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  }

  displayRacerInfo(course, racer) {
    const infoDisplay = document.querySelector(`.racer-info-inline[data-course="${course}"]`);
    if (!infoDisplay) return;

    const age = this.calculateAge(racer.birthdate);
    const discipline = racer.discipline ? racer.discipline.charAt(0).toUpperCase() + racer.discipline.slice(1) : 'Alpine';

    // Determine payment status
    const hasPass = racer.hasRacePass || false;
    const paymentBadge = hasPass
      ? '<span class="payment-badge pass">✓ Pass</span>'
      : '<span class="payment-badge needs-payment">💳 Needs Payment</span>';

    infoDisplay.innerHTML = `
      <span class="racer-name-display">${racer.firstName} ${racer.lastName}</span>
      <span class="racer-details-display">${age ? `Age ${age}` : ''} ${discipline}</span>
      ${paymentBadge}
    `;

    infoDisplay.classList.add('active');
  }

  clearRacerInfo(course) {
    const infoDisplay = document.querySelector(`.racer-info-inline[data-course="${course}"]`);
    if (infoDisplay) {
      infoDisplay.innerHTML = '';
      infoDisplay.classList.remove('active');
    }
  }

  async handleRacerSearch(course, query) {
    if (!query || query.length < 2) {
      this.hideSuggestions(course);
      this.clearRacerInfo(course);
      return;
    }

    try {
      const suggestions = await window.racerDB.autocomplete(query, 5);

      if (suggestions && suggestions.length > 0) {
        this.showSuggestions(course, suggestions);
      } else {
        this.hideSuggestions(course);
      }
    } catch (err) {
      console.error('Autocomplete error:', err);
      this.hideSuggestions(course);
    }
  }

  showSuggestions(course, suggestions) {
    const container = document.querySelector(`.racer-suggestions[data-course="${course}"]`);

    if (suggestions.length === 0) {
      this.hideSuggestions(course);
      return;
    }

    container.innerHTML = suggestions.map(s => {
      const bestTime = this.getBestTimeForCourse(s, course);
      const sourceIcon = s.source === 'today' ? '🏁' : '📁';
      const age = this.calculateAge(s.birthdate);
      const discipline = s.discipline || 'alpine';
      const hasPass = s.hasRacePass || false;
      const paymentIndicator = hasPass ? '✓ Pass' : '💳 Pay';

      return `
        <div class="suggestion-item" data-racer='${JSON.stringify(s)}' data-course="${course}">
          <div class="suggestion-primary">
            ${sourceIcon} #${s.bibNumber} - ${s.firstName} ${s.lastName}
          </div>
          <div class="suggestion-secondary">
            ${s.gender} | ${age ? `Age ${age} | ` : ''}${discipline} | ${paymentIndicator}
            ${bestTime ? ` | Best: ${bestTime.toFixed(3)}s` : ''}
          </div>
        </div>
      `;
    }).join('');

    container.classList.add('active');

    container.querySelectorAll('.suggestion-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const racer = JSON.parse(e.currentTarget.dataset.racer);
        const course = e.currentTarget.dataset.course;
        const input = document.querySelector(`.racer-input[data-course="${course}"]`);

        input.value = racer.bibNumber;
        this.hideSuggestions(course);

        this.selectedRacers[course] = racer;
        this.displayRacerInfo(course, racer);

        input.classList.remove('invalid');
        input.classList.add('validated');
      });
    });
  }

  getBestTimeForCourse(racer, course) {
    if (!racer.bestTimes) return null;
    const courseKey = course === 'left' ? 'courseA' : 'courseB';
    return racer.bestTimes[courseKey]?.handicapped || null;
  }

  hideSuggestions(course) {
    const container = document.querySelector(`.racer-suggestions[data-course="${course}"]`);
    container.classList.remove('active');
  }

  async validateRacer(course) {
    const input = document.querySelector(`.racer-input[data-course="${course}"]`);
    const racerQuery = input.value.trim();

    if (!racerQuery) {
      delete this.selectedRacers[course];
      input.classList.remove('validated', 'invalid');
      this.clearRacerInfo(course);
      return;
    }

    try {
      const result = await window.racerDB.search(racerQuery, {
        checkCloud: true,
        isSubscribed: false,
        isOnline: await window.electronAPI.checkInternet()
      });

      if (!result.racer) {
        input.classList.remove('validated');
        input.classList.add('invalid');
        delete this.selectedRacers[course];
        this.clearRacerInfo(course);
        return;
      }

      const racer = result.racer;
      this.selectedRacers[course] = racer;
      this.displayRacerInfo(course, racer);

      input.classList.remove('invalid');
      input.classList.add('validated');
      input.value = racer.bibNumber;

    } catch (err) {
      console.error('Racer validation error:', err);
      input.classList.remove('validated');
      input.classList.add('invalid');
      delete this.selectedRacers[course];
      this.clearRacerInfo(course);
    }
  }

  async validateAndPrepareRun(course) {
    const input = document.querySelector(`.racer-input[data-course="${course}"]`);
    const racerQuery = input.value.trim();

    if (!racerQuery) {
      window.showNotification('Error', 'Please enter a racer ID or bib number');
      return;
    }

    try {
      const result = await window.racerDB.search(racerQuery, {
        checkCloud: true,
        isSubscribed: false,
        isOnline: await window.electronAPI.checkInternet()
      });

      if (!result.racer) {
        this.showNewRacerModal(racerQuery, course);
        return;
      }

      const racer = result.racer;

      const needsWaiver = await window.racerDB.needsWaiver(racer.id);
      if (needsWaiver) {
        this.showWaiverModal(racer, course);
        return;
      }

      this.selectedRacers[course] = racer;
      this.displayRacerInfo(course, racer);

      input.classList.remove('invalid');
      input.classList.add('validated');
      input.value = racer.bibNumber;

      window.showNotification(
        'Ready to Start',
        `${racer.firstName} ${racer.lastName} (#${racer.bibNumber}) - Click START when ready`
      );

    } catch (err) {
      console.error('Racer validation error:', err);
      window.showNotification('Error', err.message || 'Failed to validate racer');
    }
  }

  async handleStartRun(course) {
    const input = document.querySelector(`.racer-input[data-course="${course}"]`);
    let racer = this.selectedRacers[course];

    if (!racer) {
      const racerQuery = input.value.trim();

      if (!racerQuery) {
        window.showNotification('Error', 'Please enter a racer ID or bib number');
        return;
      }

      try {
        const result = await window.racerDB.search(racerQuery, {
          checkCloud: true,
          isSubscribed: false,
          isOnline: await window.electronAPI.checkInternet()
        });

        if (!result.racer) {
          this.showNewRacerModal(racerQuery, course);
          return;
        }

        racer = result.racer;

        const needsWaiver = await window.racerDB.needsWaiver(racer.id);
        if (needsWaiver) {
          this.showWaiverModal(racer, course);
          return;
        }
      } catch (err) {
        console.error('Start run error:', err);
        window.showNotification('Error', err.message || 'Failed to start run');
        return;
      }
    }

    try {
      const run = await window.raceTiming.startRun(racer.id, racer.bibNumber, {
        course: course,
        racerName: `${racer.firstName} ${racer.lastName}`,
        gender: racer.gender,
        discipline: racer.discipline,
        age: this.calculateAge(racer.birthdate)
      });

      if (run.error) {
        window.showNotification('Error', run.error);
        return;
      }

      // Clear input but keep racer info showing (moves to "On Course")
      input.value = '';
      input.classList.remove('validated', 'invalid');
      this.toggleButtons(course, true);

    } catch (err) {
      console.error('Start run error:', err);
      window.showNotification('Error', err.message || 'Failed to start run');
    }
  }

  showNewRacerModal(query, course) {
    if (!window.racerRegistrationModal) {
      console.error('Racer registration modal not initialized');
      window.showNotification(
        'Error',
        `Racer with bib/ID "${query}" not found. Registration system is loading...`
      );
      return;
    }

    window.racerRegistrationModal.open(
      query,
      course,
      async (racer, course) => {
        try {
          const run = await window.raceTiming.startRun(racer.id, racer.bibNumber, {
            course: course,
            racerName: `${racer.firstName} ${racer.lastName}`,
            gender: racer.gender,
            discipline: racer.discipline,
            age: this.calculateAge(racer.birthdate)
          });

          if (run.error) {
            window.showNotification('Error', run.error);
            return;
          }

          window.showNotification(
            'Run Started',
            `${racer.firstName} ${racer.lastName} (#${racer.bibNumber}) started on ${this.courses[course].name}`
          );

          this.selectedRacers[course] = racer;
          this.displayRacerInfo(course, racer);
          this.toggleButtons(course, true);
        } catch (err) {
          console.error('Failed to start run after registration:', err);
          window.showNotification('Error', 'Racer registered but failed to start run');
        }
      }
    );
  }

  showWaiverModal(racer, course) {
    window.showNotification(
      'Waiver Required',
      `${racer.firstName} ${racer.lastName} needs to sign a waiver. Waiver system coming soon!`
    );
  }

  async handleFinishRun(course) {
    const racer = this.selectedRacers[course];
    // If no selected racer, check if there are any active runs on this course
    if (!racer) {
      const activeRuns = this.courses[course].activeRuns;
      if (activeRuns.length === 0) {
        window.showNotification('Error', 'No active run to finish on this course');
        return;
      }

      // If there's exactly one active run, use that
      if (activeRuns.length === 1) {
        const run = activeRuns[0];
        racer = {
          id: run.racerId,
          bibNumber: run.bibNumber,
          firstName: run.metadata?.racerName?.split(' ')[0] || 'Racer',
          lastName: run.metadata?.racerName?.split(' ').slice(1).join(' ') || ''
        };
      } else {
        // Multiple active runs - need to select which one
        window.showNotification('Error', 'Multiple active runs. Please select a racer first.');
        return;
      }
    }

    try {
      const result = await window.raceTiming.finishRun(racer.id);

      if (result.error) {
        window.showNotification('Error', result.error);
        return;
      }

      window.showNotification(
        'Run Finished',
        `${racer.firstName} ${racer.lastName}: ${result.adjustedTime.toFixed(3)}s`
      );

      // Clear racer selection and info
      this.selectedRacers[course] = null;
      this.clearRacerInfo(course);
      this.toggleButtons(course, false);

    } catch (err) {
      console.error('Finish run error:', err);
      window.showNotification('Error', err.message || 'Failed to finish run');
    }
  }

  async handleDNF(course) {
    const racer = this.selectedRacers[course];
    // If no selected racer, check if there are any active runs on this course
    if (!racer) {
      const activeRuns = this.courses[course].activeRuns;
      if (activeRuns.length === 0) {
        window.showNotification('Error', 'No active run to DNF on this course');
        return;
      }

      // If there's exactly one active run, use that
      if (activeRuns.length === 1) {
        const run = activeRuns[0];
        racer = {
          id: run.racerId,
          bibNumber: run.bibNumber,
          firstName: run.metadata?.racerName?.split(' ')[0] || 'Racer',
          lastName: run.metadata?.racerName?.split(' ').slice(1).join(' ') || ''
        };
      } else {
        // Multiple active runs - need to select which one
        window.showNotification('Error', 'Multiple active runs. Please select a racer first.');
        return;
      }
    }

    const reason = prompt('DNF Reason (optional):', 'Did Not Finish');
    if (reason === null) return;

    try {
      const result = await window.raceTiming.markDNF(racer.id, reason);

      if (result.error) {
        window.showNotification('Error', result.error);
        return;
      }

      window.showNotification('DNF', `${racer.firstName} ${racer.lastName} marked as DNF`);

      this.selectedRacers[course] = null;
      this.clearRacerInfo(course);
      this.toggleButtons(course, false);

    } catch (err) {
      console.error('DNF error:', err);
      window.showNotification('Error', err.message || 'Failed to mark DNF');
    }
  }

  async handleDSQ(course) {
    const racer = this.selectedRacers[course];
    // If no selected racer, check if there are any active runs on this course
    if (!racer) {
      const activeRuns = this.courses[course].activeRuns;
      if (activeRuns.length === 0) {
        window.showNotification('Error', 'No active run to DSQ on this course');
        return;
      }

      // If there's exactly one active run, use that
      if (activeRuns.length === 1) {
        const run = activeRuns[0];
        racer = {
          id: run.racerId,
          bibNumber: run.bibNumber,
          firstName: run.metadata?.racerName?.split(' ')[0] || 'Racer',
          lastName: run.metadata?.racerName?.split(' ').slice(1).join(' ') || ''
        };
      } else {
        // Multiple active runs - need to select which one
        window.showNotification('Error', 'Multiple active runs. Please select a racer first.');
        return;
      }
    }

    const reason = prompt('Disqualification Reason:', 'Missed Gate');
    if (!reason) return;

    try {
      const result = await window.raceTiming.disqualify(racer.id, reason);

      if (result.error) {
        window.showNotification('Error', result.error);
        return;
      }

      window.showNotification('DSQ', `${racer.firstName} ${racer.lastName} disqualified: ${reason}`);

      this.selectedRacers[course] = null;
      this.clearRacerInfo(course);
      this.toggleButtons(course, false);

    } catch (err) {
      console.error('DSQ error:', err);
      window.showNotification('Error', err.message || 'Failed to disqualify');
    }
  }

  toggleButtons(course, runActive) {
    const panel = document.querySelector(`.course-panel[data-course="${course}"]`);
    panel.querySelector('.start-btn').disabled = runActive;
    panel.querySelector('.finish-btn').disabled = !runActive;
    panel.querySelector('.dnf-btn').disabled = !runActive;
    panel.querySelector('.dsq-btn').disabled = !runActive;
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

  showCourseSettings(course) {
    if (window.settingsModal) {
      window.settingsModal.currentTab = 'courses';
      window.settingsModal.open();
    } else {
      window.showNotification('Settings', 'Course settings for ${this.courses[course].name} - Settings modal is loading...');
    }
  }

  /**
   * Assign a racer to a course from the management panel
   * This pre-fills the course input and displays racer info
   */
  assignRacerToCourse(course, racer) {
    const input = document.querySelector(`.racer-input[data-course="${course}"]`);

    if (!input) {
      console.error(`Course input not found for: ${course}`);
      return;
    }

    // Set the input value to bib number
    input.value = racer.bibNumber;

    // Store the racer data
    this.selectedRacers[course] = racer;

    // Display racer info inline
    this.displayRacerInfo(course, racer);

    // Mark input as validated
    input.classList.remove('invalid');
    input.classList.add('validated');

    // Focus the course input to draw operator's attention
    input.focus();

    // Scroll the course panel into view
    const panel = document.querySelector(`.course-panel[data-course="${course}"]`);
    if (panel) {
      panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  async loadActiveRuns() {
    try {
      const activeRuns = await window.raceTiming.getActiveRuns() || [];

      activeRuns.forEach(run => {
        const course = run.metadata?.course;
        if (course === 'left' || course === 'right') {
          this.courses[course].activeRuns.push(run);
        }
      });

      this.updateActiveRunsList('left');
      this.updateActiveRunsList('right');
    } catch (err) {
      console.error('Failed to load active runs:', err);
    }
  }

  setupRealtimeUpdates() {
    window.raceTiming.onRunStarted((run) => {
      const course = run.metadata?.course;
      if (course === 'left' || course === 'right') {
        this.courses[course].activeRuns.push(run);
        this.updateActiveRunsList(course);
      }
    });

    window.raceTiming.onRunCompleted((run) => {
      const course = run.metadata?.course;
      if (course === 'left' || course === 'right') {
        this.courses[course].activeRuns = this.courses[course].activeRuns.filter(r => r.racerId !== run.racerId);
        this.courses[course].completedRuns.push(run);
        this.updateActiveRunsList(course);
        this.updateCompletedRunsList(course);

        if (this.selectedRacers[course]?.id === run.racerId) {
          this.selectedRacers[course] = null;
          this.clearRacerInfo(course);
          this.toggleButtons(course, false);
        }
      }
    });

    window.raceTiming.onRunDNF((run) => {
      const course = run.metadata?.course;
      if (course === 'left' || course === 'right') {
        this.courses[course].activeRuns = this.courses[course].activeRuns.filter(r => r.racerId !== run.racerId);
        this.courses[course].completedRuns.push(run);
        this.updateActiveRunsList(course);
        this.updateCompletedRunsList(course);

        if (this.selectedRacers[course]?.id === run.racerId) {
          this.selectedRacers[course] = null;
          this.clearRacerInfo(course);
          this.toggleButtons(course, false);
        }
      }
    });
  }

  updateActiveRunsList(course) {
    const container = document.querySelector(`.active-runs-list[data-course="${course}"]`);
    const activeRuns = this.courses[course].activeRuns;

    if (activeRuns.length === 0) {
      container.innerHTML = '<p class="empty-state">No active runs</p>';
      return;
    }

    container.innerHTML = activeRuns.map(run => {
      const elapsedMs = Date.now() - run.startTime;
      const elapsedSec = (elapsedMs / 1000).toFixed(2);
      const racerName = run.metadata?.racerName || 'Unknown';
      const age = run.metadata?.age || '';
      const discipline = run.metadata?.discipline || 'alpine';

      return `
        <div class="run-item active-run" data-racer-id="${run.racerId}">
          <div class="run-info">
            <span class="run-bib">#${run.bibNumber}</span>
            <div class="run-details">
              <span class="run-name">${racerName}</span>
              <span class="run-meta">${age ? `Age ${age} | ` : ''}${discipline}</span>
            </div>
          </div>
          <span class="run-time active">${elapsedSec}s</span>
        </div>
      `;
    }).join('');

    setTimeout(() => this.updateActiveRunsList(course), 1000);
  }

  updateCompletedRunsList(course) {
    const container = document.querySelector(`.completed-runs-list[data-course="${course}"]`);
    const completedRuns = this.courses[course].completedRuns;

    if (completedRuns.length === 0) {
      container.innerHTML = '<p class="empty-state">No completed runs</p>';
      return;
    }

    const sorted = [...completedRuns].sort((a, b) => b.finishTime - a.finishTime);

    container.innerHTML = sorted.slice(0, 10).map(run => {
      const racerName = run.metadata?.racerName || 'Unknown';
      const age = run.metadata?.age || '';
      const discipline = run.metadata?.discipline || 'alpine';
      const status = run.status === 'dnf' ? 'DNF' : run.status === 'disqualified' ? 'DSQ' : `${run.adjustedTime.toFixed(3)}s`;
      const statusClass = run.status === 'dnf' || run.status === 'disqualified' ? 'run-status-dnf' : '';

      return `
        <div class="run-item">
          <div class="run-info">
            <span class="run-bib">#${run.bibNumber}</span>
            <div class="run-details">
              <span class="run-name">${racerName}</span>
              <span class="run-meta">${age ? `Age ${age} | ` : ''}${discipline}</span>
            </div>
          </div>
          <span class="run-time ${statusClass}">${status}</span>
        </div>
      `;
    }).join('');
  }
}

window.DualTimingPanel = DualTimingPanel;