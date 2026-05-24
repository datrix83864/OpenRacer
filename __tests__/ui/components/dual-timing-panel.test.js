const path = require('path');

/**
 * Tests for ui/components/dual-timing-panel.js constructor
 *
 * These tests assume a jest + jsdom environment.
 */


describe('DualTimingPanel - constructor', () => {
    const componentPath = path.resolve(__dirname, '../../../ui/components/dual-timing-panel.js');

    beforeEach(() => {
        // Clear DOM
        document.documentElement.innerHTML = '<head></head><body></body>';

        // Ensure any previous module state is cleared
        jest.resetModules();
        delete window.DualTimingPanel;
    });

    test('throws when container not found', () => {
        // Do not create container element
        expect(() => {
            // require the module so class is registered on window
            require(componentPath);
            // attempt to construct with missing id should throw synchronously
            // eslint-disable-next-line no-new
            new window.DualTimingPanel('nonexistent-id');
        }).toThrow(/Container 'nonexistent-id' not found/);
    });

    test('initializes with defaults and renders panels when container exists', async () => {
        // Create container element expected by constructor
        const containerId = 'test-container';
        const container = document.createElement('div');
        container.id = containerId;
        document.body.appendChild(container);

        // Provide mocks so async init resolves without errors
        window.electronAPI = {
            loadConfig: jest.fn().mockResolvedValue({}),
            saveConfig: jest.fn().mockResolvedValue()
        };
        window.raceTiming = {
            startRace:       jest.fn().mockResolvedValue({}),
            getActiveRuns:   jest.fn().mockResolvedValue([]),
            getCompletedRuns: jest.fn().mockResolvedValue([]),
            onRunStarted:    jest.fn().mockReturnValue(() => {}),
            onRunCompleted:  jest.fn().mockReturnValue(() => {}),
            onRunDNF:        jest.fn().mockReturnValue(() => {}),
            onRunDisqualified: jest.fn().mockReturnValue(() => {})
        };
        window.racerDB = {
            autocomplete: jest.fn().mockResolvedValue([])
        };

        // Require the component (registers class on window)
        require(componentPath);

        // Construct panel (calls init asynchronously)
        const panel = new window.DualTimingPanel(containerId);

        // Wait a tick for async init to complete
        await new Promise(resolve => setTimeout(resolve, 0));

        // Basic state checks
        expect(panel.container).toBe(container);
        expect(panel.courses).toBeDefined();
        expect(panel.courses.left.name).toBe('Course A');
        expect(panel.courses.right.name).toBe('Course B');
        expect(panel.activeRunsPerCourse).toEqual({ left: [], right: [] });

        // DOM checks - course panels and titles rendered
        const leftPanel = container.querySelector('.course-panel[data-course="left"]');
        const rightPanel = container.querySelector('.course-panel[data-course="right"]');
        expect(leftPanel).toBeTruthy();
        expect(rightPanel).toBeTruthy();

        const leftTitle = leftPanel.querySelector('.course-title').textContent;
        const rightTitle = rightPanel.querySelector('.course-title').textContent;
        expect(leftTitle).toContain('Course A');
        expect(rightTitle).toContain('Course B');

        // Layout buttons present
        const activeLayoutBtn = container.querySelector('.layout-btn.active');
        expect(activeLayoutBtn).toBeTruthy();
        expect(activeLayoutBtn.dataset.layout).toBe('dual');
    });

    test('applies provided course names, colors and layoutMode from config', async () => {
        // Setup DOM container
        const containerId = 'cfg-container';
        const container = document.createElement('div');
        container.id = containerId;
        document.body.appendChild(container);

        // Provide config overriding defaults
        const config = {
            courses: {
                left: { name: 'Left X', color: '#ff0000', enabled: true },
                right: { name: 'Right Y', color: '#00ff00', enabled: false }
            },
            layoutMode: 'left-only'
        };

        window.electronAPI = {
            loadConfig: jest.fn().mockResolvedValue(config),
            saveConfig: jest.fn().mockResolvedValue()
        };
        window.raceTiming = {
            startRace:        jest.fn().mockResolvedValue({}),
            getActiveRuns:    jest.fn().mockResolvedValue([]),
            getCompletedRuns: jest.fn().mockResolvedValue([]),
            onRunStarted:     jest.fn().mockReturnValue(() => {}),
            onRunCompleted:   jest.fn().mockReturnValue(() => {}),
            onRunDNF:         jest.fn().mockReturnValue(() => {}),
            onRunDisqualified: jest.fn().mockReturnValue(() => {})
        };
        window.racerDB = {
            autocomplete: jest.fn().mockResolvedValue([])
        };

        // Require and construct
        require(componentPath);
        const panel = new window.DualTimingPanel(containerId);

        // Wait for async init to finish
        await new Promise(resolve => setTimeout(resolve, 0));

        // Verify instance read config
        expect(panel.layoutMode).toBe('left-only');
        expect(panel.courses.left.name).toBe('Left X');
        expect(panel.courses.left.color).toBe('#ff0000');
        expect(panel.courses.right.name).toBe('Right Y');
        expect(panel.courses.right.color).toBe('#00ff00');

        // Verify UI updated for left-only layout (right panel hidden)
        const leftPanel = container.querySelector('.course-panel[data-course="left"]');
        const rightPanel = container.querySelector('.course-panel[data-course="right"]');

        // updateLayout sets inline style display; ensure right is hidden
        expect(getComputedStyle(leftPanel).display === 'flex' || leftPanel.style.display === 'flex' || leftPanel.style.display === '').toBeTruthy();
        expect(rightPanel.style.display).toBe('none');

        // Active layout button should reflect 'left-only'
        const activeBtn = container.querySelector('.layout-btn.active');
        expect(activeBtn).toBeTruthy();
        expect(activeBtn.dataset.layout).toBe('left-only');
    });
});