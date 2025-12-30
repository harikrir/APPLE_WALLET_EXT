import Foundation
import PassKit
// Response model to match your backend JSON structure
struct KFHEncryptionResponse: Codable {
   let activationData: String
   let encryptedPassData: String
   let ephemeralPublicKey: String
}
@objc(AUBWalletPlugin)
class AUBWalletPlugin: CDVPlugin, PKAddPaymentPassViewControllerDelegate {
   private let groupID = "group.com.aub.mobilebanking.uat.bh"
   private var currentCallbackId: String?
   // MARK: - OutSystems Actions
   @objc(setAuthToken:)
   func setAuthToken(command: CDVInvokedUrlCommand) {
       let token = command.arguments.first as? String
       AUBLog.plugin.info("Setting Auth Token for provisioning.")
       UserDefaults(suiteName: groupID)?.set(token, forKey: "AUB_Auth_Token")
       UserDefaults(suiteName: groupID)?.synchronize()
       // FIX: Changed .OK to .CDVCommandStatus_OK
       self.commandDelegate.send(CDVPluginResult(status: .CDVCommandStatus_OK), callbackId: command.callbackId)
   }
   @objc(startProvisioning:)
   func startProvisioning(command: CDVInvokedUrlCommand) {
       self.currentCallbackId = command.callbackId
       guard let cardId = command.arguments[0] as? String,
             let cardName = command.arguments[1] as? String else {
           AUBLog.plugin.error("StartProvisioning failed: Invalid Arguments.")
           self.sendError("Invalid Arguments")
           return
       }
       AUBLog.plugin.notice("Starting In-App Provisioning for Card: \(cardId.suffix(4))")
       // 1. Check Device Capability
       guard PKAddPaymentPassViewController.canAddPaymentPass() else {
           AUBLog.plugin.warning("Device or Region does not support Apple Pay.")
           self.sendError("Apple Pay is not supported on this device.")
           return
       }
       // 2. Setup Configuration
       guard let config = PKAddPaymentPassViewController.canAddPaymentPass() ? PKAddPaymentPassRequestConfiguration(encryptionScheme: .ECC_V2) : nil else {
           AUBLog.plugin.error("Encryption Scheme ECC_V2 initialization failed.")
           self.sendError("Initialization Error")
           return
       }
       config.cardholderName = "AUB Customer"
       config.primaryAccountSuffix = String(cardId.suffix(4))
       config.localizedDescription = cardName
       // Save state for delegate and extensions
       UserDefaults(suiteName: groupID)?.set(cardId, forKey: "ACTIVE_CARD_ID")
       UserDefaults(suiteName: groupID)?.synchronize()
       // 3. Present Apple Wallet UI
       guard let vc = PKAddPaymentPassViewController(requestConfiguration: config, delegate: self) else {
           AUBLog.plugin.error("Could not instantiate PKAddPaymentPassViewController.")
           self.sendError("UI Presentation Error")
           return
       }
       self.viewController.present(vc, animated: true)
   }
   // MARK: - PKAddPaymentPassViewControllerDelegate
   func addPaymentPassViewController(_ controller: PKAddPaymentPassViewController, generateRequestWithCertificateChain certificates: [Data], nonce: Data, nonceSignature: Data, completionHandler: @escaping (PKAddPaymentPassRequest) -> Void) {
       AUBLog.plugin.info("Apple provided certificates and nonce. Preparing backend request.")
       let certChainBase64 = certificates.map { $0.base64EncodedString() }
       let nonceBase64 = nonce.base64EncodedString()
       let nonceSignatureBase64 = nonceSignature.base64EncodedString()
       let cardId = UserDefaults(suiteName: groupID)?.string(forKey: "ACTIVE_CARD_ID") ?? ""
       let authToken = UserDefaults(suiteName: groupID)?.string(forKey: "AUB_Auth_Token") ?? ""
       // Network Handshake
       let requestUrl = URL(string: "https://api.aub.com.bh/v1/wallet/provision")!
       var request = URLRequest(url: requestUrl)
       request.httpMethod = "POST"
       request.setValue("Bearer \(authToken)", forHTTPHeaderField: "Authorization")
       request.setValue("application/json", forHTTPHeaderField: "Content-Type")
       let body: [String: Any] = [
           "cardId": cardId,
           "certificates": certChainBase64,
           "nonce": nonceBase64,
           "nonceSignature": nonceSignatureBase64
       ]
       request.httpBody = try? JSONSerialization.data(withJSONObject: body)
       AUBLog.plugin.debug("Calling: \(requestUrl.absoluteString)")
       URLSession.shared.dataTask(with: request) { data, response, error in
           if let error = error {
               AUBLog.plugin.error("Handshake Network Error: \(error.localizedDescription)")
               // Note: In a real app, you'd want to call completionHandler with an empty request to fail gracefully
               return
           }
           guard let data = data else {
               AUBLog.plugin.error("Handshake Error: Received empty data from server.")
               return
           }
           do {
               let apiResponse = try JSONDecoder().decode(KFHEncryptionResponse.self, from: data)
               let addRequest = PKAddPaymentPassRequest()
               addRequest.activationData = Data(base64Encoded: apiResponse.activationData)
               addRequest.encryptedPassData = Data(base64Encoded: apiResponse.encryptedPassData)
               addRequest.ephemeralPublicKey = Data(base64Encoded: apiResponse.ephemeralPublicKey)
               AUBLog.plugin.notice("Handshake successful. Returning encrypted payload to Apple.")
               completionHandler(addRequest)
           } catch {
               AUBLog.plugin.error("JSON Mapping Error: \(error.localizedDescription)")
           }
       }.resume()
   }
   func addPaymentPassViewController(_ controller: PKAddPaymentPassViewController, didFinishAdding pass: PKPaymentPass?, error: Error?) {
       controller.dismiss(animated: true) {
           if let error = error {
               AUBLog.plugin.error("Wallet Provisioning failed: \(error.localizedDescription)")
               self.sendError(error.localizedDescription)
           } else {
               AUBLog.plugin.notice("Card successfully added to Apple Wallet.")
               // FIX: Changed .OK to .CDVCommandStatus_OK
               let result = CDVPluginResult(status: .CDVCommandStatus_OK)
               self.commandDelegate.send(result, callbackId: self.currentCallbackId)
           }
       }
   }
   // MARK: - Helpers
   private func sendError(_ message: String) {
       // FIX: Changed .ERROR to .CDVCommandStatus_ERROR
       let result = CDVPluginResult(status: .CDVCommandStatus_ERROR, messageAs: message)
       self.commandDelegate.send(result, callbackId: self.currentCallbackId)
   }
}
