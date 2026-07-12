// main.test.js
const path = require('path');
const os = require('os');

describe('main.js (Electron main) basic initialization', () => {
    let fakeIpcHandlers;
    let MockRacerDatabaseInstance;

    beforeAll(async () => {
        jest.resetModules();

        fakeIpcHandlers = new Map();

        const ipcMain = {
            handle: (channel, handler) => {
                fakeIpcHandlers.set(channel, handler);
            },
            on: () => { }
        };

        const BrowserWindow = class {
            constructor(opts) {
                this.opts = opts;
                this.webContents = { send: () => { }, openDevTools: () => { } };
                BrowserWindow._instances.push(this);
            }
            static getAllWindows() {
                return BrowserWindow._instances.slice();
            }
            loadFile() { return Promise.resolve(); }
            once(event, fn) { if (event === 'ready-to-show') fn(); }
            on() { }
            show() { }
        };
        BrowserWindow._instances = [];

        const dialog = {
            showMessageBox: async () => ({ response: 0 }),
            showOpenDialog: async () => ({ canceled: true, filePaths: [] }),
            showSaveDialog: async () => ({ canceled: true })
        };

        const fakeAppUserData = path.join(os.tmpdir(), 'openracer-test-userdata');
        const app = {
            getPath: (name) => (name === 'userData' ? fakeAppUserData : ''),
            whenReady: () => Promise.resolve(),
            on: () => { },
            quit: () => { },
            isReady: () => true
        };

        // Minimal RaceTiming mock
        function MockRaceTiming(opts) {
            this.opts = opts;
            global.__RACE_TIMING_INSTANCE = this;
        }
        MockRaceTiming.prototype.initialize = async function () { this._initialized = true; };
        MockRaceTiming.prototype.on = function () { };
        MockRaceTiming.prototype.getActiveRuns = () => [];
        MockRaceTiming.prototype.getLeaderboard = () => [];

        // Minimal RacerDatabase mock
        function MockRacerDatabase(opts) {
            this.opts = opts;
            this._events = {};
            this.initializeCalled = false;
            MockRacerDatabaseInstance = this;
            global.__RACER_DB_INSTANCE = this;
        }
        MockRacerDatabase.prototype.initialize = async function () {
            this.initializeCalled = true;
        };
        MockRacerDatabase.prototype.on = function (ev, fn) {
            this._events[ev] = fn;
        };
        MockRacerDatabase.prototype.updateBestTime = async function () { };
        MockRacerDatabase.prototype.findRacer = async function () { return { racer: null }; };
        MockRacerDatabase.prototype.getAutocompleteSuggestions = () => [];
        MockRacerDatabase.prototype.saveRacer = async (r) => r;
        MockRacerDatabase.prototype.getNextBibNumber = () => 1;
        MockRacerDatabase.prototype.getTodaysRacers = () => [];
        MockRacerDatabase.prototype.needsWaiver = () => false;
        MockRacerDatabase.prototype.signWaiver = async () => true;
        MockRacerDatabase.prototype.getStatistics = () => ({});
        MockRacerDatabase.prototype.exportToJSON = async () => { };
        MockRacerDatabase.prototype.importFromJSON = async () => ({ count: 0 });
        MockRacerDatabase.prototype.clearTodaysRacers = async () => ({});
        MockRacerDatabase.prototype.syncWithCloud = async () => ({ synced: false });

        // Minimal HardwareManager mock (avoids touching real serial ports)
        function MockHardwareManager() {
            this.scoreboardConnected = false;
        }
        MockHardwareManager.prototype.on = function () { };
        MockHardwareManager.prototype.listPorts = async () => [];

        jest.doMock('electron', () => ({ app, BrowserWindow, ipcMain, dialog }));
        jest.doMock('../modules/racer-database', () => MockRacerDatabase);
        jest.doMock('../modules/race-timing', () => MockRaceTiming);
        jest.doMock('../modules/hardware', () => MockHardwareManager);

        require('../main.js');

        // allow async initialization from app.whenReady() to run
        await new Promise((r) => setTimeout(r, 20));
    });

    afterAll(() => {
        jest.dontMock('electron');
        jest.dontMock('../modules/racer-database');
        jest.dontMock('../modules/race-timing');
        jest.dontMock('../modules/hardware');
    });

    it('constructs a RacerDatabase instance', () => {
        expect(global.__RACER_DB_INSTANCE).toBeDefined();
        expect(MockRacerDatabaseInstance).toBe(global.__RACER_DB_INSTANCE);
    });

    it('calls initialize on the RacerDatabase instance', () => {
        expect(global.__RACER_DB_INSTANCE.initializeCalled).toBe(true);
    });

    it('registers the expected IPC handlers', () => {
        const expectedHandlers = [
            'racers:search',
            'racers:save',
            'racers:next-bib',
            'racers:export',
            'racers:import',
            'timing:start-run',
            'timing:finish-run',
            'timing:get-active'
        ];
        for (const chan of expectedHandlers) {
            expect(fakeIpcHandlers.has(chan)).toBe(true);
        }
    });
});
