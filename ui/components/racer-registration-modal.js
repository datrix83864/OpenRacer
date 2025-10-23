// ui/components/racer-registration-modal.js
// Modal for registering new racers

class RacerRegistrationModal {
  constructor() {
    this.isOpen = false;
    this.onSaveCallback = null;
    this.suggestedBib = null;
    this.course = null;
    this.render();
  }

  render() {
    // Create modal container
    const modal = document.createElement('div');
    modal.id = 'racerRegistrationModal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-container racer-modal">
        <div class="modal-header">
          <h2 class="modal-title">Register New Racer</h2>
          <button class="modal-close-btn" id="closeRacerModal">&times;</button>
        </div>

        <div class="modal-body">
          <div class="racer-form">
            <!-- Bib Number -->
            <div class="form-section">
              <div class="input-group">
                <label>Bib Number <span class="required">*</span></label>
                <div class="bib-input-wrapper">
                  <input 
                    type="text" 
                    id="racerBibNumber" 
                    placeholder="Auto-suggested"
                    autocomplete="off"
                  />
                  <button class="btn btn-sm btn-secondary" id="suggestBibBtn">
                    Suggest Next
                  </button>
                </div>
                <div class="input-hint">
                  Other operators may be using bibs. Check before starting the race.
                </div>
              </div>
            </div>

            <!-- Personal Information -->
            <div class="form-section">
              <h3 class="section-header">Personal Information</h3>
              
              <div class="form-row">
                <div class="input-group">
                  <label>First Name <span class="required">*</span></label>
                  <input 
                    type="text" 
                    id="racerFirstName" 
                    placeholder="John"
                    autocomplete="off"
                  />
                </div>
                
                <div class="input-group">
                  <label>Last Name <span class="required">*</span></label>
                  <input 
                    type="text" 
                    id="racerLastName" 
                    placeholder="Doe"
                    autocomplete="off"
                  />
                </div>
              </div>

              <div class="form-row">
                <div class="input-group">
                  <label>Gender <span class="required">*</span></label>
                  <select id="racerGender">
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                    <option value="U">Prefer not to say</option>
                  </select>
                </div>
                
                <div class="input-group">
                  <label>Discipline <span class="required">*</span></label>
                  <select id="racerDiscipline">
                    <option value="alpine">Alpine Skiing</option>
                    <option value="snowboard">Snowboarding</option>
                    <option value="telemark">Telemark</option>
                    <option value="adaptive">Adaptive</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- Disabilities (Optional) -->
            <div class="form-section">
              <h3 class="section-header">Disabilities (Optional)</h3>
              <div class="checkbox-grid" id="disabilitiesCheckboxes">
                <label class="checkbox-label">
                  <input type="checkbox" value="visual" class="disability-checkbox" />
                  <span>Visual Impairment</span>
                </label>
                <label class="checkbox-label">
                  <input type="checkbox" value="hearing" class="disability-checkbox" />
                  <span>Hearing Impairment</span>
                </label>
                <label class="checkbox-label">
                  <input type="checkbox" value="mobility" class="disability-checkbox" />
                  <span>Mobility Impairment</span>
                </label>
                <label class="checkbox-label">
                  <input type="checkbox" value="cognitive" class="disability-checkbox" />
                  <span>Cognitive Impairment</span>
                </label>
                <label class="checkbox-label">
                  <input type="checkbox" value="upper_limb" class="disability-checkbox" />
                  <span>Upper Limb</span>
                </label>
                <label class="checkbox-label">
                  <input type="checkbox" value="lower_limb" class="disability-checkbox" />
                  <span>Lower Limb</span>
                </label>
              </div>
            </div>

            <!-- Contact Information (Optional) -->
            <div class="form-section collapsible">
              <h3 class="section-header clickable" id="contactSectionHeader">
                <span>Contact Information (Optional)</span>
                <span class="collapse-icon">▼</span>
              </h3>
              <div class="collapsible-content" id="contactSection">
                <div class="form-row">
                  <div class="input-group">
                    <label>Email</label>
                    <input 
                      type="email" 
                      id="racerEmail" 
                      placeholder="john.doe@example.com"
                      autocomplete="off"
                    />
                  </div>
                  
                  <div class="input-group">
                    <label>Phone</label>
                    <input 
                      type="tel" 
                      id="racerPhone" 
                      placeholder="(555) 123-4567"
                      autocomplete="off"
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- Mountain-Specific -->
            <div class="form-section">
              <h3 class="section-header">Mountain Information</h3>
              
              <label class="checkbox-label large">
                <input type="checkbox" id="racerHasPass" />
                <span>Has Race Pass at this Mountain</span>
              </label>

              <div class="info-box">
                <strong>Note:</strong> Waiver will be required on first run if enabled in settings.
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary" id="cancelRacerBtn">Cancel</button>
          <button class="btn btn-primary" id="saveRacerBtn">
            Save & Start Race
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.addStyles();
    this.attachEventListeners();
  }

