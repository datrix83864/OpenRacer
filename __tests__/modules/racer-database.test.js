const assert = require('assert');
const RacerDatabase = require('../../modules/racer-database');

describe('RacerDatabase#searchCloud', function () {
    let db;
    let originalConsoleLog;
    let captured = [];

    beforeEach(function () {
        db = new RacerDatabase({ dataDir: './test-data', mountainId: 'test-mountain', autoSave: false });
        // capture console.log output
        originalConsoleLog = console.log;
        captured = [];
        console.log = (...args) => captured.push(args.join(' '));
    });

    afterEach(function () {
        // restore console.log
        console.log = originalConsoleLog;
    });

    it('is an async function that returns null for string input and logs the query', async function () {
        const result = await db.searchCloud('ABC123');
        assert.strictEqual(result, null);
        assert.ok(captured.some(s => s.includes('Cloud search for:') && s.includes('ABC123')), 'expected log to mention the query');
    });

    it('returns null and logs numeric input converted to string', async function () {
        const result = await db.searchCloud(42);
        assert.strictEqual(result, null);
        assert.ok(captured.some(s => s.includes('Cloud search for:') && s.includes('42')));
    });
});