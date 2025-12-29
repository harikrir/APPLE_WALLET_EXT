var exec = require('cordova/exec');

var AUBWallet = {
    /**
     * Set the Authentication Token
     * This token is stored in the iOS App Group for the extensions to use.
     */
    setAuthToken: function (token, success, error) {
        if (typeof token !== "string" || token.trim() === "") {
            error("Invalid token: Token must be a non-empty string.");
            return;
        }
        exec(success, error, 'AUBWalletPlugin', 'setAuthToken', [token]);
    },

    /**
     * Start the Apple Wallet Provisioning Flow
     * @param {string} cardId - The card identifier (e.g., suffix or internal ID)
     * @param {string} cardName - The name displayed in the Wallet UI
     */
    startProvisioning: function (cardId, cardName, success, error) {
        // Platform check to prevent errors on Android
        if (window.cordova.platformId !== 'ios') {
            console.warn("AUBWallet: Provisioning is only supported on iOS.");
            error("Platform not supported");
            return;
        }

        if (!cardId || !cardName) {
            error("Missing parameters: cardId and cardName are required.");
            return;
        }

        exec(success, error, 'AUBWalletPlugin', 'startProvisioning', [cardId, cardName]);
    }
};

module.exports = AUBWallet;
