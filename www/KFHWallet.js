var exec = require('cordova/exec');
var KFHWallet = {
   /**
    * Check if the device and the OS support adding payment passes.
    * This should be called before showing the "Add to Wallet" button.
    * * @param {Function} success - Callback receiving a boolean (true/false)
    * @param {Function} error - Callback receiving error details
    */
   canAddCard: function(success, error) {
       exec(success, error, "KFHWalletPlugin", "canAddCard", []);
   },
   /**
    * Set the Authorization Token for the App Group.
    * * @param {string} token - The JWT or Auth token from your backend
    * @param {Function} success - Called if token is saved successfully
    * @param {Function} error - Called if saving fails
    */
   setAuthToken: function(token, success, error) {
       exec(success, error, "KFHWalletPlugin", "setAuthToken", [token]);
   },
   /**
    * Trigger the In-App Provisioning flow.
    * This opens the native Apple Pay "Add Card" sheet.
    * * @param {string} cardId - The unique ID or suffix of the card
    * @param {string} cardName - The display name (e.g., "KFH Visa Signature")
    * @param {Function} success - Called if card is added successfully
    * @param {Function} error - Called if user cancels or process fails
    */
   startProvisioning: function(cardId, cardName, success, error) {
       // Ensure arguments are strings as expected by the Swift side
       var args = [String(cardId), String(cardName)];
       exec(success, error, "KFHWalletPlugin", "startProvisioning", args);
   }
};
module.exports = KFHWallet;
