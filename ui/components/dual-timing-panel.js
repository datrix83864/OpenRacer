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

    this.selectedRacers = {}; // Store selected racer ID per course

    this.init();
  }

  async init() {
    await this.loadCourseSettings();
    this.render();
    this.attachEventListeners();
    await this.loadActiveRuns();
    this.setupRealtimeUpdates();
    this.updateLayout(); // Apply saved layout preference
  }

  async loadCourseSettings() {
    try {
      const config = await window.electronAPI.loadConfig();
      if (config.courses) {
        this.courses.left.name = config.courses.left?.name || 'Course A';
        this.courses.left.color = config.courses.left?.color || '#667eea';
        this.courses.left.enabled = config.courses.left?.enabled !== false; // Default true
        this.courses.right.name = config.courses.right?.name || 'Course B';
        this.courses.right.color = config.courses.right?.color || '#10b981';
        this.courses.right.enabled = config.courses.right?.enabled !== false; // Default true
      }
      this.layoutMode = config.layoutMode || 'dual'; // 'dual', 'left-only', 'right-only'
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

    // Remove all layout classes
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
      // Default to dual mode - show both panels
      container.classList.add('layout-dual');
      leftPanel.style.display = 'flex';
      rightPanel.style.display = 'flex';
    }
  }

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
      </div>

      <div class="dual-timing-container layout-${this.layoutMode}">
        <!-- Left Course -->
        <div class="course-panel" data-course="left">
          ${this.renderCoursePanel('left')}
        </div>
        
        <!-- Right Course -->
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
          <input 
            type="text" 
            class="racer-input" 
            data-course="${side}"
            placeholder="Enter ID or bib number" 
            autocomplete="off"
          />
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
        <h3 class="section-title">Active Runs</h3>
        <div class="active-runs-list" data-course="${side}">
          <p class="empty-state">No active runs</p>
        </div>
      </div>

      <div class="completed-runs-section">
        <h3 class="section-title">Today's Runs</h3>
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
        justify-content: center;
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
        min-width: 0; /* Allow shrinking */
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

      .racer-input {
        position: relative;
        transition: all var(--transition-base);
      }

      .racer-input.validated {
        border-color: var(--color-success);
        background-color: rgba(16, 185, 129, 0.1);
      }

      .racer-input.invalid {
        border-color: var(--color-error);
        background-color: rgba(239, 68, 68, 0.1);
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
        min-height: 0; /* Allow shrinking */
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
        min-width: 40px;
        flex-shrink: 0;
      }

      .run-name {
        color: var(--text-secondary);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .run-time {
        font-family: var(--font-family-mono);
        font-size: var(--font-size-base);
        font-weight: var(--font-weight-semibold);
        flex-shrink: 0;
      }

      .run-time.active {
        color: var(--color-success);
      }

      .empty-state {
        text-align: center;
        color: var(--text-tertiary);
        font-style: italic;
        padding: var(--spacing-lg);
      }

      /* Keep panels side-by-side even on smaller screens */
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
          display: none; /* Hide icons on smaller screens */
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
      }

      /* Never stack the panels - keep them side by side */
      @media (max-width: 768px) {
        .dual-timing-container.layout-dual {
          grid-template-columns: 1fr 1fr; /* Still side by side */
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
      }
    `;

    document.head.appendChild(style);
  }

  attachEventListeners() {
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

        // Handle Tab key - switch between course inputs only
        if (e.key === 'Tab') {
          e.preventDefault();
          const targetCourse = course === 'left' ? 'right' : 'left';
          const targetInput = document.querySelector(`.racer-input[data-course="${targetCourse}"]`);

          // Validate current racer before switching
          await this.validateRacer(course);

          // Focus the other input
          if (targetInput) {
            targetInput.focus();
            targetInput.select();
          }
          return;
        }

        // Handle Enter key - validate and prepare to start
        if (e.key === 'Enter') {
          e.preventDefault();
          await this.validateAndPrepareRun(course);
        }
      });

      // Keep blur event for validation when clicking away
      input.addEventListener('blur', async (e) => {
        const course = e.target.dataset.course;
        // Small delay to allow suggestion clicks to register
        setTimeout(async () => {
          await this.validateRacer(course);
        }, 200);
      });
    });
  }

  async handleRacerSearch(course, query) {
    if (!query || query.length < 2) {
      this.hideSuggestions(course);
      return;
    }

    try {
      // Get autocomplete suggestions from database
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

      return `
        <div class="suggestion-item" data-racer-id="${s.id}" data-course="${course}">
          <div class="suggestion-primary">
            ${sourceIcon} #${s.bibNumber} - ${s.firstName} ${s.lastName}
          </div>
          <div class="suggestion-secondary">
            ID: ${s.id} | ${s.gender} | ${s.discipline}
            ${bestTime ? ` | Best: ${bestTime.toFixed(3)}s` : ''}
            ${s.hasRacePass ? ' ✓ Pass' : ''}
          </div>
        </div>
      `;
    }).join('');

    container.classList.add('active');

    // Click handler for suggestions
    container.querySelectorAll('.suggestion-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const racerId = e.currentTarget.dataset.racerId;
        const course = e.currentTarget.dataset.course;
        const input = document.querySelector(`.racer-input[data-course="${course}"]`);
        input.value = racerId;
        this.hideSuggestions(course);

        // Store selected racer for this course
        this.selectedRacers[course] = racerId;
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

  /**
   * Validate racer and store their info for quick start
   * Called when user tabs away or loses focus
   */
  async validateRacer(course) {
    const input = document.querySelector(`.racer-input[data-course="${course}"]`);
    const racerQuery = input.value.trim();

    if (!racerQuery) {
      // Clear any previously validated racer
      delete this.selectedRacers[course];
      input.classList.remove('validated', 'invalid');
      return;
    }

    try {
      // Search for racer in database
      const result = await window.racerDB.search(racerQuery, {
        checkCloud: true,
        isSubscribed: false, // TODO: Check actual subscription status
        isOnline: await window.electronAPI.checkInternet()
      });

      if (!result.racer) {
        // Racer not found - mark as invalid
        input.classList.remove('validated');
        input.classList.add('invalid');
        delete this.selectedRacers[course];
        return;
      }

      // Racer found - store and mark as validated
      const racer = result.racer;
      this.selectedRacers[course] = {
        id: racer.id,
        bibNumber: racer.bibNumber,
        firstName: racer.firstName,
        lastName: racer.lastName,
        gender: racer.gender,
        discipline: racer.discipline,
        needsWaiver: await window.racerDB.needsWaiver(racer.id)
      };

      input.classList.remove('invalid');
      input.classList.add('validated');

      // Update input to show racer's bib for consistency
      input.value = racer.bibNumber;

    } catch (err) {
      console.error('Racer validation error:', err);
      input.classList.remove('validated');
      input.classList.add('invalid');
      delete this.selectedRacers[course];
    }
  }

  /**
   * Validate racer and prepare for run start (when Enter is pressed)
   * Shows appropriate modal if needed, or enables start button
   */
  async validateAndPrepareRun(course) {
    const input = document.querySelector(`.racer-input[data-course="${course}"]`);
    const racerQuery = input.value.trim();

    if (!racerQuery) {
      window.showNotification('Error', 'Please enter a racer ID or bib number');
      return;
    }

    try {
      // Search for racer in database
      const result = await window.racerDB.search(racerQuery, {
        checkCloud: true,
        isSubscribed: false, // TODO: Check actual subscription status
        isOnline: await window.electronAPI.checkInternet()
      });

      if (!result.racer) {
        // Racer not found - show new racer registration
        this.showNewRacerModal(racerQuery, course);
        return;
      }

      const racer = result.racer;

      // Check if waiver needed
      const needsWaiver = await window.racerDB.needsWaiver(racer.id);
      if (needsWaiver) {
        this.showWaiverModal(racer, course);
        return;
      }

      // Store validated racer
      this.selectedRacers[course] = {
        id: racer.id,
        bibNumber: racer.bibNumber,
        firstName: racer.firstName,
        lastName: racer.lastName,
        gender: racer.gender,
        discipline: racer.discipline,
        needsWaiver: false
      };

      input.classList.remove('invalid');
      input.classList.add('validated');
      input.value = racer.bibNumber;

      // Show ready message and indicate they can click Start
      window.showNotification(
        'Ready to Start',
        `${racer.firstName} ${racer.lastName} (#${racer.bibNumber}) - Click START or press it when ready`
      );

    } catch (err) {
      console.error('Racer validation error:', err);
      window.showNotification('Error', err.message || 'Failed to validate racer');
    }
  }

  async handleStartRun(course) {
    const input = document.querySelector(`.racer-input[data-course="${course}"]`);

    // Check if we have a pre-validated racer from Enter/Tab validation
    let racer = this.selectedRacers[course];

    if (!racer || typeof racer === 'string') {
      // No pre-validated racer, need to search
      const racerQuery = input.value.trim();

      if (!racerQuery) {
        window.showNotification('Error', 'Please enter a racer ID or bib number');
        return;
      }

      try {
        // Search for racer in database
        const result = await window.racerDB.search(racerQuery, {
          checkCloud: true,
          isSubscribed: false, // TODO: Check actual subscription status
          isOnline: await window.electronAPI.checkInternet()
        });

        if (!result.racer) {
          // Racer not found - show new racer registration
          this.showNewRacerModal(racerQuery, course);
          return;
        }

        racer = result.racer;

        // Check if waiver needed
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
    } else {
      // Using pre-validated racer data
      // Check waiver again in case status changed
      if (racer.needsWaiver) {
        this.showWaiverModal(racer, course);
        return;
      }
    }

    try {
      // Start the run with validated racer data
      const run = await window.raceTiming.startRun(racer.id, racer.bibNumber, {
        course: course,
        racerName: `${racer.firstName} ${racer.lastName}`,
        gender: racer.gender,
        discipline: racer.discipline
      });

      if (run.error) {
        window.showNotification('Error', run.error);
        return;
      }

      // Success
      window.showNotification(
        'Run Started',
        `${racer.firstName} ${racer.lastName} (#${racer.bibNumber}) started on ${this.courses[course].name}`
      );

      // Clear input and validation state
      input.value = '';
      input.classList.remove('validated', 'invalid');
      delete this.selectedRacers[course];
      this.toggleButtons(course, true);

    } catch (err) {
      console.error('Start run error:', err);
      window.showNotification('Error', err.message || 'Failed to start run');
    }
  }

  showNewRacerModal(query, course) {
    // Check if racer registration modal is available
    if (!window.racerRegistrationModal) {
      console.error('Racer registration modal not initialized');
      window.showNotification(
        'Error',
        `Racer with bib/ID "${query}" not found. Registration system is loading...`
      );
      return;
    }

    // Open the racer registration modal
    window.racerRegistrationModal.open(
      query, // Pre-fill bib if it's a number
      course,
      async (racer, course) => {
        // Callback after racer is saved - automatically start their run
        try {
          const run = await window.raceTiming.startRun(racer.id, racer.bibNumber, {
            course: course,
            racerName: `${racer.firstName} ${racer.lastName}`,
            gender: racer.gender,
            discipline: racer.discipline
          });

          if (run.error) {
            window.showNotification('Error', run.error);
            return;
          }

          window.showNotification(
            'Run Started',
            `${racer.firstName} ${racer.lastName} (#${racer.bibNumber}) started on ${this.courses[course].name}`
          );

          this.selectedRacers[course] = racer.id;
          this.toggleButtons(course, true);
        } catch (err) {
          console.error('Failed to start run after registration:', err);
          window.showNotification('Error', 'Racer registered but failed to start run');
        }
      }
    );
  }

  showWaiverModal(racer, course) {
    // TODO: Implement waiver modal
    window.showNotification(
      'Waiver Required',
      `${racer.firstName} ${racer.lastName} needs to sign a waiver. Waiver system coming soon!`
    );
  }

  async handleFinishRun(course) {
    // TODO: Implement finish logic
    window.showNotification('Run Finished', `Run completed on ${this.courses[course].name}`);
    this.toggleButtons(course, false);
  }

  async handleDNF(course) {
    const reason = prompt('DNF Reason (optional):', 'Did Not Finish');
    if (reason === null) return;

    // TODO: Implement DNF logic
    window.showNotification('DNF', `Run marked as DNF on ${this.courses[course].name}`);
    this.toggleButtons(course, false);
  }

  async handleDSQ(course) {
    const reason = prompt('Disqualification Reason:', 'Missed Gate');
    if (!reason) return;

    // TODO: Implement DSQ logic
    window.showNotification('DSQ', `Run disqualified on ${this.courses[course].name}`);
    this.toggleButtons(course, false);
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

    // Update button states
    document.querySelectorAll('.layout-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.layout === layout);
    });

    // Update display
    this.updateLayout();

    // Save preference
    try {
      const config = await window.electronAPI.loadConfig();
      config.layoutMode = layout;
      await window.electronAPI.saveConfig(config);
    } catch (err) {
      console.error('Failed to save layout preference:', err);
    }
  }

  showCourseSettings(course) {
    // TODO: Open settings modal for this course
    window.showNotification('Settings', `Course settings for ${this.courses[course].name} coming soon!`);
  }

  async loadActiveRuns() {
    // TODO: Load from backend
  }

  setupRealtimeUpdates() {
    // TODO: Setup event listeners for real-time updates
  }
}

window.DualTimingPanel = DualTimingPanel;