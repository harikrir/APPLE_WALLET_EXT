import Foundation
import PassKit
import os.log
@objc(KFHWalletPlugin)
class KFHWalletPlugin : CDVPlugin, PKAddPaymentPassViewControllerDelegate {
   var currentCallbackId: String?
   private let logger = OSLog(subsystem: "com.aub.mobilebanking.uat.bh", category: "WalletPlugin")
   let sharedSuite = UserDefaults(suiteName: "group.com.aub.mobilebanking.uat.bh")
   @objc(setAuthToken:)
   func setAuthToken(command: CDVInvokedUrlCommand) {
       guard let token = command.arguments[0] as? String else {
           self.commandDelegate.send(CDVPluginResult(status: CDVCommandStatus_ERROR), callbackId: command.callbackId)
           return
       }
       sharedSuite?.set(token, forKey: "AUB_Auth_Token")
       sharedSuite?.synchronize()
       self.commandDelegate.send(CDVPluginResult(status: CDVCommandStatus_OK), callbackId: command.callbackId)
   }
   @objc(startProvisioning:)
   func startProvisioning(command: CDVInvokedUrlCommand) {
       self.currentCallbackId = command.callbackId
       guard let cardId = command.arguments[0] as? String,
             let cardName = command.arguments[1] as? String else {
           self.commandDelegate.send(CDVPluginResult(status: CDVCommandStatus_ERROR), callbackId: self.currentCallbackId)
           return
       }
       let config = PKAddPaymentPassRequestConfiguration(encryptionScheme: .ECC_V2)
       config?.cardholderName = "KFH Customer"
       config?.primaryAccountSuffix = String(cardId.suffix(4))
       config?.localizedDescription = cardName
       sharedSuite?.set(cardId, forKey: "ACTIVE_CARD_ID")
       if let configData = config, let vc = PKAddPaymentPassViewController(requestConfiguration: configData, delegate: self) {
           self.viewController.present(vc, animated: true, completion: nil)
       }
   }
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
           let addRequest = PKAddPaymentPassRequest()
           if let data = data, let res = try? JSONDecoder().decode(KFHEncryptionResponse.self, from: data) {
               addRequest.encryptedPassData = Data(base64Encoded: res.encryptedPassData)
               addRequest.activationData = Data(base64Encoded: res.activationData)
               addRequest.ephemeralPublicKey = Data(base64Encoded: res.ephemeralPublicKey)
           }
           completionHandler(addRequest)
       }.resume()
   }
   func addPaymentPassViewController(_ controller: PKAddPaymentPassViewController, didFinishAdding pass: PKPaymentPass?, error: Error?) {
       controller.dismiss(animated: true) {
           let status = (pass != nil) ? CDVCommandStatus_OK : CDVCommandStatus_ERROR
           self.commandDelegate.send(CDVPluginResult(status: status), callbackId: self.currentCallbackId)
       }
   }
}
// Global Models to fix "Cannot find in scope"
struct KFHEncryptionResponse: Codable {
   let encryptedPassData: String
   let activationData: String
   let ephemeralPublicKey: String
}
