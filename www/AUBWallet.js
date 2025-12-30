var exec = require('cordova/exec');

var AUBWallet = {
    // Maps to @objc(setAuthToken:)
    setAuthToken: function (token, success, error) {
        exec(success, error, 'AUBWalletPlugin', 'setAuthToken', [token]);
    },

    // Maps to @objc(startProvisioning:)
    startProvisioning: function (cardId, cardName, success, error) {
        exec(success, error, 'AUBWalletPlugin', 'startProvisioning', [cardId, cardName]);
    }
};

module.exports = AUBWallet;
