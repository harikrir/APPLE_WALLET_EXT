var exec = require('cordova/exec');

var WalletExtensionPlugin = {
    updatePassInWallet: function(passIdentifier, updatedData, successCallback, errorCallback) {
        exec(successCallback, errorCallback, 'WalletExtensionPlugin', 'updatePassInWallet', [passIdentifier, updatedData]);
    },
    handleDeepLink: function(passIdentifier, successCallback, errorCallback) {
        exec(successCallback, errorCallback, 'WalletExtensionPlugin', 'handleDeepLink', [passIdentifier]);
    }
};

module.exports = WalletExtensionPlugin;
