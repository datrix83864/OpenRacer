// ui/components/results-export-modal.js
// Results export with PDF generation including all racer runs

class ResultsExportModal {
  constructor() {
    this.settings = {};
    this.results = [];
    this.pacesetterTimes = {};
    this.init();
  }

  async init() {
    console.log('ResultsExportModal: Initializing...');
    await this.loadSettings();
    this.render();
    this.attachEventListeners();
    console.log('ResultsExportModal: Initialized successfully');
  }

  async loadSettings() {
    try {
      this.settings = await window.electronAPI.loadConfig();
      console.log('ResultsExportModal: Settings loaded', this.settings);
    } catch (err) {
      console.error('Error loading settings:', err);
      this.settings = {
        organization: {},
        courses: {},
        pacesetters: []
      };
    }
  }

  render() {
    let modal = document.getElementById('resultsExportModal');
    
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'resultsExportModal';
      modal.className = 'results-export-modal';
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="export-overlay"></div>
      <div class="export-container">
        <div class="export-header">
          <h2>Export Race Results</h2>
          <button class="btn btn-secondary close-export-btn">✕</button>
        </div>

        <div class="export-body">
          <div class="export-options">
            <h3>Export Options</h3>

            <div class="form-group">
              <label>Export Format</label>
              <div class="radio-group">
                <label class="radio-label">
                  <input type="radio" name="exportFormat" value="pdf" checked />
                  <span>📄 PDF Report</span>
                </label>
                <label class="radio-label">
                  <input type="radio" name="exportFormat" value="csv" />
                  <span>📊 CSV Spreadsheet</span>
                </label>
                <label class="radio-label">
                  <input type="radio" name="exportFormat" value="json" />
                  <span>💾 JSON Data</span>
                </label>
              </div>
            </div>

            <div class="form-group">
              <label>Include in Export</label>
              <label class="checkbox-label">
                <input type="checkbox" id="includeAllRuns" checked />
                <span>All runs per racer (not just best)</span>
              </label>
              <label class="checkbox-label">
                <input type="checkbox" id="includePacesetters" checked />
                <span>Pacesetter information</span>
              </label>
              <label class="checkbox-label">
                <input type="checkbox" id="includeDNF" checked />
                <span>DNF/DSQ runs</span>
              </label>
            </div>

            <div class="form-group">
              <label for="exportCourse">Course Filter</label>
              <select id="exportCourse" class="form-input">
                <option value="all">All Courses</option>
                <option value="left">Left Course Only</option>
                <option value="right">Right Course Only</option>
              </select>
            </div>

            <div class="export-preview-stats">
              <div class="stat-card">
                <span class="stat-label">Total Racers</span>
                <span class="stat-value" id="totalRacers">--</span>
              </div>
              <div class="stat-card">
                <span class="stat-label">Total Runs</span>
                <span class="stat-value" id="totalRuns">--</span>
              </div>
              <div class="stat-card">
                <span class="stat-label">Valid Times</span>
                <span class="stat-value" id="validTimes">--</span>
              </div>
            </div>
          </div>

          <div class="export-preview">
            <h3>Preview</h3>
            <div class="preview-container" id="previewContainer">
              <p class="preview-loading">Loading results...</p>
            </div>
          </div>
        </div>

        <div class="export-footer">
          <button class="btn btn-secondary cancel-export-btn">Cancel</button>
          <button class="btn btn-primary export-btn">
            <span class="btn-icon">⬇️</span>
            Export Results
          </button>
        </div>
      </div>
    `;

    this.addStyles();
  }

  addStyles() {
    if (document.getElementById('results-export-styles')) return;

    const style = document.createElement('style');
    style.id = 'results-export-styles';
    style.textContent = `
      .results-export-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: var(--z-modal);
        display: none;
      }

      .results-export-modal.active {
        display: block;
      }

