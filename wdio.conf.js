export const config = {
    //
    // ====================
    // Runner Configuration
    // ====================
    //
    runner: 'local',

    //
    // ==================
    // Specify Test Files
    // ==================
    //
    specs: [
        './test/specs/**/*.js'
    ],

    //
    // ============
    // Capabilities
    // ============
    //
    maxInstances: 1,
    capabilities: [{
        // capabilities for local Appium on the mobile emulator
        platformName: 'mac',
        'appium:automationName': 'Mac2',
        'appium:bundleId': 'com.inspo.app',
    }],

    //
    // ===================
    // Test Configurations
    // ===================
    //
    logLevel: 'info',
    bail: 0,
    baseUrl: 'http://localhost',
    waitforTimeout: 10000,
    connectionRetryTimeout: 120000,
    connectionRetryCount: 3,
    framework: 'mocha',
    reporters: ['spec'],
    mochaOpts: {
        ui: 'bdd',
        timeout: 60000
    },

    //
    // ===================
    // Hooks
    // ===================
    //
    onPrepare: function (config, capabilities) {
        console.log('Starting Tauri Application testing...');
    },
}
