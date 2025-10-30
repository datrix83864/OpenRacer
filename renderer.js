// renderer.js - UI logic and interaction
let currentUpdateInfo = null;
let timingPanel = null;
let dualTimingPanel = null;

// Show notification
function showNotification(title, body, duration = 5000) {
  const notification = document.getElementById('notification');
  const notificationTitle = document.getElementById('notificationTitle');
  const notificationBody = document.getElementById('notificationBody');
  
  notificationTitle.textContent = title;
  notificationBody.textContent = body;
  notification.classList.add('active');
  
  setTimeout(() => {
    notification.classList.remove('active');
  }, duration);
}

// Make showNotification globally available for components
window.showNotification = showNotification;

// Show timing panel
function showTimingPanel() {
  const welcomeCard = document.getElementById('welcomeCard');
  const timingContainer = document.getElementById('timingPanelContainer');
  
  // Hide welcome screen
  welcomeCard.style.display = 'none';
  
  // Show timing panel container
  timingContainer.style.display = 'block';
  
  // Initialize racer management panel first (at the top)
  if (!window.racerManagementPanel) {
    // Create container for racer management panel
    const mgmtContainer = document.createElement('div');
    mgmtContainer.id = 'racerManagementContainer';
    timingContainer.insertBefore(mgmtContainer, timingContainer.firstChild);
    
    window.racerManagementPanel = new window.RacerManagementPanel('racerManagementContainer');
  }
  
  // Initialize DUAL timing panel below management panel
  if (!window.dualTimingPanel) {
    // Create container for dual timing panel
    const dualContainer = document.createElement('div');
    dualContainer.id = 'dualTimingContainer';
    timingContainer.appendChild(dualContainer);
    
    window.dualTimingPanel = new window.DualTimingPanel('dualTimingContainer');
    showNotification('Race Started', 'Dual course timing system is ready');
  }

  // Initialize results export modal (if not already initialized)
  if (!window.resultsExportModal) {
    window.resultsExportModal = new window.ResultsExportModal();
  }
}

// Show welcome screen
function showWelcomeScreen() {
  const welcomeCard = document.getElementById('welcomeCard');
  const timingContainer = document.getElementById('timingPanelContainer');
  
  welcomeCard.style.display = 'block';
  timingContainer.style.display = 'none';
}

// Update status indicator
function updateStatusIndicator(isOnline, subscriptionStatus = null) {
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  
  if (!isOnline) {
    statusDot.className = 'status-dot offline';
    statusText.textContent = 'Offline Mode';
    return;
  }
  
  if (subscriptionStatus) {
    if (subscriptionStatus.status === 'expired') {
      statusDot.className = 'status-dot warning';
      statusText.textContent = 'Subscription Expired';
    } else if (subscriptionStatus.status === 'expiring') {
      statusDot.className = 'status-dot warning';
      statusText.textContent = `Expires in ${subscriptionStatus.daysRemaining} days`;
    } else if (subscriptionStatus.status === 'active') {
      statusDot.className = 'status-dot';
      statusText.textContent = 'Online - Premium';
    } else {
      statusDot.className = 'status-dot';
      statusText.textContent = 'Online - Free Tier';
    }
  } else {
    statusDot.className = 'status-dot';
    statusText.textContent = 'Online';
  }
}

