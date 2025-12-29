import Foundation
import PassKit
import os.log
@objc(KFHWalletPlugin)
class KFHWalletPlugin : CDVPlugin, PKAddPaymentPassViewControllerDelegate {
   var currentCallbackId: String?
   private let logger = OSLog(subsystem: "com.aub.mobilebanking.uat.bh", category: "WalletPlugin")
   private let groupID = "group.com.aub.mobilebanking.uat.bh"
   // MARK: - Token Storage
   @objc(setAuthToken:)
   func setAuthToken(command: CDVInvokedUrlCommand) {
       guard let token = command.arguments[0] as? String else {
           self.commandDelegate.send(CDVPluginResult(status: CDVCommandStatus_ERROR), callbackId: command.callbackId)
           return
       }
       let suite = UserDefaults(suiteName: groupID)
       suite?.set(token, forKey: "AUB_Auth_Token")
       // NOTE: synchronize() removed as it's unnecessary and causes sandbox logs
       os_log("KFH_LOG: Token updated in App Group", log: logger, type: .info)
       self.commandDelegate.send(CDVPluginResult(status: CDVCommandStatus_OK), callbackId: command.callbackId)
   }
   // MARK: - Provisioning Logic
   @objc(startProvisioning:)
   func startProvisioning(command: CDVInvokedUrlCommand) {
       self.currentCallbackId = command.callbackId
       guard let cardId = command.arguments[0] as? String,
             let cardName = command.arguments[1] as? String else {
           self.commandDelegate.send(CDVPluginResult(status: CDVCommandStatus_ERROR), callbackId: self.currentCallbackId)
           return
       }
       // 1. Check if Apple Pay is available on this device
       if !PKAddPaymentPassViewController.canAddPaymentPass() {
           os_log("KFH_LOG: Device cannot add payment passes", log: logger, type: .error)
           let result = CDVPluginResult(status: CDVCommandStatus_ERROR, messageAs: "Unsupported device")
           self.commandDelegate.send(result, callbackId: self.currentCallbackId)
           return
       }
       let config = PKAddPaymentPassRequestConfiguration(encryptionScheme: .ECC_V2)
       config?.cardholderName = "KFH Customer"
       config?.primaryAccountSuffix = String(cardId.suffix(4))
       config?.localizedDescription = cardName
       let suite = UserDefaults(suiteName: groupID)
       suite?.set(cardId, forKey: "ACTIVE_CARD_ID")
       if let configData = config, let vc = PKAddPaymentPassViewController(requestConfiguration: configData, delegate: self) {
           os_log("KFH_LOG: Launching Apple Provisioning UI", log: logger, type: .info)
           self.viewController.present(vc, animated: true, completion: nil)
       }
   }
   // MARK: - Delegate Method (The Handshake)
   func addPaymentPassViewController(_ controller: PKAddPaymentPassViewController, generateRequestWithCertificateChain certificates: [Data], nonce: Data, nonceSignature: Data, completionHandler: @escaping (PKAddPaymentPassRequest) -> Void) {
       let suite = UserDefaults(suiteName: groupID)
       guard let token = suite?.string(forKey: "AUB_Auth_Token"),
             let cardId = suite?.string(forKey: "ACTIVE_CARD_ID") else {
           os_log("KFH_LOG: Missing auth context", log: logger, type: .error)
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
       URLSession.shared.dataTask(with: request) { [weak self] data, _, error in
           guard let self = self else { return }
           let addRequest = PKAddPaymentPassRequest()
           if let data = data, let res = try? JSONDecoder().decode(KFHEncryptionResponse.self, from: data) {
               os_log("KFH_LOG: Encryption successful", log: self.logger, type: .info)
               addRequest.encryptedPassData = Data(base64Encoded: res.encryptedPassData)
               addRequest.activationData = Data(base64Encoded: res.activationData)
               addRequest.ephemeralPublicKey = Data(base64Encoded: res.ephemeralPublicKey)
           } else {
               os_log("KFH_LOG: Encryption failed or malformed JSON", log: self.logger, type: .error)
           }
           completionHandler(addRequest)
       }.resume()
   }
   func addPaymentPassViewController(_ controller: PKAddPaymentPassViewController, didFinishAdding pass: PKPaymentPass?, error: Error?) {
       controller.dismiss(animated: true) {
           if let error = error {
               os_log("KFH_LOG: Apple Pay returned error: %{public}@", log: self.logger, type: .error, error.localizedDescription)
           }
           let status = (pass != nil) ? CDVCommandStatus_OK : CDVCommandStatus_ERROR
           self.commandDelegate.send(CDVPluginResult(status: status), callbackId: self.currentCallbackId)
       }
   }
}
