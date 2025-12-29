var exec = require('cordova/exec');
var KFHWalletPlugin = {
   /**
    * Saves the Authentication Token to the shared App Group.
    * This allows the Wallet Extensions to access the API.
    * @param {string} token - The Bearer token from your login.
    * @param {function} success - Success callback.
    * @param {function} error - Error callback.
    */
   setAuthToken: function (token, success, error) {
       exec(success, error, 'KFHWalletPlugin', 'setAuthToken', [token]);
   },
   /**
    * Starts the Apple Pay "Add to Wallet" flow from within the app.
    * @param {string} cardId - The unique ID of the card.
    * @param {string} cardName - The display name of the card (e.g., "KFH Visa Signature").
    * @param {function} success - Success callback (called when card is added).
    * @param {function} error - Error callback.
    */
   startProvisioning: function (cardId, cardName, success, error) {
       exec(success, error, 'KFHWalletPlugin', 'startProvisioning', [cardId, cardName]);
   }
};
module.exports = KFHWalletPlugin;
