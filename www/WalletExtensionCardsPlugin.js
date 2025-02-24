var exec = require('cordova/exec');

var WalletExtensionCardsPlugin = {
    addCardToWallet: function(cardDetails, successCallback, errorCallback) {
        exec(successCallback, errorCallback, 'WalletExtensionCardsPlugin', 'addCardToWallet', [cardDetails]);
    },
    authenticateWithFaceID: function(successCallback, errorCallback) {
        exec(successCallback, errorCallback, 'WalletExtensionCardsPlugin', 'authenticateWithFaceID', []);
    }
};

module.exports = WalletExtensionCardsPlugin;
