const fs = require('fs');
const path = require('path');

/**
 * renderer.test.js
 * Jest tests for renderer.js (runs the file in jsdom by injecting a <script> with its source).
 */


describe('renderer.js UI logic', () => {
    const rendererPath = path.join(__dirname, '../renderer.js');
    let originalConsoleError;

    beforeAll(() => {
        originalConsoleError = console.error;
        console.error = () => { }; // silence expected error logs during tests
    });

    afterAll(() => {
        console.error = originalConsoleError;
    });

    beforeEach(() => {
        jest.resetModules();
        jest.useFakeTimers();

        // Clear DOM
        document.body.innerHTML = '';

        // Minimal DOM elements required by renderer.js
        document.body.insertAdjacentHTML('beforeend', `
            <div id="notification" class="">
                <div id="notificationTitle"></div>
                <div id="notificationBody"></div>
            </div>

            <div id="welcomeCard" style="display:block"></div>
            <div id="timingPanelContainer" style="display:none"></div>

            <div id="statusDot" class="status-dot"></div>
            <div id="statusText"></div>

            <div id="updateModal" class="">
                <div id="updateBody"></div>
            </div>

            <button id="checkUpdateBtn"></button>
            <button id="startNewRaceBtn"></button>
            <button id="downloadNowBtn"></button>
            <button id="downloadBackgroundBtn"></button>
            <button id="skipVersionBtn"></button>
            <button id="remindLaterBtn"></button>
            <button id="settingsBtn"></button>
        `);

        // Provide a mock DualTimingPanel constructor used by renderer.js
        window.DualTimingPanel = jest.fn().mockImplementation(() => {
            return { init: jest.fn() };
        });

        // Provide a default electronAPI mock - tests will override per-case as needed
        window.electronAPI = {
            checkInternet: jest.fn().mockResolvedValue(true),
            checkUpdates: jest.fn().mockResolvedValue({ status: 'up-to-date' }),
            skipVersion: jest.fn().mockResolvedValue(),
        };
    });

    afterEach(() => {
        jest.runOnlyPendingTimers();
        jest.useRealTimers();
    });

    // Helper to load and execute renderer.js in the page context
    function loadRendererScript() {
        const src = fs.readFileSync(rendererPath, 'utf8');
        const script = document.createElement('script');
        script.textContent = src;
        document.body.appendChild(script);
    }

    test('showNotification sets title/body, adds active class and removes it after duration', () => {
        loadRendererScript();
        expect(window.showNotification).toBeDefined();

        const notification = document.getElementById('notification');
        const titleEl = document.getElementById('notificationTitle');
        const bodyEl = document.getElementById('notificationBody');

        window.showNotification('My Title', 'My Body', 1000);

        expect(titleEl.textContent).toBe('My Title');
        expect(bodyEl.textContent).toBe('My Body');
        expect(notification.classList.contains('active')).toBe(true);

        // advance timers to remove active class
        jest.advanceTimersByTime(1000);
        expect(notification.classList.contains('active')).toBe(false);
    });

    test('updateStatusIndicator shows offline and various subscription states', () => {
        loadRendererScript();
        expect(window.updateStatusIndicator).toBeDefined();

        const statusDot = document.getElementById('statusDot');
        const statusText = document.getElementById('statusText');

        // offline
        window.updateStatusIndicator(false);
        expect(statusDot.className).toBe('status-dot offline');
        expect(statusText.textContent).toBe('Offline Mode');

        // online, no subscription
        window.updateStatusIndicator(true, null);
        expect(statusDot.className).toBe('status-dot');
        expect(statusText.textContent).toBe('Online');

        // active premium
        window.updateStatusIndicator(true, { status: 'active' });
        expect(statusDot.className).toBe('status-dot');
        expect(statusText.textContent).toBe('Online - Premium');

        // expiring
        window.updateStatusIndicator(true, { status: 'expiring', daysRemaining: 2 });
        expect(statusDot.className).toBe('status-dot warning');
        expect(statusText.textContent).toBe('Expires in 2 days');

        // expired
        window.updateStatusIndicator(true, { status: 'expired' });
        expect(statusDot.className).toBe('status-dot warning');
        expect(statusText.textContent).toBe('Subscription Expired');
    });

    test('showUpdateModal and hideUpdateModal toggle modal and populate content', () => {
        loadRendererScript();
        expect(window.showUpdateModal).toBeDefined();
        expect(window.hideUpdateModal).toBeDefined();

        const modal = document.getElementById('updateModal');
        const body = document.getElementById('updateBody');

        const info = { current: '1.0.0', latest: '1.1.0', releaseNotes: 'Lots of fixes and improvements.' };
        window.showUpdateModal(info);

        expect(modal.classList.contains('active')).toBe(true);
        expect(body.textContent).toContain('Current Version:');
        expect(body.textContent).toContain('New Version:');
        expect(body.textContent).toContain('Lots of fixes');

        window.hideUpdateModal();
        expect(modal.classList.contains('active')).toBe(false);
    });

    test('checkForUpdates handles update-available and shows modal (manual)', async () => {
        // prepare electronAPI to return update-available
        window.electronAPI.checkUpdates = jest.fn().mockResolvedValue({
            status: 'update-available',
            current: '1.0.0',
            latest: '1.2.0',
            releaseNotes: 'New features',
            downloadUrl: 'http://example.com/update',
        });

        loadRendererScript();

        // Call checkForUpdates manually (true => UI feedback path)
        await window.checkForUpdates(true);

        // update modal should appear
        const modal = document.getElementById('updateModal');
        expect(modal.classList.contains('active')).toBe(true);

        // currentUpdateInfo should be stored on the module scope; renderer exposes it not directly,
        // but downloadNowBtn click uses currentUpdateInfo via closure. Simulate click to ensure no errors.
        const downloadBtn = document.getElementById('downloadNowBtn');
        const openSpy = jest.spyOn(window, 'open').mockImplementation(() => { });
        downloadBtn.click();
        expect(openSpy).toHaveBeenCalledWith('http://example.com/update', '_blank');
        openSpy.mockRestore();
    });

    test('checkForUpdates shows notifications when up-to-date or no-internet', async () => {
        // up-to-date manual
        window.electronAPI.checkUpdates = jest.fn().mockResolvedValue({ status: 'up-to-date' });

        loadRendererScript();
        await window.checkForUpdates(true);

        const notification = document.getElementById('notification');
        const titleEl = document.getElementById('notificationTitle');
        expect(titleEl.textContent).toBe('Up to Date');
        expect(notification.classList.contains('active')).toBe(true);

        // no-internet case
        jest.runOnlyPendingTimers();
        notification.classList.remove('active');

        window.electronAPI.checkUpdates = jest.fn().mockResolvedValue({ status: 'no-internet' });
        await window.checkForUpdates(true);
        expect(document.getElementById('statusText').textContent).toBe('Offline Mode');
        expect(document.getElementById('notificationTitle').textContent).toBe('No Internet');
    });

    test('showTimingPanel hides welcome and shows timing container and initializes DualTimingPanel', () => {
        loadRendererScript();

        const welcome = document.getElementById('welcomeCard');
        const container = document.getElementById('timingPanelContainer');

        // Initially welcome shown
        expect(welcome.style.display).toBe('block');
        expect(container.style.display).toBe('none');

        // Trigger start new race
        const startBtn = document.getElementById('startNewRaceBtn');
        startBtn.click();

        expect(welcome.style.display).toBe('none');
        expect(container.style.display).toBe('block');
        expect(window.DualTimingPanel).toHaveBeenCalledWith('timingPanelContainer');

        // Notification should have been shown
        const notification = document.getElementById('notification');
        expect(notification.classList.contains('active')).toBe(true);
    });
});