  addStyles() {
    if (document.getElementById('racer-modal-styles')) return;

    const style = document.createElement('style');
    style.id = 'racer-modal-styles';
    style.textContent = `
      .modal-overlay {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.75);
        backdrop-filter: blur(4px);
        z-index: var(--z-modal);
        align-items: center;
        justify-content: center;
        padding: var(--spacing-lg);
        overflow-y: auto;
      }

      .modal-overlay.active {
        display: flex;
      }

      .modal-container {
        background: var(--bg-tertiary);
        border: 1px solid var(--border-primary);
        border-radius: var(--radius-lg);
        width: 100%;
        max-width: 700px;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
        animation: modalSlideIn 0.3s ease-out;
      }

      @keyframes modalSlideIn {
        from {
          transform: translateY(-50px);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }

      .modal-header {
        padding: var(--spacing-lg);
        border-bottom: 1px solid var(--border-primary);
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .modal-title {
        font-size: var(--font-size-2xl);
        font-weight: var(--font-weight-bold);
        margin: 0;
      }

      .modal-close-btn {
        background: none;
        border: none;
        font-size: var(--font-size-3xl);
        color: var(--text-secondary);
        cursor: pointer;
        padding: 0;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: var(--radius-md);
        transition: all var(--transition-base);
      }

      .modal-close-btn:hover {
        background: var(--bg-card-hover);
        color: var(--text-primary);
      }

      .modal-body {
        flex: 1;
        overflow-y: auto;
        padding: var(--spacing-lg);
      }

      .modal-footer {
        padding: var(--spacing-lg);
        border-top: 1px solid var(--border-primary);
        display: flex;
        justify-content: flex-end;
        gap: var(--spacing-sm);
      }

      .racer-form {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-lg);
      }

      .form-section {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-md);
      }

      .section-header {
        font-size: var(--font-size-lg);
        font-weight: var(--font-weight-semibold);
        color: var(--text-primary);
        margin: 0;
        padding-bottom: var(--spacing-sm);
        border-bottom: 1px solid var(--border-secondary);
      }

      .section-header.clickable {
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: center;
        user-select: none;
      }

      .section-header.clickable:hover {
        color: var(--color-primary);
      }

      .collapse-icon {
        transition: transform var(--transition-base);
      }

      .section-header.collapsed .collapse-icon {
        transform: rotate(-90deg);
      }

      .collapsible-content {
        max-height: 500px;
        overflow: hidden;
        transition: max-height var(--transition-slow);
      }

      .collapsible-content.collapsed {
        max-height: 0;
      }

      .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--spacing-md);
      }

      .bib-input-wrapper {
        display: flex;
        gap: var(--spacing-xs);
      }

      .bib-input-wrapper input {
        flex: 1;
      }

      .input-hint {
        font-size: var(--font-size-xs);
        color: var(--text-tertiary);
        margin-top: var(--spacing-xs);
        font-style: italic;
      }

      .required {
        color: var(--color-danger);
      }

      .checkbox-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: var(--spacing-sm);
      }

      .checkbox-label {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
        cursor: pointer;
        padding: var(--spacing-sm);
        border-radius: var(--radius-md);
        transition: background var(--transition-fast);
      }

      .checkbox-label:hover {
        background: var(--bg-card-hover);
      }

      .checkbox-label.large {
        padding: var(--spacing-md);
        background: var(--bg-card);
        border: 1px solid var(--border-primary);
      }

      .checkbox-label input[type="checkbox"] {
        width: 18px;
        height: 18px;
        cursor: pointer;
      }

      .info-box {
        background: rgba(102, 126, 234, 0.1);
        border: 1px solid rgba(102, 126, 234, 0.3);
        border-radius: var(--radius-md);
        padding: var(--spacing-md);
        font-size: var(--font-size-sm);
        color: var(--text-secondary);
      }

      @media (max-width: 768px) {
        .form-row {
          grid-template-columns: 1fr;
        }

        .checkbox-grid {
          grid-template-columns: 1fr;
        }

        .modal-container {
          max-width: 100%;
          max-height: 100vh;
          border-radius: 0;
        }
      }
    `;

    document.head.appendChild(style);
  }

