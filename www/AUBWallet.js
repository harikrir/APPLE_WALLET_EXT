var exec = require('cordova/exec');

exports.setAuthToken = function (token, success, error) {
    exec(success, error, 'AUBWalletPlugin', 'setAuthToken', [token]);
};

exports.startProvisioning = function (cardId, cardName, success, error) {
    exec(success, error, 'AUBWalletPlugin', 'startProvisioning', [cardId, cardName]);
};
