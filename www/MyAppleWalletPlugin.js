var exec = require('cordova/exec');

var MyAppleWalletPlugin = {
    addCardToWallet: function(cardDetails, successCallback, errorCallback) {
        exec(successCallback, errorCallback, "MyAppleWalletPlugin", "addCardToWallet", [cardDetails]);
    },
    handleExternalAuthentication: function(authData, successCallback, errorCallback) {
        exec(successCallback, errorCallback, "MyAppleWalletPlugin", "handleExternalAuthentication", [authData]);
    }
};

module.exports = MyAppleWalletPlugin;
