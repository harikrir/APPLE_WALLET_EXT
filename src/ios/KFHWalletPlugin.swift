import Foundation
import PassKit
import os.log
@objc(KFHWalletPlugin)
class KFHWalletPlugin : CDVPlugin, PKAddPaymentPassViewControllerDelegate {
   var currentCallbackId: String?
   private let logger = OSLog(subsystem: "com.aub.mobilebanking.uat.bh", category: "WalletPlugin")
   // Lazy initialized sharedSuite to log if the App Group is inaccessible
   private var sharedSuite: UserDefaults? {
       let suite = UserDefaults(suiteName: "group.com.aub.mobilebanking.uat.bh")
       if suite == nil {
           os_log("KFH_LOG: CRITICAL - App Group suite could not be initialized. Check Entitlements!", log: logger, type: .error)
       }
       return suite
   }
   // MARK: - Token Handling with Logs
   @objc(setAuthToken:)
   func setAuthToken(command: CDVInvokedUrlCommand) {
       os_log("KFH_LOG: setAuthToken called", log: logger, type: .info)
       guard let token = command.arguments[0] as? String, !token.isEmpty else {
           os_log("KFH_LOG: Error - Token argument is missing or empty", log: logger, type: .error)
           self.commandDelegate.send(CDVPluginResult(status: CDVCommandStatus_ERROR), callbackId: command.callbackId)
           return
       }
       if let suite = sharedSuite {
           suite.set(token, forKey: "AUB_Auth_Token")
           let success = suite.synchronize()
           if success {
               os_log("KFH_LOG: Token successfully saved to App Group", log: logger, type: .info)
               // Verification read
               let savedToken = suite.string(forKey: "AUB_Auth_Token")
               os_log("KFH_LOG: Verification - Saved token length: %{public}d", log: logger, type: .info, savedToken?.count ?? 0)
               self.commandDelegate.send(CDVPluginResult(status: CDVCommandStatus_OK), callbackId: command.callbackId)
           } else {
               os_log("KFH_LOG: Error - synchronize() failed for App Group", log: logger, type: .error)
               self.commandDelegate.send(CDVPluginResult(status: CDVCommandStatus_ERROR), callbackId: command.callbackId)
           }
       } else {
           self.commandDelegate.send(CDVPluginResult(status: CDVCommandStatus_ERROR), callbackId: command.callbackId)
       }
   }
   // MARK: - Provisioning with Logs
   @objc(startProvisioning:)
   func startProvisioning(command: CDVInvokedUrlCommand) {
       self.currentCallbackId = command.callbackId
       guard let cardId = command.arguments[0] as? String,
             let cardName = command.arguments[1] as? String else {
           os_log("KFH_LOG: startProvisioning failed - Invalid arguments", log: logger, type: .error)
           self.commandDelegate.send(CDVPluginResult(status: CDVCommandStatus_ERROR), callbackId: self.currentCallbackId)
           return
       }
       os_log("KFH_LOG: Starting flow for Card: %{public}@, ID: %{public}@", log: logger, type: .info, cardName, cardId)
       let config = PKAddPaymentPassRequestConfiguration(encryptionScheme: .ECC_V2)
       config?.cardholderName = "KFH Customer"
       config?.primaryAccountSuffix = String(cardId.suffix(4))
       config?.localizedDescription = cardName
       sharedSuite?.set(cardId, forKey: "ACTIVE_CARD_ID")
       sharedSuite?.synchronize()
       if let configData = config, let vc = PKAddPaymentPassViewController(requestConfiguration: configData, delegate: self) {
           os_log("KFH_LOG: Presenting PKAddPaymentPassViewController", log: logger, type: .info)
           self.viewController.present(vc, animated: true, completion: nil)
       } else {
           os_log("KFH_LOG: Error - PKAddPaymentPassViewController could not be created. Is Apple Pay available?", log: logger, type: .error)
       }
   }
   // MARK: - Delegate Logic with Logs
   func addPaymentPassViewController(_ controller: PKAddPaymentPassViewController, generateRequestWithCertificateChain certificates: [Data], nonce: Data, nonceSignature: Data, completionHandler: @escaping (PKAddPaymentPassRequest) -> Void) {
       os_log("KFH_LOG: generateRequestWithCertificateChain triggered", log: logger, type: .info)
       guard let token = sharedSuite?.string(forKey: "AUB_Auth_Token"),
             let cardId = sharedSuite?.string(forKey: "ACTIVE_CARD_ID") else {
           os_log("KFH_LOG: Error - Missing Token or CardID in App Group during provisioning", log: logger, type: .error)
           completionHandler(PKAddPaymentPassRequest()); return
       }
       os_log("KFH_LOG: Requesting pass encryption from backend...", log: logger, type: .info)
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
       URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
           guard let self = self else { return }
           let addRequest = PKAddPaymentPassRequest()
           if let error = error {
               os_log("KFH_LOG: Network error: %{public}@", log: self.logger, type: .error, error.localizedDescription)
           } else if let data = data {
               if let res = try? JSONDecoder().decode(KFHEncryptionResponse.self, from: data) {
                   os_log("KFH_LOG: Successfully received encrypted pass data", log: self.logger, type: .info)
                   addRequest.encryptedPassData = Data(base64Encoded: res.encryptedPassData)
                   addRequest.activationData = Data(base64Encoded: res.activationData)
                   addRequest.ephemeralPublicKey = Data(base64Encoded: res.ephemeralPublicKey)
               } else {
                   os_log("KFH_LOG: Error - Failed to decode JSON response", log: self.logger, type: .error)
               }
           }
           completionHandler(addRequest)
       }.resume()
   }
   func addPaymentPassViewController(_ controller: PKAddPaymentPassViewController, didFinishAdding pass: PKPaymentPass?, error: Error?) {
       let success = (pass != nil)
       os_log("KFH_LOG: Flow finished. Success: %{public}b", log: logger, type: .info, success)
       if let error = error {
           os_log("KFH_LOG: Finish Error: %{public}@", log: logger, type: .error, error.localizedDescription)
       }
       controller.dismiss(animated: true) {
           let status = success ? CDVCommandStatus_OK : CDVCommandStatus_ERROR
           self.commandDelegate.send(CDVPluginResult(status: status), callbackId: self.currentCallbackId)
       }
   }
}
// Global Model
struct KFHEncryptionResponse: Codable {
   let encryptedPassData: String
   let activationData: String
   let ephemeralPublicKey: String
}