      .export-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(4px);
      }

      .export-container {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 90%;
        max-width: 1200px;
        max-height: 90vh;
        background: var(--bg-tertiary);
        border: 1px solid var(--border-primary);
        border-radius: var(--radius-lg);
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      .export-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: var(--spacing-lg);
        border-bottom: 1px solid var(--border-primary);
      }

      .export-header h2 {
        margin: 0;
        font-size: var(--font-size-2xl);
        font-weight: var(--font-weight-bold);
      }

      .export-body {
        flex: 1;
        display: grid;
        grid-template-columns: 350px 1fr;
        overflow: hidden;
      }

      .export-options {
        padding: var(--spacing-lg);
        border-right: 1px solid var(--border-primary);
        overflow-y: auto;
      }

      .export-options h3 {
        margin: 0 0 var(--spacing-md) 0;
        font-size: var(--font-size-lg);
        font-weight: var(--font-weight-semibold);
      }

      .export-preview {
        padding: var(--spacing-lg);
        overflow-y: auto;
        background: rgba(0, 0, 0, 0.2);
      }

      .export-preview h3 {
        margin: 0 0 var(--spacing-md) 0;
        font-size: var(--font-size-lg);
        font-weight: var(--font-weight-semibold);
      }

      .preview-container {
        background: white;
        color: black;
        padding: var(--spacing-xl);
        border-radius: var(--radius-md);
        min-height: 400px;
      }

      .preview-loading {
        text-align: center;
        color: #666;
        padding: var(--spacing-xl);
      }

      .export-preview-stats {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: var(--spacing-sm);
        margin-top: var(--spacing-lg);
      }

      .stat-card {
        background: rgba(0, 0, 0, 0.2);
        border-radius: var(--radius-md);
        padding: var(--spacing-md);
        text-align: center;
      }

      .stat-label {
        display: block;
        font-size: var(--font-size-xs);
        color: var(--text-secondary);
        margin-bottom: var(--spacing-xs);
      }

      .stat-value {
        display: block;
        font-size: var(--font-size-xl);
        font-weight: var(--font-weight-bold);
        color: var(--color-primary);
      }

      .form-group {
        margin-bottom: var(--spacing-lg);
      }

      .form-group label {
        display: block;
        margin-bottom: var(--spacing-sm);
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-medium);
        color: var(--text-secondary);
      }

      .form-input {
        width: 100%;
        padding: var(--spacing-sm) var(--spacing-md);
        background: var(--bg-input);
        border: 1px solid var(--border-primary);
        border-radius: var(--radius-md);
        color: var(--text-primary);
        font-size: var(--font-size-base);
      }

      .radio-group {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-sm);
      }

      .radio-label {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
        padding: var(--spacing-sm);
        border: 1px solid var(--border-primary);
        border-radius: var(--radius-md);
        cursor: pointer;
        transition: all var(--transition-base);
      }

      .radio-label:hover {
        background: var(--bg-card-hover);
      }

      .radio-label input[type="radio"] {
        width: 18px;
        height: 18px;
        cursor: pointer;
      }

      .checkbox-label {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
        padding: var(--spacing-xs) 0;
        cursor: pointer;
        font-size: var(--font-size-sm);
      }

      .checkbox-label input[type="checkbox"] {
        width: 18px;
        height: 18px;
        cursor: pointer;
      }

      .export-footer {
        display: flex;
        justify-content: flex-end;
        gap: var(--spacing-sm);
        padding: var(--spacing-lg);
        border-top: 1px solid var(--border-primary);
      }

      /* PDF Preview Styles */
      .pdf-page {
        font-family: Arial, sans-serif;
        line-height: 1.4;
      }

      .pdf-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        padding-bottom: 20px;
        border-bottom: 2px solid #333;
        margin-bottom: 20px;
      }

      .pdf-logo-section {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .pdf-org-logo {
        max-width: 150px;
        max-height: 80px;
      }

      .pdf-openracer-badge {
        font-size: 10px;
        color: #666;
        font-style: italic;
      }

      .pdf-title-section {
        text-align: right;
      }

      .pdf-title {
        font-size: 24px;
        font-weight: bold;
        margin: 0 0 5px 0;
      }

      .pdf-subtitle {
        font-size: 14px;
        color: #666;
        margin: 0;
      }

      .pdf-info-section {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
        margin-bottom: 20px;
        padding: 15px;
        background: #f5f5f5;
        border-radius: 8px;
      }

      .pdf-info-group h4 {
        margin: 0 0 10px 0;
        font-size: 12px;
        color: #666;
        text-transform: uppercase;
      }

      .pdf-info-item {
        margin-bottom: 5px;
        font-size: 12px;
      }

      .pdf-results-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 20px;
        font-size: 11px;
      }

      .pdf-results-table th {
        background: #333;
        color: white;
        padding: 8px;
        text-align: left;
        font-weight: bold;
      }

      .pdf-results-table td {
        padding: 6px 8px;
        border-bottom: 1px solid #ddd;
      }

      .pdf-results-table tr:hover {
        background: #f9f9f9;
      }

      .racer-main-row {
        background: #f0f0f0;
        font-weight: bold;
      }

      .racer-sub-row {
        color: #666;
        font-size: 10px;
      }

      .position-badge {
        display: inline-block;
        width: 30px;
        height: 30px;
        line-height: 30px;
        text-align: center;
        border-radius: 50%;
        background: #667eea;
        color: white;
        font-weight: bold;
      }

      .position-badge.gold {
        background: #ffd700;
        color: #333;
      }

      .position-badge.silver {
        background: #c0c0c0;
        color: #333;
      }

      .position-badge.bronze {
        background: #cd7f32;
        color: white;
      }

      @media (max-width: 768px) {
        .export-body {
          grid-template-columns: 1fr;
        }

        .export-options {
          border-right: none;
          border-bottom: 1px solid var(--border-primary);
        }

        .export-preview-stats {
          grid-template-columns: 1fr;
        }
      }
    `;

    document.head.appendChild(style);
  }

  attachEventListeners() {
    const modal = document.getElementById('resultsExportModal');

    // Close buttons
    modal.querySelector('.close-export-btn').addEventListener('click', () => {
      this.close();
    });

    modal.querySelector('.cancel-export-btn').addEventListener('click', () => {
      this.close();
    });

    modal.querySelector('.export-overlay').addEventListener('click', () => {
      this.close();
    });

    // Export button
    modal.querySelector('.export-btn').addEventListener('click', async () => {
      await this.handleExport();
    });

    // Option changes trigger preview update
    modal.querySelectorAll('input[type="checkbox"], input[type="radio"], select').forEach(input => {
      input.addEventListener('change', () => {
        this.updatePreview();
      });
    });
  }

  async open() {
    const modal = document.getElementById('resultsExportModal');
    if (modal) {
      modal.classList.add('active');
      await this.loadResults();
      this.updatePreview();
    }
  }

  close() {
    const modal = document.getElementById('resultsExportModal');
    if (modal) {
      modal.classList.remove('active');
    }
  }

  async loadResults() {
    try {
      // Get all completed runs from timing system
      const completedRuns = await window.raceTiming.getCompletedRuns();
      
      // Get pacesetter times
      await this.loadPacesetterTimes();

      // Group runs by racer
      const racerMap = new Map();
      
      completedRuns.forEach(run => {
        if (!racerMap.has(run.racerId)) {
          racerMap.set(run.racerId, {
            racerId: run.racerId,
            bibNumber: run.bibNumber,
            name: run.metadata?.racerName || 'Unknown',
            age: run.metadata?.age || null,
            gender: run.metadata?.gender || 'U',
            discipline: run.metadata?.discipline || 'alpine',
            runs: []
          });
        }
        
        racerMap.get(run.racerId).runs.push(run);
      });

      // Calculate handicaps and find best run for each racer
      this.results = Array.from(racerMap.values()).map(racer => {
        // Calculate handicap for each run
        racer.runs.forEach(run => {
          run.handicap = this.calculateHandicap(run);
        });

        // Find best handicap (lowest)
        const validRuns = racer.runs.filter(r => r.status === 'completed' && r.handicap !== null);
        racer.bestHandicap = validRuns.length > 0
          ? Math.min(...validRuns.map(r => r.handicap))
          : null;

        // Sort runs by handicap (best first)
        racer.runs.sort((a, b) => {
          if (a.handicap === null) return 1;
          if (b.handicap === null) return -1;
          return a.handicap - b.handicap;
        });

        return racer;
      });

      // Sort racers by best handicap (ascending = better)
      this.results.sort((a, b) => {
        if (a.bestHandicap === null) return 1;
        if (b.bestHandicap === null) return -1;
        return a.bestHandicap - b.bestHandicap;
      });

      this.updateStats();

    } catch (err) {
      console.error('Error loading results:', err);
      window.showNotification('Error', 'Failed to load race results');
    }
  }

  async loadPacesetterTimes() {
    // TODO: Implement actual pacesetter time loading
    // For now, use placeholder times
    this.pacesetterTimes = {
      'P1': { time: 12.5, gender: 'M', name: 'John Smith' },
      'P2': { time: 13.2, gender: 'F', name: 'Jane Doe' }
    };
  }

  calculateHandicap(run) {
    if (run.status !== 'completed' || !run.adjustedTime) {
      return null;
    }

    // TODO: Implement actual NASTAR-style handicap calculation
    // For now, use simple percentage above pacesetter time
    const baseTime = 12.5; // Placeholder pacesetter time
    const handicap = ((run.adjustedTime - baseTime) / baseTime) * 100;
    
    return Math.round(handicap * 100) / 100; // Round to 2 decimals
  }

  updateStats() {
    const modal = document.getElementById('resultsExportModal');
    
    const totalRacers = this.results.length;
    const totalRuns = this.results.reduce((sum, r) => sum + r.runs.length, 0);
    const validTimes = this.results.filter(r => r.bestHandicap !== null).length;

    modal.querySelector('#totalRacers').textContent = totalRacers;
    modal.querySelector('#totalRuns').textContent = totalRuns;
    modal.querySelector('#validTimes').textContent = validTimes;
  }

  updatePreview() {
    const modal = document.getElementById('resultsExportModal');
    const format = modal.querySelector('input[name="exportFormat"]:checked')?.value;
    const previewContainer = modal.querySelector('#previewContainer');

    if (format === 'pdf') {
      previewContainer.innerHTML = this.generatePDFPreview();
    } else if (format === 'csv') {
      previewContainer.innerHTML = '<pre style="color: #333; font-size: 10px;">' + 
        this.generateCSVPreview() + '</pre>';
    } else if (format === 'json') {
      previewContainer.innerHTML = '<pre style="color: #333; font-size: 10px;">' + 
        JSON.stringify(this.prepareExportData(), null, 2).substring(0, 1000) + '...</pre>';
    }
  }

  generatePDFPreview() {
    const org = this.settings.organization || {};
    const includeAllRuns = document.querySelector('#includeAllRuns')?.checked;
    const includePacesetters = document.querySelector('#includePacesetters')?.checked;
    const now = new Date();

    let html = `
      <div class="pdf-page">
        <div class="pdf-header">
          <div class="pdf-logo-section">
            ${org.logo ? `<img src="${org.logo}" class="pdf-org-logo" alt="Organization Logo" />` : ''}
            <div class="pdf-openracer-badge">Powered by OpenRacer</div>
          </div>
          <div class="pdf-title-section">
            <h1 class="pdf-title">Race Results</h1>
            <p class="pdf-subtitle">${org.name || 'Race Results'}</p>
            <p class="pdf-subtitle">${now.toLocaleDateString()} ${now.toLocaleTimeString()}</p>
          </div>
        </div>

        <div class="pdf-info-section">
          <div class="pdf-info-group">
            <h4>Event Information</h4>
            <div class="pdf-info-item"><strong>Location:</strong> ${org.location || 'Not specified'}</div>
            <div class="pdf-info-item"><strong>Date:</strong> ${now.toLocaleDateString()}</div>
            <div class="pdf-info-item"><strong>Total Racers:</strong> ${this.results.length}</div>
          </div>
          ${includePacesetters ? `
            <div class="pdf-info-group">
              <h4>Pacesetters</h4>
              ${Object.entries(this.pacesetterTimes).map(([bib, ps]) => `
                <div class="pdf-info-item"><strong>${bib}:</strong> ${ps.name} (${ps.gender}) - ${ps.time.toFixed(3)}s</div>
              `).join('')}
            </div>
          ` : ''}
        </div>

        <table class="pdf-results-table">
          <thead>
            <tr>
              <th style="width: 50px;">Place</th>
              <th style="width: 60px;">Bib</th>
              <th>Name</th>
              <th style="width: 80px;">Age/Disc</th>
              <th style="width: 80px;">Time</th>
              <th style="width: 80px;">Handicap</th>
            </tr>
          </thead>
          <tbody>
            ${this.results.map((racer, index) => this.renderRacerRows(racer, index + 1, includeAllRuns)).join('')}
          </tbody>
        </table>
      </div>
    `;

    return html;
  }

  renderRacerRows(racer, position, includeAllRuns) {
    const bestRun = racer.runs[0]; // Already sorted by handicap
    const positionClass = position === 1 ? 'gold' : position === 2 ? 'silver' : position === 3 ? 'bronze' : '';

    let rows = `
      <tr class="racer-main-row">
        <td><span class="position-badge ${positionClass}">${position}</span></td>
        <td>#${racer.bibNumber}</td>
        <td>${racer.name}</td>
        <td>${racer.age || '--'} / ${racer.discipline}</td>
        <td>${bestRun.adjustedTime.toFixed(3)}s</td>
        <td>${racer.bestHandicap !== null ? racer.bestHandicap.toFixed(2) : 'DNF'}</td>
      </tr>
    `;

    // Add additional runs if option is checked
    if (includeAllRuns && racer.runs.length > 1) {
      racer.runs.slice(1).forEach((run, idx) => {
        rows += `
          <tr class="racer-sub-row">
            <td></td>
            <td></td>
            <td style="padding-left: 20px;">Run ${idx + 2}</td>
            <td></td>
            <td>${run.adjustedTime ? run.adjustedTime.toFixed(3) + 's' : run.status.toUpperCase()}</td>
            <td>${run.handicap !== null ? run.handicap.toFixed(2) : '--'}</td>
          </tr>
        `;
      });
    }

    return rows;
  }

  generateCSVPreview() {
    const includeAllRuns = document.querySelector('#includeAllRuns')?.checked;
    const lines = [
      'Place,Bib,Name,Age,Gender,Discipline,Time,Handicap,Run Number,Status'
    ];

    this.results.forEach((racer, index) => {
      if (includeAllRuns) {
        racer.runs.forEach((run, runIdx) => {
          lines.push([
            runIdx === 0 ? index + 1 : '',
            racer.bibNumber,
            racer.name,
            racer.age || '',
            racer.gender,
            racer.discipline,
            run.adjustedTime ? run.adjustedTime.toFixed(3) : '',
            run.handicap !== null ? run.handicap.toFixed(2) : '',
            runIdx + 1,
            run.status
          ].join(','));
        });
      } else {
        // Just best run
        const bestRun = racer.runs[0];
        lines.push([
          index + 1,
          racer.bibNumber,
          racer.name,
          racer.age || '',
          racer.gender,
          racer.discipline,
          bestRun.adjustedTime ? bestRun.adjustedTime.toFixed(3) : '',
          racer.bestHandicap !== null ? racer.bestHandicap.toFixed(2) : '',
          1,
          bestRun.status
        ].join(','));
      }
    });

    return lines.slice(0, 20).join('\n') + '\n... (preview limited to 20 rows)';
  }

  prepareExportData() {
    return {
      organization: this.settings.organization,
      exportDate: new Date().toISOString(),
      pacesetters: this.pacesetterTimes,
      results: this.results
    };
  }

  async handleExport() {
    const format = document.querySelector('input[name="exportFormat"]:checked')?.value;

    try {
      if (format === 'pdf') {
        await this.exportPDF();
      } else if (format === 'csv') {
        await this.exportCSV();
      } else if (format === 'json') {
        await this.exportJSON();
      }
    } catch (err) {
      console.error('Export error:', err);
      window.showNotification('Error', 'Failed to export results');
    }
  }

  async exportPDF() {
    try {
      // Access jsPDF from global scope
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();

      const org = this.settings.organization || {};
      const includeAllRuns = document.querySelector('#includeAllRuns')?.checked;
      const includePacesetters = document.querySelector('#includePacesetters')?.checked;
      const now = new Date();

      let yPos = 20;

      // Add organization logo if available
      if (org.logo) {
        try {
          doc.addImage(org.logo, 'PNG', 15, yPos, 40, 20);
        } catch (err) {
          console.warn('Could not add logo to PDF:', err);
        }
      }

      // Header - Organization Name
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text(org.name || 'Race Results', 105, yPos + 10, { align: 'center' });
      
      yPos += 15;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`${org.location || 'Location Not Set'}`, 105, yPos, { align: 'center' });
      
      yPos += 8;
      doc.setFontSize(10);
      doc.text(`${now.toLocaleDateString()} ${now.toLocaleTimeString()}`, 105, yPos, { align: 'center' });

      // Powered by OpenRacer
      yPos += 6;
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text('Powered by OpenRacer', 105, yPos, { align: 'center' });
      doc.setTextColor(0, 0, 0);

      yPos += 10;

      // Event Information Box
      doc.setFillColor(245, 245, 245);
      doc.rect(15, yPos, 180, includePacesetters ? 35 : 20, 'F');
      
      yPos += 8;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Event Information', 20, yPos);

      yPos += 6;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`Total Racers: ${this.results.length}`, 20, yPos);
      doc.text(`Total Runs: ${this.results.reduce((sum, r) => sum + r.runs.length, 0)}`, 80, yPos);
      doc.text(`Valid Times: ${this.results.filter(r => r.bestHandicap !== null).length}`, 140, yPos);

      // Pacesetters info
      if (includePacesetters) {
        yPos += 8;
        doc.setFont('helvetica', 'bold');
        doc.text('Pacesetters:', 20, yPos);
        doc.setFont('helvetica', 'normal');
        
        let xOffset = 55;
        Object.entries(this.pacesetterTimes).forEach(([bib, ps]) => {
          doc.text(`${bib}: ${ps.name} (${ps.gender}) - ${ps.time.toFixed(3)}s`, xOffset, yPos);
          xOffset += 70;
        });
      }

      yPos += 15;

      // Results Table
      const tableData = [];
      
      this.results.forEach((racer, index) => {
        // Main row with best run
        const bestRun = racer.runs[0];
        tableData.push([
          (index + 1).toString(),
          `#${racer.bibNumber}`,
          racer.name,
          `${racer.age || '--'} / ${racer.discipline}`,
          bestRun.adjustedTime ? `${bestRun.adjustedTime.toFixed(3)}s` : bestRun.status.toUpperCase(),
          racer.bestHandicap !== null ? racer.bestHandicap.toFixed(2) : 'DNF'
        ]);

        // Additional runs if option is checked
        if (includeAllRuns && racer.runs.length > 1) {
          racer.runs.slice(1).forEach((run, runIdx) => {
            tableData.push([
              '',
              '',
              `  Run ${runIdx + 2}`,
              '',
              run.adjustedTime ? `${run.adjustedTime.toFixed(3)}s` : run.status.toUpperCase(),
              run.handicap !== null ? run.handicap.toFixed(2) : '--'
            ]);
          });
        }
      });

      doc.autoTable({
        startY: yPos,
        head: [['Place', 'Bib', 'Name', 'Age/Disc', 'Time', 'Handicap']],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor: [51, 51, 51],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 10
        },
        bodyStyles: {
          fontSize: 9
        },
        columnStyles: {
          0: { cellWidth: 15, halign: 'center' },
          1: { cellWidth: 20 },
          2: { cellWidth: 50 },
          3: { cellWidth: 25 },
          4: { cellWidth: 25, halign: 'right' },
          5: { cellWidth: 25, halign: 'right' }
        },
        didParseCell: function(data) {
          // Style main racer rows differently from sub-rows
          if (data.section === 'body' && data.column.index === 2) {
            if (!data.cell.text[0].startsWith('  ')) {
              // Main row - bold
              data.cell.styles.fontStyle = 'bold';
              data.cell.styles.fillColor = [240, 240, 240];
            } else {
              // Sub row - lighter
              data.cell.styles.textColor = [100, 100, 100];
              data.cell.styles.fontSize = 8;
            }
          }
          
          // Highlight top 3
          if (data.section === 'body' && data.column.index === 0 && data.row.index < 3) {
            const colors = [
              [255, 215, 0],   // Gold
              [192, 192, 192], // Silver
              [205, 127, 50]   // Bronze
            ];
            if (data.cell.text[0] && data.cell.text[0] !== '') {
              const place = parseInt(data.cell.text[0]);
              if (place >= 1 && place <= 3) {
                data.cell.styles.fillColor = colors[place - 1];
                data.cell.styles.fontStyle = 'bold';
              }
            }
          }
        }
      });

      // Save the PDF
      const filename = `race-results-${org.mountainId || 'results'}-${Date.now()}.pdf`;
      doc.save(filename);

      window.showNotification('Success', `PDF exported: ${filename}`);
      this.close();

    } catch (err) {
      console.error('PDF export error:', err);
      window.showNotification('Error', 'Failed to generate PDF. Make sure jsPDF is loaded.');
    }
  }

  async exportCSV() {
    const includeAllRuns = document.querySelector('#includeAllRuns')?.checked;
    const lines = [
      'Place,Bib,Name,Age,Gender,Discipline,Time,Handicap,Run Number,Status'
    ];

    this.results.forEach((racer, index) => {
      if (includeAllRuns) {
        racer.runs.forEach((run, runIdx) => {
          lines.push([
            runIdx === 0 ? index + 1 : '',
            racer.bibNumber,
            racer.name,
            racer.age || '',
            racer.gender,
            racer.discipline,
            run.adjustedTime ? run.adjustedTime.toFixed(3) : '',
            run.handicap !== null ? run.handicap.toFixed(2) : '',
            runIdx + 1,
            run.status
          ].join(','));
        });
      } else {
        const bestRun = racer.runs[0];
        lines.push([
          index + 1,
          racer.bibNumber,
          racer.name,
          racer.age || '',
          racer.gender,
          racer.discipline,
          bestRun.adjustedTime ? bestRun.adjustedTime.toFixed(3) : '',
          racer.bestHandicap !== null ? racer.bestHandicap.toFixed(2) : '',
          1,
          bestRun.status
        ].join(','));
      }
    });

    const csv = lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `race-results-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    window.showNotification('Success', 'CSV file downloaded');
    this.close();
  }

  async exportJSON() {
    const json = JSON.stringify(this.prepareExportData(), null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `race-results-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    window.showNotification('Success', 'JSON file downloaded');
    this.close();
  }
}

// Initialize and expose globally
if (!window.resultsExportModal) {
  window.resultsExportModal = new ResultsExportModal();
}

window.ResultsExportModal = ResultsExportModal;