import Foundation
import PassKit
import os.log
@objc(KFHWalletPlugin)
class KFHWalletPlugin : CDVPlugin, PKAddPaymentPassViewControllerDelegate {
   var currentCallbackId: String?
   // Define a logger for easy filtering in the macOS Console app
   // Filter by Subsystem: com.aub.mobilebanking.uat.bh
   private let logger = OSLog(subsystem: "com.aub.mobilebanking.uat.bh", category: "WalletPlugin")
   let sharedSuite = UserDefaults(suiteName: "group.com.aub.mobilebanking.uat.bh")
   @objc(canAddCard:)
   func canAddCard(command: CDVInvokedUrlCommand) {
       let isAvailable = PKAddPaymentPassViewController.canAddPaymentPass()
       os_log("Checking Apple Pay availability: %{public}b", log: logger, type: .info, isAvailable)
       let result = CDVPluginResult(status: CDVCommandStatus_OK, messageAs: isAvailable)
       self.commandDelegate.send(result, callbackId: command.callbackId)
   }
   @objc(setAuthToken:)
   func setAuthToken(command: CDVInvokedUrlCommand) {
       guard let token = command.arguments[0] as? String else {
           os_log("Failed to set Auth Token: No token provided in arguments", log: logger, type: .error)
           self.commandDelegate.send(CDVPluginResult(status: CDVCommandStatus_ERROR), callbackId: command.callbackId)
           return
       }
       os_log("Setting Auth Token in Shared App Group...", log: logger, type: .info)
       sharedSuite?.set(token, forKey: "AUB_Auth_Token")
       sharedSuite?.synchronize()
       self.commandDelegate.send(CDVPluginResult(status: CDVCommandStatus_OK), callbackId: command.callbackId)
   }
   @objc(startProvisioning:)
   func startProvisioning(command: CDVInvokedUrlCommand) {
       self.currentCallbackId = command.callbackId
       guard let cardId = command.arguments[0] as? String,
             let cardName = command.arguments[1] as? String else {
           os_log("StartProvisioning failed: Missing cardId or cardName", log: logger, type: .error)
           let res = CDVPluginResult(status: CDVCommandStatus_ERROR, messageAs: "Invalid Args")
           self.commandDelegate.send(res, callbackId: self.currentCallbackId)
           return
       }
       os_log("Starting provisioning flow for card: %{public}@", log: logger, type: .info, cardName)
       let config = PKAddPaymentPassRequestConfiguration(encryptionScheme: .ECC_V2)
       config?.cardholderName = "KFH Customer"
       config?.primaryAccountSuffix = String(cardId.suffix(4))
       config?.localizedDescription = cardName
       // Store Active Card ID for the delegate to use later
       sharedSuite?.set(cardId, forKey: "ACTIVE_CARD_ID")
       if let configData = config, let vc = PKAddPaymentPassViewController(requestConfiguration: configData, delegate: self) {
           os_log("Presenting PKAddPaymentPassViewController", log: logger, type: .info)
           self.viewController.present(vc, animated: true, completion: nil)
       } else {
           os_log("Failed to initialize PKAddPaymentPassViewController", log: logger, type: .error)
           let res = CDVPluginResult(status: CDVCommandStatus_ERROR, messageAs: "Apple Pay Unavailable")
           self.commandDelegate.send(res, callbackId: self.currentCallbackId)
       }
   }
   // MARK: - PKAddPaymentPassViewControllerDelegate
   func addPaymentPassViewController(_ controller: PKAddPaymentPassViewController, generateRequestWithCertificateChain certificates: [Data], nonce: Data, nonceSignature: Data, completionHandler: @escaping (PKAddPaymentPassRequest) -> Void) {
       os_log("Delegate: generateRequestWithCertificateChain called", log: logger, type: .info)
       guard let token = sharedSuite?.string(forKey: "AUB_Auth_Token"),
             let cardId = sharedSuite?.string(forKey: "ACTIVE_CARD_ID") else {
           os_log("Critical Error: Missing Token or CardID in AppGroup during delegate callback", log: logger, type: .error)
           completionHandler(PKAddPaymentPassRequest())
           return
       }
       let body: [String: Any] = [
           "cardId": cardId,
           "certificates": certificates.map { $0.base64EncodedString() },
           "nonce": nonce.base64EncodedString(),
           "nonceSignature": nonceSignature.base64EncodedString()
       ]
       os_log("Sending encryption request to KFH Backend for cardId: %{public}@", log: logger, type: .info, cardId)
       var request = URLRequest(url: URL(string: "https://api.aub.com.bh/v1/wallet/encrypt")!)
       request.httpMethod = "POST"
       request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
       request.setValue("application/json", forHTTPHeaderField: "Content-Type")
       request.httpBody = try? JSONSerialization.data(withJSONObject: body)
       let task = URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
           guard let self = self else { return }
           let addRequest = PKAddPaymentPassRequest()
           if let error = error {
               os_log("Backend Request Error: %{public}@", log: self.logger, type: .error, error.localizedDescription)
           } else if let data = data, let res = try? JSONDecoder().decode(KFHEncryptionResponse.self, from: data) {
               os_log("Backend successfully returned encrypted pass data", log: self.logger, type: .info)
               addRequest.encryptedPassData = Data(base64Encoded: res.encryptedPassData)
               addRequest.activationData = Data(base64Encoded: res.activationData)
               addRequest.ephemeralPublicKey = Data(base64Encoded: res.ephemeralPublicKey)
           } else {
               os_log("Failed to decode backend response data", log: self.logger, type: .error)
           }
           completionHandler(addRequest)
       }
       task.resume()
   }
   func addPaymentPassViewController(_ controller: PKAddPaymentPassViewController, didFinishAdding pass: PKPaymentPass?, error: Error?) {
       let isSuccess = (pass != nil)
       os_log("Provisioning finished. Success: %{public}b", log: logger, type: .info, isSuccess)
       if let error = error {
           os_log("Provisioning Error: %{public}@", log: logger, type: .error, error.localizedDescription)
       }
       controller.dismiss(animated: true) {
           let status = isSuccess ? CDVCommandStatus_OK : CDVCommandStatus_ERROR
           let result = CDVPluginResult(status: status)
           self.commandDelegate.send(result, callbackId: self.currentCallbackId)
       }
   }
}
