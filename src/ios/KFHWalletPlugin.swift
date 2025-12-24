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
      guard let configData = config,
            let vc = PKAddPaymentPassViewController(requestConfiguration: configData, delegate: self) else {
          let result = CDVPluginResult(status: CDVCommandStatus_ERROR, messageAs: "Could not load Apple UI")
          self.commandDelegate.send(result, callbackId: command.callbackId)
          return
      }
      self.viewController.present(vc, animated: true, completion: nil)
      let result = CDVPluginResult(status: CDVCommandStatus_OK)
      self.commandDelegate.send(result, callbackId: command.callbackId)
  }
}
extension KFHWalletPlugin: PKAddPaymentPassViewControllerDelegate {
   // ONLY ONE INSTANCE OF THIS FUNCTION IS ALLOWED
   func addPaymentPassViewController(_ controller: PKAddPaymentPassViewController, generateRequestWithCertificateChain certificates: [Data], nonce: Data, nonceSignature: Data, completionHandler: @escaping (PKAddPaymentPassRequest) -> Void) {
       let request = PKAddPaymentPassRequest()
       // Populate with empty Data to satisfy the compiler for now
       request.encryptedPassData = Data()
       request.activationData = Data()
       request.ephemeralPublicKey = Data()
       completionHandler(request)
   }
   func addPaymentPassViewController(_ controller: PKAddPaymentPassViewController, didFinishWith pass: PKPaymentPass?, error: Error?) {
       controller.dismiss(animated: true, completion: nil)
   }
}