// Check for updates
async function checkForUpdates(manual = false) {
  const statusText = document.getElementById('statusText');
  const originalText = statusText.textContent;
  
  if (manual) {
    statusText.textContent = 'Checking for updates...';
  }
  
  try {
    const result = await window.electronAPI.checkUpdates();
    
    if (result.status === 'no-internet') {
      updateStatusIndicator(false);
      if (manual) {
        showNotification('No Internet', 'Unable to check for updates. Running in offline mode.');
      }
      return;
    }
    
    // Update status with subscription info
    if (result.subscription) {
      const isOnline = result.status !== 'no-internet';
      updateStatusIndicator(isOnline, result.subscription);
      
      // Show subscription warnings
      if (result.subscription.status === 'expired') {
        showNotification(
          'Subscription Expired',
          'Your premium subscription has expired. Some features may be limited.',
          8000
        );
      } else if (result.subscription.status === 'expiring' && result.subscription.daysRemaining <= 3) {
        showNotification(
          'Subscription Expiring Soon',
          `Your premium subscription expires in ${result.subscription.daysRemaining} days.`,
          8000
        );
      }
    } else {
      updateStatusIndicator(true);
    }
    
    if (result.status === 'update-available') {
      currentUpdateInfo = result;
      showUpdateModal(result);
    } else if (result.status === 'up-to-date' && manual) {
      showNotification('Up to Date', 'You are running the latest version of OpenRacer.');
    } else if (result.status === 'skipped' && manual) {
      showNotification('Update Available', 'An update is available, but you chose to skip it.');
    } else if (result.status === 'error' && manual) {
      showNotification('Update Check Failed', 'Unable to check for updates. Please try again later.');
    }
  } catch (err) {
    console.error('Update check error:', err);
    if (manual) {
      showNotification('Error', 'Failed to check for updates.');
    }
  }
}

// Show update modal
function showUpdateModal(updateInfo) {
  const modal = document.getElementById('updateModal');
  const updateBody = document.getElementById('updateBody');
  
  updateBody.innerHTML = `
    <p><strong>Current Version:</strong> ${updateInfo.current}</p>
    <p><strong>New Version:</strong> ${updateInfo.latest}</p>
    <p style="margin-top: 12px;"><strong>What's New:</strong></p>
    <p style="font-size: 12px; margin-top: 8px;">${updateInfo.releaseNotes?.substring(0, 200)}...</p>
  `;
  
  modal.classList.add('active');
}

// Hide update modal
function hideUpdateModal() {
  const modal = document.getElementById('updateModal');
  modal.classList.remove('active');
}

// Initialize app
async function init() {
  // Check connection and updates on startup
  const hasInternet = await window.electronAPI.checkInternet();
  
  if (hasInternet) {
    // Check for updates automatically on startup
    await checkForUpdates(false);
  } else {
    updateStatusIndicator(false);
  }
}

// Event listeners
document.getElementById('checkUpdateBtn').addEventListener('click', () => {
  checkForUpdates(true);
});

// Start New Race button
document.getElementById('startNewRaceBtn').addEventListener('click', () => {
  showTimingPanel();
});

document.getElementById('downloadNowBtn').addEventListener('click', async () => {
  if (currentUpdateInfo && currentUpdateInfo.downloadUrl) {
    showNotification('Opening Download', 'Your browser will open to download the update.');
    // In a real app, you'd handle the download here
    window.open(currentUpdateInfo.downloadUrl, '_blank');
  }
  hideUpdateModal();
});

document.getElementById('downloadBackgroundBtn').addEventListener('click', async () => {
  showNotification('Background Download', 'Update will download in the background and install on next restart.');
  // In a real app, you'd start background download here
  hideUpdateModal();
});

document.getElementById('skipVersionBtn').addEventListener('click', async () => {
  if (currentUpdateInfo) {
    await window.electronAPI.skipVersion(currentUpdateInfo.latest);
    showNotification('Update Skipped', `Version ${currentUpdateInfo.latest} will not be shown again.`);
  }
  hideUpdateModal();
});

document.getElementById('remindLaterBtn').addEventListener('click', () => {
  showNotification('Reminder Set', 'You will be reminded about this update later.');
  hideUpdateModal();
});

// Settings button
document.getElementById('settingsBtn').addEventListener('click', () => {
  const settingsModal = document.getElementById('settingsModal');
  settingsModal.classList.add('active');
});

// Close modal when clicking outside
document.getElementById('updateModal').addEventListener('click', (e) => {
  if (e.target.id === 'updateModal') {
    hideUpdateModal();
  }
});

// Initialize on load
init();