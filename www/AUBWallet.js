var exec = require('cordova/exec');

var AUBWallet = {
    setAuthToken: function (token, success, error) {
        exec(success, error, 'AUBWalletPlugin', 'setAuthToken', [token]);
    },
    startProvisioning: function (cardId, cardName, success, error) {
        exec(success, error, 'AUBWalletPlugin', 'startProvisioning', [cardId, cardName]);
    }
};

module.exports = AUBWallet;
