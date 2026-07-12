/**
 * ui/components/leaderboard.test.js
 *
 * Tests for LeaderboardPanel UI component.
 *
 * Run with Jest (jsdom test environment).
 */

describe('LeaderboardPanel component', () => {
    let fakeRaceTiming;
    let container;
    let LeaderboardPanel;
    let panel;

    const flush = () => new Promise(resolve => setTimeout(resolve, 0));

    function createFakeRaceTiming(runs) {
        return {
            getAllRuns: jest.fn().mockResolvedValue(runs),
            export: jest.fn().mockResolvedValue({ success: true, filePath: 'out.csv' }),
            importPackage: jest.fn().mockResolvedValue({ runCount: 0, racerCount: 0 }),
            onRunCompleted: jest.fn(),
            onRunDNF: jest.fn(),
            onRunDisqualified: jest.fn(),
        };
    }

    beforeEach(async () => {
        jest.resetModules();

        document.body.innerHTML = '';
        container = document.createElement('div');
        container.id = 'test-leaderboard';
        document.body.appendChild(container);

        fakeRaceTiming = createFakeRaceTiming([
            { racerId: 'r1', bibNumber: 1, status: 'completed', adjustedTime: 45.123, metadata: { course: 'left' } },
            { racerId: 'r2', bibNumber: 2, status: 'completed', adjustedTime: 46.5, metadata: { course: 'right' } },
        ]);
        window.raceTiming = fakeRaceTiming;
        window.showNotification = jest.fn();

        require('../../../ui/components/leaderboard.js');
        LeaderboardPanel = window.LeaderboardPanel;

        panel = new LeaderboardPanel('test-leaderboard');
        await flush();
    });

    test('renders the toolbar and loads runs on construction', () => {
        expect(container.querySelector('#lb-course-filter')).not.toBeNull();
        expect(container.querySelector('#lb-formula-select')).not.toBeNull();
        expect(fakeRaceTiming.getAllRuns).toHaveBeenCalled();
        expect(panel.runs.length).toBe(2);
    });

    test('refresh button reloads data from raceTiming', async () => {
        fakeRaceTiming.getAllRuns.mockClear();
        container.querySelector('#lb-refresh').dispatchEvent(new Event('click', { bubbles: true }));
        await flush();
        expect(fakeRaceTiming.getAllRuns).toHaveBeenCalledTimes(1);
    });

    test('registers listeners for run completion/DNF/DSQ events', () => {
        expect(fakeRaceTiming.onRunCompleted).toHaveBeenCalled();
        expect(fakeRaceTiming.onRunDNF).toHaveBeenCalled();
        expect(fakeRaceTiming.onRunDisqualified).toHaveBeenCalled();
    });
});
