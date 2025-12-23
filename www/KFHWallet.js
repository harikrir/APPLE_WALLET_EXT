var exec = require('cordova/exec');
var KFHWallet = {
   // Check if device supports adding payment passes
   canAddCard: function(success, error) {
       exec(success, error, "KFHWalletPlugin", "canAddCard", []);
   },
   // Trigger the flow to push a card to Apple Wallet
   startProvisioning: function(cardId, cardName, success, error) {
       exec(success, error, "KFHWalletPlugin", "startProvisioning", [cardId, cardName]);
   }
};
module.exports = KFHWallet;
