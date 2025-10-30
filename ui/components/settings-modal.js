// ui/components/settings-modal.js
// Comprehensive settings modal for organization, courses, pacesetters, etc.

class SettingsModal {
  constructor() {
    this.currentTab = 'organization';
    this.settings = {};
    this.init();
  }

  async init() {
    await this.loadSettings();
    this.render();
    this.attachEventListeners();
  }

  async loadSettings() {
    try {
      this.settings = await window.electronAPI.loadConfig();
      
      // Set defaults if not present
      this.settings.organization = this.settings.organization || {
        name: '',
        logo: null,
        location: '',
        mountainId: 'default-mountain',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };

      this.settings.courses = this.settings.courses || {
        left: { name: 'Course A', color: '#667eea', enabled: true },
        right: { name: 'Course B', color: '#10b981', enabled: true }
      };

      this.settings.pacesetters = this.settings.pacesetters || [];
      
      this.settings.display = this.settings.display || {
        theme: 'dark',
        fontSize: 'medium',
        showBestTimes: true
      };

    } catch (err) {
      console.error('Error loading settings:', err);
    }
  }

  render() {
    // Check if modal already exists
    let modal = document.getElementById('settingsModal');
    
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'settingsModal';
      modal.className = 'settings-modal';
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="settings-overlay"></div>
      <div class="settings-container">
        <div class="settings-header">
          <h2>Settings</h2>
          <button class="btn btn-secondary close-settings-btn">✕</button>
        </div>

        <div class="settings-body">
          <div class="settings-tabs">
            <button class="settings-tab ${this.currentTab === 'organization' ? 'active' : ''}" data-tab="organization">
              🏢 Organization
            </button>
            <button class="settings-tab ${this.currentTab === 'courses' ? 'active' : ''}" data-tab="courses">
              🎿 Courses
            </button>
            <button class="settings-tab ${this.currentTab === 'pacesetters' ? 'active' : ''}" data-tab="pacesetters">
              ⏱️ Pacesetters
            </button>
            <button class="settings-tab ${this.currentTab === 'display' ? 'active' : ''}" data-tab="display">
              🎨 Display
            </button>
          </div>

          <div class="settings-content">
            ${this.renderTabContent()}
          </div>
        </div>

        <div class="settings-footer">
          <button class="btn btn-secondary cancel-settings-btn">Cancel</button>
          <button class="btn btn-primary save-settings-btn">Save Changes</button>
        </div>
      </div>
    `;

    this.addStyles();
  }

  renderTabContent() {
    switch (this.currentTab) {
      case 'organization':
        return this.renderOrganizationTab();
      case 'courses':
        return this.renderCoursesTab();
      case 'pacesetters':
        return this.renderPacesettersTab();
      case 'display':
        return this.renderDisplayTab();
      default:
        return '<p>Tab content not found</p>';
    }
  }

  renderOrganizationTab() {
    const org = this.settings.organization;
    
    return `
      <div class="settings-section">
        <h3>Organization Information</h3>
        
        <div class="form-group">
          <label for="orgName">Organization Name *</label>
          <input 
            type="text" 
            id="orgName" 
            class="form-input" 
            value="${org.name || ''}"
            placeholder="e.g., Alpine Racing Club"
          />
          <small class="form-help">This will appear on reports and displays</small>
        </div>

        <div class="form-group">
          <label for="orgLocation">Mountain Location *</label>
          <input 
            type="text" 
            id="orgLocation" 
            class="form-input" 
            value="${org.location || ''}"
            placeholder="e.g., Vail, Colorado"
          />
        </div>

        <div class="form-group">
          <label for="mountainId">Mountain ID *</label>
          <input 
            type="text" 
            id="mountainId" 
            class="form-input" 
            value="${org.mountainId || 'default-mountain'}"
            placeholder="e.g., vail-co"
          />
          <small class="form-help">Unique identifier for this location (lowercase, no spaces)</small>
        </div>

        <div class="form-group">
          <label for="orgLogo">Organization Logo</label>
          <div class="logo-upload-area">
            ${org.logo ? `
              <img src="${org.logo}" class="logo-preview" alt="Organization logo" />
              <button class="btn btn-sm btn-secondary remove-logo-btn">Remove Logo</button>
            ` : `
              <div class="logo-placeholder">
                <span>📷</span>
                <p>Click to upload logo</p>
              </div>
            `}
            <input type="file" id="orgLogo" accept="image/*" style="display: none;" />
          </div>
          <small class="form-help">PNG or JPG, max 500KB. Recommended: 200x200px</small>
        </div>

        <div class="form-group">
          <label for="timezone">Timezone</label>
          <input 
            type="text" 
            id="timezone" 
            class="form-input" 
            value="${org.timezone || ''}"
            readonly
            disabled
          />
          <small class="form-help">Detected automatically from system</small>
        </div>
      </div>
    `;
  }

  renderCoursesTab() {
    const courses = this.settings.courses;
    
    return `
      <div class="settings-section">
        <h3>Course Configuration</h3>
        <p class="section-description">Customize the names and colors for your timing courses</p>

        <div class="course-config-grid">
          <!-- Left Course / Course A -->
          <div class="course-config-card">
            <h4>Left Course (Course A)</h4>
            
            <div class="form-group">
              <label for="courseLeftName">Course Name</label>
              <input 
                type="text" 
                id="courseLeftName" 
                class="form-input" 
                value="${courses.left.name || 'Course A'}"
                placeholder="e.g., Red Course"
              />
            </div>

            <div class="form-group">
              <label for="courseLeftColor">Course Color</label>
              <div class="color-picker-group">
                <input 
                  type="color" 
                  id="courseLeftColor" 
                  class="color-input" 
                  value="${courses.left.color || '#667eea'}"
                />
                <input 
                  type="text" 
                  class="form-input color-text" 
                  value="${courses.left.color || '#667eea'}"
                  readonly
                />
              </div>
              <div class="color-preview" style="background: ${courses.left.color || '#667eea'}"></div>
            </div>

            <div class="form-group">
              <label class="checkbox-label">
                <input 
                  type="checkbox" 
                  id="courseLeftEnabled" 
                  ${courses.left.enabled !== false ? 'checked' : ''}
                />
                <span>Enable this course</span>
              </label>
            </div>
          </div>

          <!-- Right Course / Course B -->
          <div class="course-config-card">
            <h4>Right Course (Course B)</h4>
            
            <div class="form-group">
              <label for="courseRightName">Course Name</label>
              <input 
                type="text" 
                id="courseRightName" 
                class="form-input" 
                value="${courses.right.name || 'Course B'}"
                placeholder="e.g., Blue Course"
              />
            </div>

            <div class="form-group">
              <label for="courseRightColor">Course Color</label>
              <div class="color-picker-group">
                <input 
                  type="color" 
                  id="courseRightColor" 
                  class="color-input" 
                  value="${courses.right.color || '#10b981'}"
                />
                <input 
                  type="text" 
                  class="form-input color-text" 
                  value="${courses.right.color || '#10b981'}"
                  readonly
                />
              </div>
              <div class="color-preview" style="background: ${courses.right.color || '#10b981'}"></div>
            </div>

            <div class="form-group">
              <label class="checkbox-label">
                <input 
                  type="checkbox" 
                  id="courseRightEnabled" 
                  ${courses.right.enabled !== false ? 'checked' : ''}
                />
                <span>Enable this course</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderPacesettersTab() {
    const pacesetters = this.settings.pacesetters || [];
    
    return `
      <div class="settings-section">
        <h3>Pacesetters & Handicaps</h3>
        <p class="section-description">
          Define pacesetters for this mountain. Each pacesetter has a unique bib (P1, P2, etc.) 
          and their times are used to calculate handicaps for racers.
        </p>

        <div class="pacesetters-list">
          ${pacesetters.length === 0 ? `
            <div class="empty-state">
              <p>No pacesetters configured yet</p>
              <small>Click "Add Pacesetter" to get started</small>
            </div>
          ` : pacesetters.map((ps, index) => this.renderPacesetterRow(ps, index)).join('')}
        </div>

        <button class="btn btn-secondary add-pacesetter-btn">
          ➕ Add Pacesetter
        </button>

        <div class="info-box">
          <strong>💡 About Pacesetters:</strong>
          <ul>
            <li>Pacesetters establish the baseline for handicap calculations</li>
            <li>Use bibs like P1, P2, P3 (different from regular racer bibs)</li>
            <li>Each mountain has its own pacesetters</li>
            <li>Faster pacesetters = lower handicaps for racers</li>
          </ul>
        </div>
      </div>
    `;
  }

  renderPacesetterRow(pacesetter, index) {
    return `
      <div class="pacesetter-row" data-index="${index}">
        <div class="pacesetter-fields">
          <div class="form-group">
            <label>Bib</label>
            <input 
              type="text" 
              class="form-input pacesetter-bib" 
              value="${pacesetter.bib || `P${index + 1}`}"
              placeholder="P1"
              data-index="${index}"
            />
          </div>

          <div class="form-group">
            <label>Name</label>
            <input 
              type="text" 
              class="form-input pacesetter-name" 
              value="${pacesetter.name || ''}"
              placeholder="John Doe"
              data-index="${index}"
            />
          </div>

          <div class="form-group">
            <label>Gender</label>
            <select class="form-input pacesetter-gender" data-index="${index}">
              <option value="M" ${pacesetter.gender === 'M' ? 'selected' : ''}>Male</option>
              <option value="F" ${pacesetter.gender === 'F' ? 'selected' : ''}>Female</option>
            </select>
          </div>

          <div class="form-group">
            <label>Base Handicap</label>
            <input 
              type="number" 
              class="form-input pacesetter-handicap" 
              value="${pacesetter.handicap || 0}"
              step="0.01"
              placeholder="0.00"
              data-index="${index}"
            />
          </div>
        </div>

        <button class="btn btn-sm btn-danger remove-pacesetter-btn" data-index="${index}">
          🗑️
        </button>
      </div>
    `;
  }

  renderDisplayTab() {
    const display = this.settings.display;
    
    return `
      <div class="settings-section">
        <h3>Display Settings</h3>

        <div class="form-group">
          <label>Theme</label>
          <div class="radio-group">
            <label class="radio-label">
              <input 
                type="radio" 
                name="theme" 
                value="dark" 
                ${display.theme === 'dark' ? 'checked' : ''}
              />
              <span>🌙 Dark Mode (Recommended)</span>
            </label>
            <label class="radio-label">
              <input 
                type="radio" 
                name="theme" 
                value="light" 
                ${display.theme === 'light' ? 'checked' : ''}
                disabled
              />
              <span>☀️ Light Mode (Coming Soon)</span>
            </label>
          </div>
        </div>

        <div class="form-group">
          <label>Font Size</label>
          <select class="form-input" id="fontSize">
            <option value="small" ${display.fontSize === 'small' ? 'selected' : ''}>Small</option>
            <option value="medium" ${display.fontSize === 'medium' ? 'selected' : ''}>Medium</option>
            <option value="large" ${display.fontSize === 'large' ? 'selected' : ''}>Large</option>
          </select>
        </div>

        <div class="form-group">
          <label class="checkbox-label">
            <input 
              type="checkbox" 
              id="showBestTimes" 
              ${display.showBestTimes !== false ? 'checked' : ''}
            />
            <span>Show best times in racer info</span>
          </label>
        </div>

        <div class="form-group">
          <label>Layout Mode (Default)</label>
          <select class="form-input" id="defaultLayout">
            <option value="dual" ${this.settings.layoutMode === 'dual' ? 'selected' : ''}>Both Courses</option>
            <option value="left-only" ${this.settings.layoutMode === 'left-only' ? 'selected' : ''}>Left Course Only</option>
            <option value="right-only" ${this.settings.layoutMode === 'right-only' ? 'selected' : ''}>Right Course Only</option>
          </select>
        </div>
      </div>
    `;
  }

  addStyles() {
    if (document.getElementById('settings-modal-styles')) return;

    const style = document.createElement('style');
    style.id = 'settings-modal-styles';
    style.textContent = `
      .settings-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: var(--z-modal);
        display: none;
      }

      .settings-modal.active {
        display: block;
      }

      .settings-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(4px);
      }

      .settings-container {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 90%;
        max-width: 900px;
        max-height: 90vh;
        background: var(--bg-tertiary);
        border: 1px solid var(--border-primary);
        border-radius: var(--radius-lg);
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      .settings-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: var(--spacing-lg);
        border-bottom: 1px solid var(--border-primary);
      }

      .settings-header h2 {
        margin: 0;
        font-size: var(--font-size-2xl);
        font-weight: var(--font-weight-bold);
      }

      .settings-body {
        flex: 1;
        display: flex;
        overflow: hidden;
      }

      .settings-tabs {
        width: 200px;
        border-right: 1px solid var(--border-primary);
        padding: var(--spacing-md);
        display: flex;
        flex-direction: column;
        gap: var(--spacing-xs);
      }

      .settings-tab {
        padding: var(--spacing-sm) var(--spacing-md);
        background: transparent;
        border: 1px solid transparent;
        border-radius: var(--radius-md);
        color: var(--text-secondary);
        cursor: pointer;
        text-align: left;
        transition: all var(--transition-base);
        font-size: var(--font-size-sm);
      }

      .settings-tab:hover {
        background: var(--bg-card-hover);
        color: var(--text-primary);
      }

      .settings-tab.active {
        background: var(--color-primary);
        color: white;
        border-color: var(--color-primary);
      }

      .settings-content {
        flex: 1;
        padding: var(--spacing-lg);
        overflow-y: auto;
      }

      .settings-section h3 {
        margin: 0 0 var(--spacing-sm) 0;
        font-size: var(--font-size-xl);
        font-weight: var(--font-weight-semibold);
      }

      .section-description {
        color: var(--text-secondary);
        margin-bottom: var(--spacing-lg);
        font-size: var(--font-size-sm);
      }

      .form-group {
        margin-bottom: var(--spacing-md);
      }

      .form-group label {
        display: block;
        margin-bottom: var(--spacing-xs);
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
        transition: all var(--transition-base);
      }

      .form-input:focus {
        outline: none;
        border-color: var(--color-primary);
        background: var(--bg-input-focus);
      }

      .form-input:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .form-help {
        display: block;
        margin-top: var(--spacing-xs);
        font-size: var(--font-size-xs);
        color: var(--text-tertiary);
      }

      .logo-upload-area {
        border: 2px dashed var(--border-primary);
        border-radius: var(--radius-md);
        padding: var(--spacing-lg);
        text-align: center;
        cursor: pointer;
        transition: all var(--transition-base);
      }

      .logo-upload-area:hover {
        border-color: var(--color-primary);
        background: var(--bg-card-hover);
      }

      .logo-placeholder {
        color: var(--text-tertiary);
      }

      .logo-placeholder span {
        font-size: 48px;
        display: block;
        margin-bottom: var(--spacing-sm);
      }

      .logo-preview {
        max-width: 200px;
        max-height: 200px;
        margin-bottom: var(--spacing-sm);
        border-radius: var(--radius-md);
      }

      .course-config-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--spacing-lg);
        margin-top: var(--spacing-lg);
      }

      .course-config-card {
        background: rgba(0, 0, 0, 0.2);
        border: 1px solid var(--border-primary);
        border-radius: var(--radius-md);
        padding: var(--spacing-lg);
      }

      .course-config-card h4 {
        margin: 0 0 var(--spacing-md) 0;
        font-size: var(--font-size-md);
        font-weight: var(--font-weight-semibold);
      }

      .color-picker-group {
        display: flex;
        gap: var(--spacing-sm);
        align-items: center;
      }

      .color-input {
        width: 60px;
        height: 40px;
        border: 1px solid var(--border-primary);
        border-radius: var(--radius-md);
        cursor: pointer;
      }

      .color-text {
        flex: 1;
      }

      .color-preview {
        width: 100%;
        height: 40px;
        border-radius: var(--radius-md);
        margin-top: var(--spacing-sm);
        border: 1px solid var(--border-primary);
      }

      .checkbox-label {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
        cursor: pointer;
        font-size: var(--font-size-sm);
        color: var(--text-primary);
      }

      .checkbox-label input[type="checkbox"] {
        width: 20px;
        height: 20px;
        cursor: pointer;
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

      .radio-label input[type="radio"]:disabled {
        cursor: not-allowed;
      }

      .pacesetters-list {
        margin-bottom: var(--spacing-md);
      }

      .pacesetter-row {
        display: flex;
        gap: var(--spacing-sm);
        align-items: flex-end;
        padding: var(--spacing-md);
        background: rgba(0, 0, 0, 0.2);
        border: 1px solid var(--border-primary);
        border-radius: var(--radius-md);
        margin-bottom: var(--spacing-sm);
      }

      .pacesetter-fields {
        flex: 1;
        display: grid;
        grid-template-columns: 80px 1fr 100px 120px;
        gap: var(--spacing-sm);
      }

      .info-box {
        background: rgba(102, 126, 234, 0.1);
        border: 1px solid rgba(102, 126, 234, 0.3);
        border-radius: var(--radius-md);
        padding: var(--spacing-md);
        margin-top: var(--spacing-lg);
        font-size: var(--font-size-sm);
      }

      .info-box strong {
        display: block;
        margin-bottom: var(--spacing-sm);
        color: var(--color-primary-light);
      }

      .info-box ul {
        margin: 0;
        padding-left: var(--spacing-lg);
        color: var(--text-secondary);
      }

      .info-box li {
        margin-bottom: var(--spacing-xs);
      }

      .settings-footer {
        display: flex;
        justify-content: flex-end;
        gap: var(--spacing-sm);
        padding: var(--spacing-lg);
        border-top: 1px solid var(--border-primary);
      }

      .empty-state {
        text-align: center;
        padding: var(--spacing-xl);
        color: var(--text-tertiary);
      }

      .empty-state p {
        margin: 0 0 var(--spacing-xs) 0;
        font-style: italic;
      }

      .empty-state small {
        color: var(--text-tertiary);
        font-size: var(--font-size-xs);
      }

      @media (max-width: 768px) {
        .settings-container {
          width: 95%;
          max-height: 95vh;
        }

        .settings-body {
          flex-direction: column;
        }

        .settings-tabs {
          width: 100%;
          flex-direction: row;
          overflow-x: auto;
          border-right: none;
          border-bottom: 1px solid var(--border-primary);
        }

        .course-config-grid {
          grid-template-columns: 1fr;
        }

        .pacesetter-fields {
          grid-template-columns: 1fr;
        }
      }
    `;

    document.head.appendChild(style);
  }

  attachEventListeners() {
    const modal = document.getElementById('settingsModal');

    // Close buttons
    modal.querySelector('.close-settings-btn').addEventListener('click', () => {
      this.close();
    });

    modal.querySelector('.cancel-settings-btn').addEventListener('click', () => {
      this.close();
    });

    modal.querySelector('.settings-overlay').addEventListener('click', () => {
      this.close();
    });

    // Save button
    modal.querySelector('.save-settings-btn').addEventListener('click', async () => {
      await this.saveSettings();
    });

    // Tab switching
    modal.querySelectorAll('.settings-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        this.currentTab = e.target.dataset.tab;
        this.render();
        this.attachEventListeners();
      });
    });

    // Tab-specific event listeners
    this.attachTabSpecificListeners();
  }

  attachTabSpecificListeners() {
    const modal = document.getElementById('settingsModal');

    if (this.currentTab === 'organization') {
      // Logo upload
      const logoArea = modal.querySelector('.logo-upload-area');
      const logoInput = modal.querySelector('#orgLogo');
      
      if (logoArea && logoInput) {
        logoArea.addEventListener('click', () => {
          logoInput.click();
        });

        logoInput.addEventListener('change', (e) => {
          this.handleLogoUpload(e.target.files[0]);
        });
      }

      // Remove logo
      const removeLogo = modal.querySelector('.remove-logo-btn');
      if (removeLogo) {
        removeLogo.addEventListener('click', (e) => {
          e.stopPropagation();
          this.settings.organization.logo = null;
          this.render();
          this.attachEventListeners();
        });
      }
    }

    if (this.currentTab === 'courses') {
      // Color picker sync
      ['Left', 'Right'].forEach(side => {
        const colorInput = modal.querySelector(`#course${side}Color`);
        const colorText = colorInput?.nextElementSibling;
        
        if (colorInput && colorText) {
          colorInput.addEventListener('input', (e) => {
            colorText.value = e.target.value;
            const preview = e.target.closest('.form-group').querySelector('.color-preview');
            if (preview) {
              preview.style.background = e.target.value;
            }
          });
        }
      });
    }

    if (this.currentTab === 'pacesetters') {
      // Add pacesetter
      const addBtn = modal.querySelector('.add-pacesetter-btn');
      if (addBtn) {
        addBtn.addEventListener('click', () => {
          this.settings.pacesetters.push({
            bib: `P${this.settings.pacesetters.length + 1}`,
            name: '',
            gender: 'M',
            handicap: 0
          });
          this.render();
          this.attachEventListeners();
        });
      }

      // Remove pacesetter
      modal.querySelectorAll('.remove-pacesetter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const index = parseInt(e.target.dataset.index);
          this.settings.pacesetters.splice(index, 1);
          this.render();
          this.attachEventListeners();
        });
      });
    }
  }

  async handleLogoUpload(file) {
    if (!file) return;

    // Check file size (max 500KB)
    if (file.size > 500 * 1024) {
      window.showNotification('Error', 'Logo file must be under 500KB');
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      window.showNotification('Error', 'Please upload an image file');
      return;
    }

    // Read file as data URL
    const reader = new FileReader();
    reader.onload = (e) => {
      this.settings.organization.logo = e.target.result;
      this.render();
      this.attachEventListeners();
      window.showNotification('Success', 'Logo uploaded successfully');
    };
    reader.readAsDataURL(file);
  }

  async saveSettings() {
    const modal = document.getElementById('settingsModal');

    try {
      // Collect organization settings
      const orgName = modal.querySelector('#orgName')?.value;
      const orgLocation = modal.querySelector('#orgLocation')?.value;
      const mountainId = modal.querySelector('#mountainId')?.value;

      if (!orgName || !orgLocation || !mountainId) {
        window.showNotification('Error', 'Please fill in all required organization fields');
        return;
      }

      this.settings.organization.name = orgName;
      this.settings.organization.location = orgLocation;
      this.settings.organization.mountainId = mountainId;

      // Collect course settings
      this.settings.courses.left.name = modal.querySelector('#courseLeftName')?.value || 'Course A';
      this.settings.courses.left.color = modal.querySelector('#courseLeftColor')?.value || '#667eea';
      this.settings.courses.left.enabled = modal.querySelector('#courseLeftEnabled')?.checked !== false;

      this.settings.courses.right.name = modal.querySelector('#courseRightName')?.value || 'Course B';
      this.settings.courses.right.color = modal.querySelector('#courseRightColor')?.value || '#10b981';
      this.settings.courses.right.enabled = modal.querySelector('#courseRightEnabled')?.checked !== false;

      // Collect pacesetter settings
      const pacesetterRows = modal.querySelectorAll('.pacesetter-row');
      this.settings.pacesetters = [];
      
      pacesetterRows.forEach((row, index) => {
        const bib = row.querySelector('.pacesetter-bib')?.value;
        const name = row.querySelector('.pacesetter-name')?.value;
        const gender = row.querySelector('.pacesetter-gender')?.value;
        const handicap = parseFloat(row.querySelector('.pacesetter-handicap')?.value || 0);

        if (bib && name) {
          this.settings.pacesetters.push({
            bib,
            name,
            gender,
            handicap
          });
        }
      });

      // Collect display settings
      const themeRadio = modal.querySelector('input[name="theme"]:checked');
      if (themeRadio) {
        this.settings.display.theme = themeRadio.value;
      }

      this.settings.display.fontSize = modal.querySelector('#fontSize')?.value || 'medium';
      this.settings.display.showBestTimes = modal.querySelector('#showBestTimes')?.checked !== false;
      this.settings.layoutMode = modal.querySelector('#defaultLayout')?.value || 'dual';

      // Save to backend
      await window.electronAPI.saveConfig(this.settings);

      window.showNotification('Success', 'Settings saved successfully');
      
      // Notify other components to reload settings
      this.emit('settings-updated', this.settings);
      
      this.close();

      // If courses changed, suggest page reload
      if (window.dualTimingPanel) {
        const shouldReload = confirm('Course settings have changed. Reload the page to apply changes?');
        if (shouldReload) {
          window.location.reload();
        }
      }

    } catch (err) {
      console.error('Error saving settings:', err);
      window.showNotification('Error', 'Failed to save settings. Please try again.');
    }
  }

  open() {
    const modal = document.getElementById('settingsModal');
    if (modal) {
      modal.classList.add('active');
    }
  }

  close() {
    const modal = document.getElementById('settingsModal');
    if (modal) {
      modal.classList.remove('active');
    }
  }

  // Simple event emitter for settings updates
  emit(event, data) {
    window.dispatchEvent(new CustomEvent(event, { detail: data }));
  }
}

// Expose class globally but don't auto-initialize
// Let the app initialize it when needed
window.SettingsModal = SettingsModal;

// Initialize on DOM ready if called from a script tag
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (!window.settingsModal) {
      window.settingsModal = new SettingsModal();
    }
  });
} else {
  // DOM already loaded
  if (!window.settingsModal) {
    window.settingsModal = new SettingsModal();
  }
}