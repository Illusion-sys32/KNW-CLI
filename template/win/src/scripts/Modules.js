/**
 * @typedef {Object} SysModule
 * @property {function(): number} getBatteryLevel - Retrieves the current battery level as a percentage.
 * @property {function(): void} openCamera - Opens the device camera.
 * @property {function(): boolean} getDarkTheme - Gets the user theme. If dark return true. If Error return True. If light return False.
 */

/**
 * @typedef {Object} SensorsModule
 * @property {function(number): void} vibrate - Triggers a device vibration for the specified duration in milliseconds.
 */

/**
 * @typedef {Object} WorldIntegrationModule
 * @property {function(): Promise<string>} getLocation - Gets the current location as a string.
 */

/**
 * @module NativeBridge
 *
 * @description Aggregates native modules injected by Android (via addJavascriptInterface)
 * into a single object, allowing you to call native functions using a simple syntax, e.g.:
 *
 *   NativeBridge.sys.getBatteryLevel();
 *   NativeBridge.sensors.vibrate(1000);
 *
 * If the native interfaces are not available, stub functions will issue warnings.
 */
export const NativeBridge = {
  /**
   * Used to access system-related functionality.
   * @type {SysModule}
   */
  sys: window.sys || {
    /**
     * Retrieves the current battery level.
     * @returns {number} The battery level as a percentage, or -1 if not available.
     */
    getBatteryLevel: () => {
      console.warn("Native sys module is not available. Can't get battery level.")
      return -1
    },

    /**
     * Opens the device camera.
     */
    openCamera: () => {
      console.warn("Native sys module is not available. Can't open camera.")
    },
    getDarkTheme: () => {
      console.warn("Native sys module is not available. Can't get the user theme")
      return true;
    }
  },

  /**
   * Used to access device sensors and functionality.
   * @type {SensorsModule}
   */
  sensors: window.sensors || {
    /**
     * Triggers a device vibration.
     * @param {number} duration - Duration of the vibration in milliseconds.
     */
    vibrate: (duration) => {
      console.warn("Native sensors module is not available. Can't vibrate.")
      return null;
    },
  },

  /**
   * Used to integrate with the world.
   * @type {WorldIntegrationModule}
   */
  WorldIntegration: window.WorldIntegration || {
    /**
     * Gets the current location.
     * @returns {Promise<string>} A promise that resolves to a string containing location details
     * (Country, Timezone, City, Street) or rejects with an error message.
     */
    getLocation: async () => {
      console.warn("Native WorldIntegration module is not available. Can't get location.")
      throw new Error("Native WorldIntegration module is not available. Cannot get location.")
    },
  },
}