  attachEventListeners() {
    const modal = document.getElementById('racerRegistrationModal');

    // Close buttons
    document.getElementById('closeRacerModal').addEventListener('click', () => {
      this.close();
    });

    document.getElementById('cancelRacerBtn').addEventListener('click', () => {
      this.close();
    });

    // Click outside to close
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.close();
      }
    });

    // Suggest bib button
    document.getElementById('suggestBibBtn').addEventListener('click', async () => {
      await this.suggestNextBib();
    });

    // Save button
    document.getElementById('saveRacerBtn').addEventListener('click', () => {
      this.save();
    });

    // Collapsible section
    document.getElementById('contactSectionHeader').addEventListener('click', () => {
      this.toggleSection('contactSection', 'contactSectionHeader');
    });

    // Enter key in form fields
    const inputs = modal.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"]');
    inputs.forEach(input => {
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.save();
        }
      });
    });
  }

  async open(initialBib = '', course = 'left', onSave = null) {
    this.course = course;
    this.onSaveCallback = onSave;

    // Pre-fill bib if provided
    document.getElementById('racerBibNumber').value = initialBib;

    // If no bib provided, suggest one
    if (!initialBib) {
      await this.suggestNextBib();
    }

    // Focus first input
    setTimeout(() => {
      if (!initialBib) {
        document.getElementById('racerFirstName').focus();
      } else {
        document.getElementById('racerFirstName').focus();
      }
    }, 100);

    // Show modal
    const modal = document.getElementById('racerRegistrationModal');
    modal.classList.add('active');
    this.isOpen = true;
  }

  close() {
    const modal = document.getElementById('racerRegistrationModal');
    modal.classList.remove('active');
    this.isOpen = false;
    this.clearForm();
  }

  async suggestNextBib() {
    try {
      const nextBib = await window.racerDB.getNextBib();
      document.getElementById('racerBibNumber').value = nextBib;
      this.suggestedBib = nextBib;
      window.showNotification('Bib Suggested', `Next available bib: ${nextBib}`);
    } catch (err) {
      console.error('Failed to suggest bib:', err);
      window.showNotification('Error', 'Failed to suggest next bib number');
    }
  }

  toggleSection(contentId, headerId) {
    const content = document.getElementById(contentId);
    const header = document.getElementById(headerId);
    
    content.classList.toggle('collapsed');
    header.classList.toggle('collapsed');
  }

  async save() {
    // Get form values
    const bibNumber = document.getElementById('racerBibNumber').value.trim();
    const firstName = document.getElementById('racerFirstName').value.trim();
    const lastName = document.getElementById('racerLastName').value.trim();
    const gender = document.getElementById('racerGender').value;
    const discipline = document.getElementById('racerDiscipline').value;
    const email = document.getElementById('racerEmail').value.trim();
    const phone = document.getElementById('racerPhone').value.trim();
    const hasRacePass = document.getElementById('racerHasPass').checked;

    // Get disabilities
    const disabilities = [];
    document.querySelectorAll('.disability-checkbox:checked').forEach(checkbox => {
      disabilities.push(checkbox.value);
    });

    // Validate required fields
    if (!bibNumber) {
      window.showNotification('Validation Error', 'Bib number is required');
      document.getElementById('racerBibNumber').focus();
      return;
    }

    if (!firstName) {
      window.showNotification('Validation Error', 'First name is required');
      document.getElementById('racerFirstName').focus();
      return;
    }

    if (!lastName) {
      window.showNotification('Validation Error', 'Last name is required');
      document.getElementById('racerLastName').focus();
      return;
    }

    // Validate bib number format (numbers only)
    if (!/^\d+$/.test(bibNumber)) {
      window.showNotification('Validation Error', 'Bib number must contain only numbers');
      document.getElementById('racerBibNumber').focus();
      return;
    }

    try {
      // Save racer to database
      const racer = await window.racerDB.save({
        bibNumber,
        firstName,
        lastName,
        gender,
        discipline,
        disabilities,
        email: email || null,
        phone: phone || null,
        hasRacePass,
        waiverSigned: false, // Will be prompted on first run
        lastRaceDate: new Date().toISOString().split('T')[0]
      });

      if (racer.error) {
        window.showNotification('Error', racer.error);
        return;
      }

      // Success
      window.showNotification(
        'Racer Registered',
        `${firstName} ${lastName} (#${bibNumber}) has been registered`
      );

      // Call callback if provided
      if (this.onSaveCallback) {
        this.onSaveCallback(racer, this.course);
      }

      this.close();
    } catch (err) {
      console.error('Failed to save racer:', err);
      window.showNotification('Error', 'Failed to save racer: ' + err.message);
    }
  }

  clearForm() {
    document.getElementById('racerBibNumber').value = '';
    document.getElementById('racerFirstName').value = '';
    document.getElementById('racerLastName').value = '';
    document.getElementById('racerGender').value = 'M';
    document.getElementById('racerDiscipline').value = 'alpine';
    document.getElementById('racerEmail').value = '';
    document.getElementById('racerPhone').value = '';
    document.getElementById('racerHasPass').checked = false;
    
    document.querySelectorAll('.disability-checkbox').forEach(checkbox => {
      checkbox.checked = false;
    });
  }
}

// Create global instance
window.racerRegistrationModal = new RacerRegistrationModal();