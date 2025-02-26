var exec = require('cordova/exec');

var WalletExtensionCardsPlugin = {
    addCardToWallet: function(cardDetails, successCallback, errorCallback) {
        exec(successCallback, errorCallback, 'WalletExtensionCardsPlugin', 'addCardToWallet', [cardDetails]);
    },
    authenticateAndRetrieveCards: function(successCallback, errorCallback) {
        exec(successCallback, errorCallback, 'WalletExtensionCardsPlugin', 'authenticateAndRetrieveCards', []);
    },

    generateAddPaymentPassRequestForPassEntryWithIdentifier : function(identifier, certificates, nonce, nonceSignature, successCallback, errorCallback) {
    exec(successCallback, errorCallback, "WalletExtensionCardsPlugin", "generateAddPaymentPassRequestForPassEntryWithIdentifier", [identifier, certificates, nonce, nonceSignature]);
}

module.exports = WalletExtensionCardsPlugin;
