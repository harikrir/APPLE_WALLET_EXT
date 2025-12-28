import Foundation
import PassKit
@objc(KFHWalletPlugin) class KFHWalletPlugin : CDVPlugin {
   var currentCallbackId: String?
   let sharedSuite = UserDefaults(suiteName: "group.com.aub.mobilebanking.uat.bh")
   @objc(canAddCard:)
   func canAddCard(command: CDVInvokedUrlCommand) {
       let isAvailable = PKAddPaymentPassViewController.canAddPaymentPass()
       let result = CDVPluginResult(status: CDVCommandStatus_OK, messageAs: isAvailable)
       self.commandDelegate.send(result, callbackId: command.callbackId)
   }
   @objc(startProvisioning:)
   func startProvisioning(command: CDVInvokedUrlCommand) {
       self.currentCallbackId = command.callbackId
       guard let cardId = command.arguments[0] as? String,
             let cardName = command.arguments[1] as? String else {
           self.fail(msg: "Invalid Arguments")
           return
       }
       let config = PKAddPaymentPassRequestConfiguration(encryptionScheme: .ECC_V2)
       config?.cardholderName = "KFH Customer"
       config?.primaryAccountSuffix = String(cardId.suffix(4))
       config?.localizedDescription = cardName
       sharedSuite?.set(cardId, forKey: "ACTIVE_CARD_ID") // For use in delegate
       guard let configData = config,
             let vc = PKAddPaymentPassViewController(requestConfiguration: configData, delegate: self) else {
           self.fail(msg: "Apple Pay UI Unavailable")
           return
       }
       self.viewController.present(vc, animated: true)
   }
   func fail(msg: String) {
       let result = CDVPluginResult(status: CDVCommandStatus_ERROR, messageAs: msg)
       self.commandDelegate.send(result, callbackId: self.currentCallbackId)
   }
}
extension KFHWalletPlugin: PKAddPaymentPassViewControllerDelegate {
   func addPaymentPassViewController(_ controller: PKAddPaymentPassViewController, generateRequestWithCertificateChain certificates: [Data], nonce: Data, nonceSignature: Data, completionHandler: @escaping (PKAddPaymentPassRequest) -> Void) {
       guard let token = sharedSuite?.string(forKey: "AUB_Auth_Token"),
             let cardId = sharedSuite?.string(forKey: "ACTIVE_CARD_ID") else {
           completionHandler(PKAddPaymentPassRequest()); return
       }
       let body: [String: Any] = [
           "cardId": cardId,
           "certificates": certificates.map { $0.base64EncodedString() },
           "nonce": nonce.base64EncodedString(),
           "nonceSignature": nonceSignature.base64EncodedString()
       ]
       var request = URLRequest(url: URL(string: "https://api.aub.com.bh/v1/wallet/encrypt")!)
       request.httpMethod = "POST"
       request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
       request.setValue("application/json", forHTTPHeaderField: "Content-Type")
       request.httpBody = try? JSONSerialization.data(withJSONObject: body)
       URLSession.shared.dataTask(with: request) { data, _, _ in
           guard let data = data, let res = try? JSONDecoder().decode(KFHEncryptionResponse.self, from: data) else {
               completionHandler(PKAddPaymentPassRequest()); return
           }
           let addReq = PKAddPaymentPassRequest()
           addReq.encryptedPassData = Data(base64Encoded: res.encryptedPassData)
           addReq.activationData = Data(base64Encoded: res.activationData)
           addReq.ephemeralPublicKey = Data(base64Encoded: res.ephemeralPublicKey)
           completionHandler(addReq)
       }.resume()
   }
   func addPaymentPassViewController(_ controller: PKAddPaymentPassViewController, didFinishWith pass: PKPaymentPass?, error: Error?) {
       controller.dismiss(animated: true) {
           let result = (pass != nil) ? CDVPluginResult(status: CDVCommandStatus_OK) : CDVPluginResult(status: CDVCommandStatus_ERROR)
           self.commandDelegate.send(result, callbackId: self.currentCallbackId)
       }
   }
}
