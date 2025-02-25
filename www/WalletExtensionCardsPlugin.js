var exec = require('cordova/exec');

var WalletExtensionCardsPlugin = {
    addCardToWallet: function(cardDetails, successCallback, errorCallback) {
        exec(successCallback, errorCallback, 'WalletExtensionCardsPlugin', 'addCardToWallet', [cardDetails]);
    },
    authenticateAndRetrieveCards: function(successCallback, errorCallback) {
        exec(successCallback, errorCallback, 'WalletExtensionCardsPlugin', 'authenticateAndRetrieveCards', []);
    }
};

module.exports = WalletExtensionCardsPlugin;
