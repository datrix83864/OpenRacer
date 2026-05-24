const fs = require('fs');
const path = require('path');

/**
 * renderer.test.js
 * Tests for renderer.js shell: tab switching, update checking, notifications.
 */

describe('renderer.js UI logic', () => {
    const rendererPath = path.join(__dirname, '../renderer.js');

    beforeAll(() => {
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterAll(() => {
        console.error.mockRestore();
    });

    beforeEach(() => {
        jest.resetModules();
        jest.useFakeTimers();

        // Minimal DOM matching index.html structure
        document.body.innerHTML = `
            <div id="notification" class="">
                <div id="notificationTitle"></div>
                <div id="notificationBody"></div>
            </div>

            <button class="tab-btn active" data-tab="timing"></button>
            <button class="tab-btn"        data-tab="results"></button>
            <button class="tab-btn"        data-tab="racers"></button>

            <div id="tab-timing"  class="tab-panel active"></div>
            <div id="tab-results" class="tab-panel"></div>
            <div id="tab-racers"  class="tab-panel"></div>

            <div id="timingPanelContainer"></div>
            <div id="leaderboardContainer"></div>
            <div id="racerListContainer"></div>

            <div id="statusDot"  class="status-indicator online"></div>
            <div id="statusText"></div>

            <div id="updateModal" class="">
                <div id="updateBody"></div>
            </div>

            <button id="checkUpdateBtn"></button>
            <button id="downloadNowBtn"></button>
            <button id="downloadBackgroundBtn"></button>
            <button id="skipVersionBtn"></button>
            <button id="remindLaterBtn"></button>
        `;

        window.DualTimingPanel    = jest.fn().mockImplementation(() => ({}));
        window.LeaderboardPanel   = jest.fn().mockImplementation(() => ({ loadData: jest.fn() }));
        window.RacerList          = jest.fn().mockImplementation(() => ({ loadRacers: jest.fn() }));

        window.electronAPI = {
            checkInternet: jest.fn().mockResolvedValue(false), // skip live network by default
            checkUpdates:  jest.fn().mockResolvedValue({ status: 'up-to-date' }),
            skipVersion:   jest.fn().mockResolvedValue(),
        };
    });

    afterEach(() => {
        jest.runOnlyPendingTimers();
        jest.useRealTimers();
    });

    function loadRenderer() {
        const src = fs.readFileSync(rendererPath, 'utf8');
        const script = document.createElement('script');
        script.textContent = src;
        document.body.appendChild(script);
    }

    // ── showNotification ───────────────────────────────────────────────────────

    test('showNotification sets title/body, adds active class and removes it after duration', () => {
        loadRenderer();
        const notification = document.getElementById('notification');
        const titleEl      = document.getElementById('notificationTitle');
        const bodyEl       = document.getElementById('notificationBody');

        window.showNotification('Hello', 'World', 1000);

        expect(titleEl.textContent).toBe('Hello');
        expect(bodyEl.textContent).toBe('World');
        expect(notification.classList.contains('active')).toBe(true);

        jest.advanceTimersByTime(1000);
        expect(notification.classList.contains('active')).toBe(false);
    });

    // ── DualTimingPanel init ───────────────────────────────────────────────────

    test('init() creates DualTimingPanel immediately', () => {
        loadRenderer();
        expect(window.DualTimingPanel).toHaveBeenCalledWith('timingPanelContainer');
    });

    // ── Tab switching ──────────────────────────────────────────────────────────

    test('switchTab activates the correct panel and button', () => {
        loadRenderer();

        const btnTiming  = document.querySelector('[data-tab="timing"]');
        const btnResults = document.querySelector('[data-tab="results"]');
        const panelTiming  = document.getElementById('tab-timing');
        const panelResults = document.getElementById('tab-results');

        // Switch to results
        btnResults.click();

        expect(btnResults.classList.contains('active')).toBe(true);
        expect(btnTiming.classList.contains('active')).toBe(false);
        expect(panelResults.classList.contains('active')).toBe(true);
        expect(panelTiming.classList.contains('active')).toBe(false);

        // LeaderboardPanel should be lazily initialized
        expect(window.LeaderboardPanel).toHaveBeenCalledWith('leaderboardContainer');
    });

    test('switchTab lazy-inits RacerList on first racers tab click', () => {
        loadRenderer();
        const btnRacers = document.querySelector('[data-tab="racers"]');
        btnRacers.click();
        expect(window.RacerList).toHaveBeenCalledWith('racerListContainer');
    });

    // ── updateStatusIndicator ─────────────────────────────────────────────────

    test('updateStatusIndicator sets correct classes and text', () => {
        loadRenderer();
        const dot  = document.getElementById('statusDot');
        const text = document.getElementById('statusText');

        // offline
        window.updateStatusIndicator(false);
        expect(dot.className).toContain('offline');
        expect(text.textContent).toBe('Offline');

        // online, no subscription
        window.updateStatusIndicator(true, null);
        expect(dot.className).toContain('online');
        expect(text.textContent).toBe('Online');

        // active premium
        window.updateStatusIndicator(true, { status: 'active' });
        expect(text.textContent).toContain('Premium');

        // expiring
        window.updateStatusIndicator(true, { status: 'expiring', daysRemaining: 3 });
        expect(dot.className).toContain('warning');
        expect(text.textContent).toContain('3');

        // expired
        window.updateStatusIndicator(true, { status: 'expired' });
        expect(dot.className).toContain('warning');
        expect(text.textContent).toContain('Expired');
    });

    // ── Update modal ──────────────────────────────────────────────────────────

    test('showUpdateModal and hideUpdateModal toggle modal', () => {
        loadRenderer();
        const modal = document.getElementById('updateModal');
        const body  = document.getElementById('updateBody');

        window.showUpdateModal({ current: '1.0.0', latest: '1.1.0', releaseNotes: 'Bug fixes.' });

        expect(modal.classList.contains('active')).toBe(true);
        expect(body.textContent).toContain('1.0.0');
        expect(body.textContent).toContain('1.1.0');

        window.hideUpdateModal();
        expect(modal.classList.contains('active')).toBe(false);
    });

    // ── checkForUpdates ───────────────────────────────────────────────────────

    test('checkForUpdates shows modal on update-available', async () => {
        window.electronAPI.checkUpdates = jest.fn().mockResolvedValue({
            status: 'update-available',
            current: '1.0.0',
            latest: '1.2.0',
            releaseNotes: 'New features',
            downloadUrl: 'http://example.com/update',
        });

        loadRenderer();
        await window.checkForUpdates(true);

        const modal = document.getElementById('updateModal');
        expect(modal.classList.contains('active')).toBe(true);
    });

    test('checkForUpdates shows notification when up-to-date (manual)', async () => {
        window.electronAPI.checkUpdates = jest.fn().mockResolvedValue({ status: 'up-to-date' });

        loadRenderer();
        await window.checkForUpdates(true);

        const titleEl = document.getElementById('notificationTitle');
        expect(titleEl.textContent).toBe('Up to Date');
    });

    test('checkForUpdates sets offline status on no-internet', async () => {
        window.electronAPI.checkUpdates = jest.fn().mockResolvedValue({ status: 'no-internet' });

        loadRenderer();
        await window.checkForUpdates(true);

        const text = document.getElementById('statusText');
        expect(text.textContent).toBe('Offline');
    });
});
