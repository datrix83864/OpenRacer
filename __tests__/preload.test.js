// preload.test.js
describe('preload.js', () => {
    let exposed;
    let mockInvoke;

    beforeEach(() => {
        jest.resetModules();
        exposed = {};
        mockInvoke = jest.fn().mockResolvedValue('ok');

        const contextBridge = {
            exposeInMainWorld: (key, api) => { exposed[key] = api; }
        };
        const ipcRenderer = {
            invoke: mockInvoke,
            on: jest.fn(),
            removeListener: jest.fn()
        };

        jest.doMock('electron', () => ({ contextBridge, ipcRenderer }));
        // Require after mocking electron so preload.js uses the mocked objects
        require('../preload.js');
    });

    test('exposes electronAPI.saveConfig and forwards args to ipcRenderer.invoke', async () => {
        expect(exposed.electronAPI).toBeDefined();
        expect(typeof exposed.electronAPI.saveConfig).toBe('function');

        const config = { theme: 'dark', volume: 7 };
        const res = await exposed.electronAPI.saveConfig(config);

        expect(mockInvoke).toHaveBeenCalledWith('save-config', config);
        expect(res).toBe('ok');
    });
});