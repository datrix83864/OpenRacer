const fs = require('fs').promises;
const os = require('os');
const path = require('path');
const RaceTiming = require('../../modules/race-timing');

describe('RaceTiming module', () => {
    let tmpDir;
    let rt;

    beforeAll(async () => {
        tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'race-timing-'));
    });

    afterAll(async () => {
        // best-effort cleanup
        try {
            const files = await fs.readdir(tmpDir);
            await Promise.all(files.map(f => fs.unlink(path.join(tmpDir, f))).catch(() => { }));
            await fs.rmdir(tmpDir).catch(() => { });
        } catch (e) { }
    });

    beforeEach(async () => {
        rt = new RaceTiming({ dataDir: tmpDir, autoSave: true, precision: 3 });
        await rt.initialize();
    });

    afterEach(async () => {
        // reset filesystem state between tests
        try {
            const files = await fs.readdir(tmpDir);
            await Promise.all(files.map(f => fs.unlink(path.join(tmpDir, f))).catch(() => { }));
        } catch (e) { }
    });

    test('startRaceSession opens gate, sets raceId and emits event', async () => {
        const evPromise = new Promise(resolve => rt.once('race-session-started', resolve));
        const result = await rt.startRaceSession('race-1', 'Test Race', { laps: 3 });
        const ev = await evPromise;
        expect(result.raceId).toBe('race-1');
        expect(result.status).toBe('active');
        expect(rt.startGateOpen).toBe(true);
        expect(ev.raceId).toBe('race-1');
        // state file written
        const statePath = path.join(tmpDir, 'timing-state.json');
        await expect(fs.access(statePath)).resolves.toBeUndefined();
    });

    test('startRun registers active run and emits run-started', async () => {
        await rt.startRaceSession('r2', 'R2', {});
        const evPromise = new Promise(resolve => rt.once('run-started', resolve));
        const run = await rt.startRun('racer-1', 101, { category: 'A' });
        const ev = await evPromise;
        expect(run.racerId).toBe('racer-1');
        expect(run.bibNumber).toBe(101);
        expect(run.status).toBe('running');
        expect(rt.getActiveRuns().some(r => r.racerId === 'racer-1')).toBe(true);
        expect(ev.runId || ev.runId === undefined ? typeof ev.runId : true).toBeUndefined() || expect(ev.runId).toBeUndefined(); // no-op to keep linter happy
    });

    test('finishRun completes a run, computes times and updates stats', async () => {
        await rt.startRaceSession('r3', 'R3', {});
        const run = await rt.startRun('racer-2', 202);
        // provide a finishTime 5s after start
        const finishTime = run.startTime + 5000;
        const evPromise = new Promise(resolve => rt.once('run-completed', resolve));
        const completed = await rt.finishRun('racer-2', finishTime);
        await evPromise;
        expect(completed.status).toBe('completed');
        expect(completed.totalTime).toBeCloseTo(5, 1); // ~5 seconds
        expect(completed.adjustedTime).toBeCloseTo(5, 1);
        const stats = rt.getStatistics();
        expect(stats.totalRuns).toBeGreaterThanOrEqual(1);
        expect(rt.getCompletedRuns().some(r => r.racerId === 'racer-2')).toBe(true);
    });

    test('addPenalty increases adjustedTime and emits penalty-added', async () => {
        await rt.startRaceSession('r4', 'R4', {});
        const run = await rt.startRun('racer-3', 303);
        await rt.finishRun('racer-3', run.startTime + 3000);
        const before = rt.getCompletedRuns().find(r => r.racerId === 'racer-3').adjustedTime;
        const evPromise = new Promise(resolve => rt.once('penalty-added', resolve));
        const updated = await rt.addPenalty('racer-3', 2.5, 'missed gate');
        await evPromise;
        expect(updated.penalties.length).toBe(1);
        expect(updated.adjustedTime).toBeCloseTo(before + 2.5, 3);
    });

    test('markDNF moves run to completed with dnf status and increments dnfCount', async () => {
        await rt.startRaceSession('r5', 'R5', {});
        await rt.startRun('racer-4', 404);
        const evPromise = new Promise(resolve => rt.once('run-dnf', resolve));
        const dnfRun = await rt.markDNF('racer-4', 'mechanical', 'gate-2');
        await evPromise;
        expect(dnfRun.status).toBe('dnf');
        expect(dnfRun.dnfReason).toBe('mechanical');
        expect(rt.getStatistics().dnfCount).toBeGreaterThanOrEqual(1);
        expect(rt.getCompletedRuns().some(r => r.racerId === 'racer-4')).toBe(true);
    });

    test('disqualifyRun works for active runs and emits run-disqualified', async () => {
        await rt.startRaceSession('r6', 'R6', {});
        await rt.startRun('racer-5', 505);
        const evPromise = new Promise(resolve => rt.once('run-disqualified', resolve));
        const dsq = await rt.disqualifyRun('racer-5', 'unsafe driving');
        const ev = await evPromise;
        expect(dsq.status).toBe('disqualified');
        expect(dsq.dsqReason).toBe('unsafe driving');
        expect(ev.previousStatus).toBe('running');
    });

    test('getLeaderboard ranks by adjustedTime', async () => {
        await rt.startRaceSession('r7', 'R7', {});
        const r1 = await rt.startRun('alpha', 1);
        await rt.finishRun('alpha', r1.startTime + 8000); // 8s
        const r2 = await rt.startRun('bravo', 2);
        await rt.finishRun('bravo', r2.startTime + 4000); // 4s
        const board = rt.getLeaderboard();
        expect(board[0].racerId).toBe('bravo');
        expect(board[1].racerId).toBe('alpha');
        expect(board[0].behindLeader).toBe(0);
        expect(board[1].behindLeader).toBeCloseTo(board[1].adjustedTime - board[0].adjustedTime, 3);
    });

    test('state is persisted and can be loaded by a new instance', async () => {
        await rt.startRaceSession('r8', 'R8', {});
        const run = await rt.startRun('persist-1', 999);
        await rt.finishRun('persist-1', run.startTime + 2000);
        // create a new instance pointing to same dataDir and initialize to load state
        const rt2 = new RaceTiming({ dataDir: tmpDir, autoSave: true });
        await rt2.initialize();
        expect(rt2.currentRaceId).toBe('r8');
        expect(rt2.getCompletedRuns().length).toBeGreaterThanOrEqual(1);
        // cleanup
        await rt2.reset();
    });

    test('reset clears state and writes file', async () => {
        await rt.startRaceSession('r9', 'R9', {});
        await rt.startRun('toreset', 777);
        const evPromise = new Promise(resolve => rt.once('reset', resolve));
        const res = await rt.reset();
        await evPromise;
        expect(res.success).toBe(true);
        expect(rt.currentRaceId).toBeNull();
        expect(rt.getActiveRuns().length).toBe(0);
        expect(rt.getCompletedRuns().length).toBe(0);
    });
});