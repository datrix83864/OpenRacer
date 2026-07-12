;(function () {
  'use strict';

  // Module-level state in a closure so re-injecting the script doesn't cause
  // "Identifier already declared" in jsdom-based tests.
  let currentUpdateInfo = null;
  let dualTimingPanel   = null;
  let leaderboardPanel  = null;
  let racerList         = null;

  // ── Notification ────────────────────────────────────────────────────────────

  function showNotification(title, body, duration) {
    duration = duration != null ? duration : 5000;
    const el      = document.getElementById('notification');
    const elTitle = document.getElementById('notificationTitle');
    const elBody  = document.getElementById('notificationBody');
    elTitle.textContent = title;
    elBody.textContent  = body;
    el.classList.add('active');
    setTimeout(function () { el.classList.remove('active'); }, duration);
  }

  // ── Tab switching ────────────────────────────────────────────────────────────

  function switchTab(name) {
    document.querySelectorAll('.tab-btn').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.tab === name);
    });
    document.querySelectorAll('.tab-panel').forEach(function (panel) {
      panel.classList.toggle('active', panel.id === 'tab-' + name);
    });

    if (name === 'results') {
      if (!leaderboardPanel) {
        leaderboardPanel = new window.LeaderboardPanel('leaderboardContainer');
      } else {
        leaderboardPanel.loadData();
      }
    }

    if (name === 'racers') {
      if (!racerList) {
        racerList = new window.RacerList('racerListContainer');
      } else {
        racerList.loadRacers();
      }
    }
  }

  // ── Status indicator ─────────────────────────────────────────────────────────

  function updateStatusIndicator(isOnline, subscription) {
    const dot  = document.getElementById('statusDot');
    const text = document.getElementById('statusText');

    if (!isOnline) {
      dot.className    = 'status-indicator offline';
      text.textContent = 'Offline';
      return;
    }

    if (subscription) {
      if (subscription.status === 'expired') {
        dot.className    = 'status-indicator warning';
        text.textContent = 'Subscription Expired';
      } else if (subscription.status === 'expiring') {
        dot.className    = 'status-indicator warning';
        text.textContent = 'Expires in ' + subscription.daysRemaining + 'd';
      } else if (subscription.status === 'active') {
        dot.className    = 'status-indicator online';
        text.textContent = 'Online — Premium';
      } else {
        dot.className    = 'status-indicator online';
        text.textContent = 'Online';
      }
    } else {
      dot.className    = 'status-indicator online';
      text.textContent = 'Online';
    }
  }

  // ── Update checking ──────────────────────────────────────────────────────────

  async function checkForUpdates(manual) {
    manual = !!manual;
    const statusText = document.getElementById('statusText');
    if (manual) statusText.textContent = 'Checking…';

    try {
      const result = await window.electronAPI.checkUpdates();

      if (result.status === 'no-internet') {
        updateStatusIndicator(false);
        if (manual) showNotification('No Internet', 'Running in offline mode.');
        return;
      }

      updateStatusIndicator(true, result.subscription || null);

      if (result.subscription && result.subscription.status === 'expired') {
        showNotification('Subscription Expired', 'Some features may be limited.', 8000);
      } else if (result.subscription && result.subscription.status === 'expiring' &&
                 result.subscription.daysRemaining <= 3) {
        showNotification('Subscription Expiring',
          'Expires in ' + result.subscription.daysRemaining + ' day(s).', 8000);
      }

      if (result.status === 'update-available') {
        currentUpdateInfo = result;
        showUpdateModal(result);
      } else if (result.status === 'up-to-date' && manual) {
        showNotification('Up to Date', 'You are running the latest version.');
      } else if (result.status === 'skipped' && manual) {
        showNotification('Update Available', 'An update is available but was skipped.');
      } else if (result.status === 'error' && manual) {
        showNotification('Update Check Failed', 'Please try again later.');
      }
    } catch (err) {
      console.error('Update check error:', err);
      if (manual) showNotification('Error', 'Failed to check for updates.');
    }
  }

  // ── Update modal ─────────────────────────────────────────────────────────────

  function showUpdateModal(info) {
    document.getElementById('updateBody').innerHTML =
      '<p><strong>Current:</strong> ' + info.current + '</p>' +
      '<p><strong>Latest:</strong> ' + info.latest + '</p>' +
      '<p style="margin-top:10px;"><strong>What\'s New:</strong></p>' +
      '<p style="font-size:12px;margin-top:6px;">' +
        ((info.releaseNotes || '').substring(0, 200)) + '…</p>';
    document.getElementById('updateModal').classList.add('active');
  }

  function hideUpdateModal() {
    document.getElementById('updateModal').classList.remove('active');
  }

  // ── Init ─────────────────────────────────────────────────────────────────────

  async function init() {
    dualTimingPanel = new window.DualTimingPanel('timingPanelContainer');

    try {
      const isOnline = await window.electronAPI.checkInternet();
      if (isOnline) {
        checkForUpdates(false);
      } else {
        updateStatusIndicator(false);
      }
    } catch (_) {
      updateStatusIndicator(false);
    }
  }

  // ── Wire up buttons and tabs ──────────────────────────────────────────────────

  document.querySelectorAll('.tab-btn').forEach(function (btn) {
    btn.addEventListener('click', function () { switchTab(btn.dataset.tab); });
  });

  document.getElementById('checkUpdateBtn').addEventListener('click', function () {
    checkForUpdates(true);
  });
  document.getElementById('downloadNowBtn').addEventListener('click', function () {
    hideUpdateModal();
  });
  document.getElementById('downloadBackgroundBtn').addEventListener('click', function () {
    showNotification('Background Download', 'Update will install on next restart.');
    hideUpdateModal();
  });
  document.getElementById('skipVersionBtn').addEventListener('click', async function () {
    if (currentUpdateInfo) {
      await window.electronAPI.skipVersion(currentUpdateInfo.latest);
      showNotification('Update Skipped',
        'Version ' + currentUpdateInfo.latest + ' will not be shown again.');
    }
    hideUpdateModal();
  });
  document.getElementById('remindLaterBtn').addEventListener('click', function () {
    showNotification('Reminder Set', 'You will be reminded about this update later.');
    hideUpdateModal();
  });
  document.getElementById('updateModal').addEventListener('click', function (e) {
    if (e.target.id === 'updateModal') hideUpdateModal();
  });

  // ── Expose for cross-component use and testing ────────────────────────────────

  window.showNotification      = showNotification;
  window.updateStatusIndicator = updateStatusIndicator;
  window.showUpdateModal       = showUpdateModal;
  window.hideUpdateModal       = hideUpdateModal;
  window.checkForUpdates       = checkForUpdates;
  window.switchTab             = switchTab;

  init();
}());
