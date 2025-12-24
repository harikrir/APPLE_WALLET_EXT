import Foundation
import PassKit
@objc(KFHWalletPlugin) class KFHWalletPlugin : CDVPlugin {
   @objc(canAddCard:)
   func canAddCard(command: CDVInvokedUrlCommand) {
       let isAvailable = PKAddPaymentPassViewController.canAddPaymentPass()
       let result = CDVPluginResult(status: CDVCommandStatus_OK, messageAs: isAvailable)
       self.commandDelegate.send(result, callbackId: command.callbackId)
   }
   @objc(startProvisioning:)
   func startProvisioning(command: CDVInvokedUrlCommand) {
       guard let cardId = command.arguments[0] as? String,
             let cardName = command.arguments[1] as? String else {
           let result = CDVPluginResult(status: CDVCommandStatus_ERROR, messageAs: "Invalid Arguments")
           self.commandDelegate.send(result, callbackId: command.callbackId)
           return
       }
       let config = PKAddPaymentPassRequestConfiguration(encryptionScheme: .ECC_V2)
       config?.cardholderName = "KFH Customer"
       config?.primaryAccountSuffix = String(cardId.suffix(4))
       config?.localizedDescription = cardName
       guard let vc = PKAddPaymentPassViewController(requestConfiguration: config!, delegate: self) else {
           let result = CDVPluginResult(status: CDVCommandStatus_ERROR, messageAs: "Could not load Apple UI")
           self.commandDelegate.send(result, callbackId: command.callbackId)
           return
       }
       self.viewController.present(vc, animated: true, completion: nil)
       // Send a success to JS that the UI opened
       let result = CDVPluginResult(status: CDVCommandStatus_OK)
       self.commandDelegate.send(result, callbackId: command.callbackId)
   }
}
extension KFHWalletPlugin: PKAddPaymentPassViewControllerDelegate {
   func addPaymentPassViewController(_ controller: PKAddPaymentPassViewController, generateRequestWithCertificateChain certificates: [Data], nonce: Data, nonceSignature: Data, completionHandler: @escaping (PKAddPaymentPassRequest) -> Void) {
       // IMPORTANT: In production, you send these 'certificates', 'nonce', and 'nonceSignature'
       // to your AUB/KFH backend. Your backend returns the encrypted data.
       // For now, we create an empty request to prevent the UI from hanging.
       let request = PKAddPaymentPassRequest()
       // Once your backend API is ready, you will populate these:
       // request.encryptedPassData = ...
       // request.activationData = ...
       // request.ephemeralPublicKey = ...
       completionHandler(request)
   }
   func addPaymentPassViewController(_ controller: PKAddPaymentPassViewController, didFinishWith pass: PKPaymentPass?, error: Error?) {
       // This closes the Apple sheet regardless of success or failure
       controller.dismiss(animated: true, completion: nil)
   }
}
