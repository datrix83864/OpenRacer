const path = require('path');

/**
 * ui/components/timing-panel.test.js
 *
 * Tests for TimingPanel UI component.
 *
 * Run with Jest (jsdom test environment).
 */


describe('TimingPanel component', () => {
    let fakeRaceTiming;
    let container;
    let TimingPanel;
    let panel;

    const flush = () => new Promise(resolve => setTimeout(resolve, 0));

    function createFakeRaceTiming() {
        const listeners = { started: [], completed: [], dnf: [] };
        return {
            // event registration
            onRunStarted(cb) { listeners.started.push(cb); },
            onRunCompleted(cb) { listeners.completed.push(cb); },
            onRunDNF(cb) { listeners.dnf.push(cb); },

            // triggers used by tests
            triggerRunStarted(run) { listeners.started.forEach(cb => cb(run)); },
            triggerRunCompleted(run) { listeners.completed.forEach(cb => cb(run)); },
            triggerRunDNF(run) { listeners.dnf.forEach(cb => cb(run)); },

            // backend methods (can be spied on)
            getActiveRuns: jest.fn().mockResolvedValue([]),
            getStatistics: jest.fn().mockResolvedValue({ totalRuns: 0, fastestTime: null }),
            startRun: jest.fn().mockImplementation(() => Promise.resolve({})),
            finishRun: jest.fn().mockImplementation(() => Promise.resolve({})),
            markDNF: jest.fn().mockImplementation(() => Promise.resolve({})),
            disqualify: jest.fn().mockImplementation(() => Promise.resolve({})),
        };
    }

    beforeEach(async () => {
        // reset modules so requiring the component executes fresh
        jest.resetModules();

        // prepare DOM container
        document.body.innerHTML = '';
        container = document.createElement('div');
        container.id = 'test-container';
        document.body.appendChild(container);

        // create and attach fake raceTiming + notification spy
        fakeRaceTiming = createFakeRaceTiming();
        window.raceTiming = fakeRaceTiming;
        window.showNotification = jest.fn();

        // require the component file (it registers window.TimingPanel)
        require('../../../ui/components/timing-panel.js');
        TimingPanel = window.TimingPanel;

        // instantiate component (constructor calls init() asynchronously)
        panel = new TimingPanel('test-container');

        // wait for init() async work (render + loadActiveRuns)
        await flush();
        // ensure styles appended do not affect tests (but left in DOM)
    });

    afterEach(() => {
        // cleanup
        try { delete window.TimingPanel; } catch (e) { }
        try { delete window.raceTiming; } catch (e) { }
        try { delete window.showNotification; } catch (e) { }
        document.body.innerHTML = '';
    });

    test('renders UI elements into provided container', () => {
        expect(document.getElementById('racerIdInput')).toBeTruthy();
        expect(document.getElementById('bibNumberInput')).toBeTruthy();
        expect(document.getElementById('startRunBtn')).toBeTruthy();
        expect(document.getElementById('finishRunBtn')).toBeTruthy();
        expect(document.getElementById('activeRunsList')).toBeTruthy();
        // initial empty state shown
        expect(document.querySelector('#activeRunsList .empty-state')).not.toBeNull();
        expect(document.getElementById('statusText').textContent).toMatch(/Ready/i);
    });

    test('startRun click validates inputs and toggles buttons', async () => {
        const racerInput = document.getElementById('racerIdInput');
        const bibInput = document.getElementById('bibNumberInput');
        const startBtn = document.getElementById('startRunBtn');
        const finishBtn = document.getElementById('finishRunBtn');
        const dnfBtn = document.getElementById('dnfBtn');
        const dsqBtn = document.getElementById('dsqBtn');

        // initially finish/dnf/dsq disabled
        expect(finishBtn.disabled).toBe(true);
        expect(dnfBtn.disabled).toBe(true);
        expect(dsqBtn.disabled).toBe(true);

        // missing inputs should show notification and not disable start
        racerInput.value = '';
        bibInput.value = '';
        startBtn.click();
        await flush();
        expect(window.showNotification).toHaveBeenCalled();

        // provide valid inputs and click start
        racerInput.value = 'racer-1';
        bibInput.value = '42';
        startBtn.click();

        // allow handleStartRun async to run
        await flush();

        // current racer set, start disabled, others enabled
        expect(panel.currentRacerId).toBe('racer-1');
        expect(panel.currentBibNumber).toBe(42);
        expect(startBtn.disabled).toBe(true);
        expect(finishBtn.disabled).toBe(false);
        expect(dnfBtn.disabled).toBe(false);
        expect(dsqBtn.disabled).toBe(false);

        // ensure raceTiming.startRun was called with provided values
        expect(window.raceTiming.startRun).toHaveBeenCalledWith('racer-1', 42);
    });

    test('onRunStarted event adds run to active list and shows notification', async () => {
        const run = { racerId: 'racer-2', bibNumber: 7, startTime: Date.now() - 1500 };
        // trigger event as backend would
        fakeRaceTiming.triggerRunStarted(run);
        await flush();

        const listHtml = document.getElementById('activeRunsList').innerHTML;
        expect(listHtml).toMatch(/#7/);
        expect(listHtml).toMatch(/racer-2/i);
        // notification called
        expect(window.showNotification).toHaveBeenCalledWith('Run Started', expect.stringContaining('Bib 7 started'));
        // active count updated
        expect(document.getElementById('activeCount').textContent).toBe('1');
    });

    test('onRunCompleted event removes run, updates stats and clears selection', async () => {
        // add an active run and set as current selection
        const run = { racerId: 'racer-3', bibNumber: 9, startTime: Date.now() - 2000, adjustedTime: 12.345 };
        fakeRaceTiming.triggerRunStarted(run);
        await flush();

        // set current selection to simulate startRun flow
        panel.currentRacerId = 'racer-3';
        panel.currentBibNumber = 9;
        document.getElementById('startRunBtn').disabled = true;
        document.getElementById('finishRunBtn').disabled = false;

        // trigger completion
        fakeRaceTiming.triggerRunCompleted(run);
        await flush();

        // run removed from active list
        const listHtml = document.getElementById('activeRunsList').innerHTML;
        expect(listHtml).not.toMatch(/#9/);

        // notification showing completion
        expect(window.showNotification).toHaveBeenCalledWith('Run Completed', expect.stringContaining('Bib 9: 12.345s'));

        // selection cleared and start re-enabled
        expect(panel.currentRacerId).toBeNull();
        expect(document.getElementById('startRunBtn').disabled).toBe(false);
        expect(document.getElementById('finishRunBtn').disabled).toBe(true);
    });

    test('updateStats reads from raceTiming.getStatistics and updates UI', async () => {
        // change fake getStatistics to return sample data
        window.raceTiming.getStatistics.mockResolvedValue({ totalRuns: 123, fastestTime: 9.876 });
        await panel.updateStats();
        await flush();

        expect(document.getElementById('totalRuns').textContent).toBe('123');
        expect(document.getElementById('fastestTime').textContent).toBe('9.876s');
    });

    test('DNF and DSQ handlers call backend and clear selection', async () => {
        // prepare a current selection
        panel.currentRacerId = 'racer-4';
        panel.currentBibNumber = 11;
        document.getElementById('startRunBtn').disabled = true;
        document.getElementById('finishRunBtn').disabled = false;
        document.getElementById('dnfBtn').disabled = false;
        document.getElementById('dsqBtn').disabled = false;

        // stub prompt to provide a reason
        const originalPrompt = window.prompt;
        window.prompt = jest.fn().mockReturnValue('Some reason');

        // call DNF
        await panel.handleDNF();
        expect(window.raceTiming.markDNF).toHaveBeenCalledWith('racer-4', 'Some reason');
        expect(panel.currentRacerId).toBeNull();

        // set again and test DSQ
        panel.currentRacerId = 'racer-5';
        document.getElementById('startRunBtn').disabled = true;
        document.getElementById('dsqBtn').disabled = false;

        await panel.handleDSQ();
        expect(window.raceTiming.disqualify).toHaveBeenCalledWith('racer-5', 'Some reason');

        // restore prompt
        window.prompt = originalPrompt;
    });
});