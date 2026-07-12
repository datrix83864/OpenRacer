// ui/components/racer-management-panel.js
// Standalone racer search/registration panel that works alongside timing

class RacerManagementPanel {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      throw new Error(`Container '${containerId}' not found`);
    }

    this.searchResults = [];
    this.selectedRacer = null;

    this.init();
  }

  init() {
    this.render();
    this.attachEventListeners();
    this.addStyles();
  }

  render() {
    this.container.innerHTML = `
      <div class="racer-mgmt-panel">
        <div class="racer-mgmt-header">
          <h3 class="racer-mgmt-title">Racer Search & Registration</h3>
          <button class="btn btn-sm btn-primary new-racer-btn">
            ➕ New Racer
          </button>
        </div>

        <div class="racer-mgmt-search">
          <div class="search-input-wrapper">
            <input 
              type="text" 
              class="racer-search-input" 
              placeholder="Search by name, bib, or ID..." 
              autocomplete="off"
            />
            <button class="btn btn-sm btn-secondary clear-search-btn" style="display: none;">✕</button>
          </div>
          <div class="racer-search-results"></div>
        </div>

        <div class="racer-detail-panel" style="display: none;">
          <div class="racer-detail-header">
            <h4 class="racer-detail-name"></h4>
            <button class="btn btn-sm btn-secondary close-detail-btn">✕</button>
          </div>
          
          <div class="racer-detail-info">
            <div class="racer-detail-row">
              <span class="detail-label">Bib Number:</span>
              <span class="detail-value" id="detailBib"></span>
            </div>
            <div class="racer-detail-row">
              <span class="detail-label">Gender:</span>
              <span class="detail-value" id="detailGender"></span>
            </div>
            <div class="racer-detail-row">
              <span class="detail-label">Age:</span>
              <span class="detail-value" id="detailAge"></span>
            </div>
            <div class="racer-detail-row">
              <span class="detail-label">Discipline:</span>
              <span class="detail-value" id="detailDiscipline"></span>
            </div>
            <div class="racer-detail-row">
              <span class="detail-label">Payment:</span>
              <span class="detail-value" id="detailPayment"></span>
            </div>
            <div class="racer-detail-row">
              <span class="detail-label">Best Times:</span>
              <div class="detail-value best-times-display" id="detailBestTimes"></div>
            </div>
          </div>

          <div class="racer-assign-actions">
            <p class="assign-prompt">Assign to course:</p>
            <div class="assign-buttons">
              <button class="btn btn-primary assign-course-btn" data-course="left">
                <span class="course-indicator left"></span>
                Course A
              </button>
              <button class="btn btn-primary assign-course-btn" data-course="right">
                <span class="course-indicator right"></span>
                Course B
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  addStyles() {
    if (document.getElementById('racer-mgmt-styles')) return;

    const style = document.createElement('style');
    style.id = 'racer-mgmt-styles';
    style.textContent = `
      .racer-mgmt-panel {
        background: var(--bg-card);
        border: 1px solid var(--border-primary);
        border-radius: var(--radius-lg);
        padding: var(--spacing-lg);
        margin-bottom: var(--spacing-lg);
      }

      .racer-mgmt-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--spacing-md);
        padding-bottom: var(--spacing-md);
        border-bottom: 1px solid var(--border-secondary);
      }

      .racer-mgmt-title {
        font-size: var(--font-size-lg);
        font-weight: var(--font-weight-semibold);
        margin: 0;
        color: var(--text-primary);
      }

      .racer-mgmt-search {
        position: relative;
      }

      .search-input-wrapper {
        display: flex;
        gap: var(--spacing-xs);
        margin-bottom: var(--spacing-sm);
      }

      .racer-search-input {
        flex: 1;
        padding: var(--spacing-sm) var(--spacing-md);
        background: var(--bg-input);
        border: 1px solid var(--border-primary);
        border-radius: var(--radius-md);
        color: var(--text-primary);
        font-size: var(--font-size-base);
        transition: all var(--transition-base);
      }

      .racer-search-input:focus {
        outline: none;
        border-color: var(--color-primary);
        background: var(--bg-input-focus);
        box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
      }

      .clear-search-btn {
        padding: var(--spacing-sm);
        min-width: 40px;
      }

      .racer-search-results {
        max-height: 300px;
        overflow-y: auto;
        background: rgba(0, 0, 0, 0.2);
        border-radius: var(--radius-md);
        padding: var(--spacing-sm);
      }

      .racer-search-results:empty {
        display: none;
      }

      .search-result-item {
        background: var(--bg-input);
        border: 1px solid var(--border-primary);
        border-radius: var(--radius-md);
        padding: var(--spacing-sm) var(--spacing-md);
        margin-bottom: var(--spacing-xs);
        cursor: pointer;
        transition: all var(--transition-base);
      }

      .search-result-item:hover {
        background: var(--bg-card-hover);
        border-color: var(--color-primary);
        transform: translateX(4px);
      }

      .search-result-item:last-child {
        margin-bottom: 0;
      }

      .search-result-main {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--spacing-xs);
      }

      .search-result-name {
        font-size: var(--font-size-md);
        font-weight: var(--font-weight-semibold);
        color: var(--text-primary);
      }

      .search-result-bib {
        font-size: var(--font-size-lg);
        font-weight: var(--font-weight-bold);
        color: var(--color-primary);
      }

      .search-result-details {
        font-size: var(--font-size-sm);
        color: var(--text-secondary);
        display: flex;
        gap: var(--spacing-sm);
        flex-wrap: wrap;
      }

      .search-result-badge {
        display: inline-block;
        padding: 2px var(--spacing-xs);
        background: rgba(255, 255, 255, 0.1);
        border-radius: var(--radius-sm);
        font-size: var(--font-size-xs);
      }

      .search-result-badge.pass {
        background: rgba(16, 185, 129, 0.2);
        color: var(--color-success);
      }

      .search-result-badge.needs-payment {
        background: rgba(245, 158, 11, 0.2);
        color: var(--color-warning);
      }

      .racer-detail-panel {
        margin-top: var(--spacing-md);
        padding: var(--spacing-md);
        background: rgba(0, 0, 0, 0.2);
        border-radius: var(--radius-md);
        border: 1px solid var(--border-primary);
      }

      .racer-detail-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--spacing-md);
        padding-bottom: var(--spacing-sm);
        border-bottom: 1px solid var(--border-secondary);
      }

      .racer-detail-name {
        font-size: var(--font-size-xl);
        font-weight: var(--font-weight-bold);
        margin: 0;
        color: var(--text-primary);
      }

      .racer-detail-info {
        margin-bottom: var(--spacing-md);
      }

      .racer-detail-row {
        display: flex;
        padding: var(--spacing-xs) 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      }

      .racer-detail-row:last-child {
        border-bottom: none;
      }

      .detail-label {
        flex: 0 0 120px;
        font-weight: var(--font-weight-semibold);
        color: var(--text-secondary);
        font-size: var(--font-size-sm);
      }

      .detail-value {
        flex: 1;
        color: var(--text-primary);
        font-size: var(--font-size-sm);
      }

      .best-times-display {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-xs);
      }

      .best-time-item {
        display: flex;
        justify-content: space-between;
        padding: var(--spacing-xs);
        background: rgba(255, 255, 255, 0.05);
        border-radius: var(--radius-sm);
      }

      .racer-assign-actions {
        margin-top: var(--spacing-md);
        padding-top: var(--spacing-md);
        border-top: 1px solid var(--border-secondary);
      }

      .assign-prompt {
        font-size: var(--font-size-sm);
        color: var(--text-secondary);
        margin-bottom: var(--spacing-sm);
      }

      .assign-buttons {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--spacing-sm);
      }

      .assign-course-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--spacing-sm);
        padding: var(--spacing-md);
      }

      .course-indicator {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        display: inline-block;
      }

      .course-indicator.left {
        background: #667eea;
      }

      .course-indicator.right {
        background: #10b981;
      }

      .search-empty-state {
        text-align: center;
        padding: var(--spacing-xl);
        color: var(--text-tertiary);
        font-style: italic;
      }

      @media (max-width: 768px) {
        .racer-mgmt-panel {
          padding: var(--spacing-md);
        }

        .racer-mgmt-header {
          flex-direction: column;
          align-items: stretch;
          gap: var(--spacing-sm);
        }

        .assign-buttons {
          grid-template-columns: 1fr;
        }

        .detail-label {
          flex: 0 0 100px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  attachEventListeners() {
    // Search input
    const searchInput = this.container.querySelector('.racer-search-input');
    searchInput.addEventListener('input', (e) => {
      this.handleSearch(e.target.value);
    });

    // Clear search button
    const clearBtn = this.container.querySelector('.clear-search-btn');
    clearBtn.addEventListener('click', () => {
      searchInput.value = '';
      this.clearSearch();
      searchInput.focus();
    });

    // New racer button
    const newRacerBtn = this.container.querySelector('.new-racer-btn');
    newRacerBtn.addEventListener('click', () => {
      this.openNewRacerModal();
    });

    // Close detail panel
    const closeDetailBtn = this.container.querySelector('.close-detail-btn');
    closeDetailBtn.addEventListener('click', () => {
      this.hideDetailPanel();
    });

    // Assign course buttons
    this.container.querySelectorAll('.assign-course-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const course = e.currentTarget.dataset.course;
        this.assignToCourse(course);
      });
    });
  }

  async handleSearch(query) {
    const clearBtn = this.container.querySelector('.clear-search-btn');
    const resultsContainer = this.container.querySelector('.racer-search-results');

    if (!query || query.length < 2) {
      clearBtn.style.display = 'none';
      resultsContainer.innerHTML = '';
      return;
    }

    clearBtn.style.display = 'block';

    try {
      // Search in database
      const results = await window.racerDB.autocomplete(query, 10);
      this.displaySearchResults(results);
    } catch (err) {
      console.error('Search error:', err);
      resultsContainer.innerHTML = `
        <div class="search-empty-state">
          Error searching racers. Please try again.
        </div>
      `;
    }
  }

  displaySearchResults(results) {
    const resultsContainer = this.container.querySelector('.racer-search-results');

    if (!results || results.length === 0) {
      resultsContainer.innerHTML = `
        <div class="search-empty-state">
          No racers found. Click "New Racer" to register.
        </div>
      `;
      return;
    }

    resultsContainer.innerHTML = results.map(racer => {
      const age = this.calculateAge(racer.birthdate);
      const hasPass = racer.hasRacePass || false;
      const paymentBadge = hasPass 
        ? '<span class="search-result-badge pass">✓ Pass</span>' 
        : '<span class="search-result-badge needs-payment">💳 Pay</span>';

      return `
        <div class="search-result-item" data-racer-id="${racer.id}">
          <div class="search-result-main">
            <span class="search-result-name">${racer.firstName} ${racer.lastName}</span>
            <span class="search-result-bib">#${racer.bibNumber}</span>
          </div>
          <div class="search-result-details">
            <span>${racer.gender}</span>
            ${age ? `<span>Age ${age}</span>` : ''}
            <span>${racer.discipline || 'alpine'}</span>
            ${paymentBadge}
          </div>
        </div>
      `;
    }).join('');

    // Add click handlers to result items
    resultsContainer.querySelectorAll('.search-result-item').forEach(item => {
      item.addEventListener('click', async (e) => {
        const racerId = e.currentTarget.dataset.racerId;
        const racer = results.find(r => r.id === racerId);
        if (racer) {
          await this.showDetailPanel(racer);
        }
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

  async showDetailPanel(racer) {
    this.selectedRacer = racer;
    const detailPanel = this.container.querySelector('.racer-detail-panel');
    
    // Populate details
    this.container.querySelector('.racer-detail-name').textContent = 
      `${racer.firstName} ${racer.lastName}`;
    
    this.container.querySelector('#detailBib').textContent = `#${racer.bibNumber}`;
    
    const genderMap = { M: 'Male', F: 'Female', U: 'Unspecified' };
    this.container.querySelector('#detailGender').textContent = genderMap[racer.gender] || racer.gender;
    
    const age = this.calculateAge(racer.birthdate);
    this.container.querySelector('#detailAge').textContent = age ? `${age} years` : 'Not specified';
    
    this.container.querySelector('#detailDiscipline').textContent = 
      racer.discipline ? racer.discipline.charAt(0).toUpperCase() + racer.discipline.slice(1) : 'Alpine';
    
    const hasPass = racer.hasRacePass || false;
    const paymentHtml = hasPass 
      ? '<span class="search-result-badge pass">✓ Has Pass</span>' 
      : '<span class="search-result-badge needs-payment">💳 Needs Payment</span>';
    this.container.querySelector('#detailPayment').innerHTML = paymentHtml;

    // Best times
    const bestTimesContainer = this.container.querySelector('#detailBestTimes');
    if (racer.bestTimes && (racer.bestTimes.courseA.time || racer.bestTimes.courseB.time)) {
      let timesHtml = '';
      if (racer.bestTimes.courseA.time) {
        timesHtml += `
          <div class="best-time-item">
            <span>Course A:</span>
            <span>${racer.bestTimes.courseA.handicapped.toFixed(3)}s</span>
          </div>
        `;
      }
      if (racer.bestTimes.courseB.time) {
        timesHtml += `
          <div class="best-time-item">
            <span>Course B:</span>
            <span>${racer.bestTimes.courseB.handicapped.toFixed(3)}s</span>
          </div>
        `;
      }
      bestTimesContainer.innerHTML = timesHtml;
    } else {
      bestTimesContainer.innerHTML = '<span style="color: var(--text-tertiary);">No times recorded</span>';
    }

    // Show panel with animation
    detailPanel.style.display = 'block';
    setTimeout(() => {
      detailPanel.style.opacity = '1';
      detailPanel.style.transform = 'translateY(0)';
    }, 10);
  }

  hideDetailPanel() {
    const detailPanel = this.container.querySelector('.racer-detail-panel');
    detailPanel.style.display = 'none';
    this.selectedRacer = null;
  }

  clearSearch() {
    const resultsContainer = this.container.querySelector('.racer-search-results');
    const clearBtn = this.container.querySelector('.clear-search-btn');
    
    resultsContainer.innerHTML = '';
    clearBtn.style.display = 'none';
    this.hideDetailPanel();
  }

  assignToCourse(course) {
    if (!this.selectedRacer) {
      window.showNotification('Error', 'No racer selected');
      return;
    }

    // Get the dual timing panel instance
    if (!window.dualTimingPanel) {
      window.showNotification('Error', 'Timing panel not initialized');
      return;
    }

    // Assign racer to the specified course
    window.dualTimingPanel.assignRacerToCourse(course, this.selectedRacer);
    
    // Show notification
    const courseName = course === 'left' ? 'Course A' : 'Course B';
    window.showNotification(
      'Racer Assigned',
      `${this.selectedRacer.firstName} ${this.selectedRacer.lastName} (#${this.selectedRacer.bibNumber}) assigned to ${courseName}`
    );

    // Clear search and hide detail
    this.clearSearch();
    this.container.querySelector('.racer-search-input').value = '';
  }

  openNewRacerModal() {
    if (!window.racerRegistrationModal) {
      window.showNotification('Error', 'Registration modal not initialized');
      return;
    }

    // Open modal with callback to show racer after registration
    window.racerRegistrationModal.open(
      null, // No pre-filled bib
      null, // No course pre-selected
      async (racer) => {
        // After racer is registered, show them in detail panel
        await this.showDetailPanel(racer);
        window.showNotification(
          'Racer Registered',
          `${racer.firstName} ${racer.lastName} (#${racer.bibNumber}) has been registered. Assign them to a course.`
        );
      }
    );
  }
}

window.RacerManagementPanel = RacerManagementPanel;