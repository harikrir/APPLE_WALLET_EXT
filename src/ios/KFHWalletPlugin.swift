import Foundation
import PassKit
@objc(KFHWalletPlugin) class KFHWalletPlugin : CDVPlugin {
   var callbackId: String?
   let suite = UserDefaults(suiteName: "group.com.aub.mobilebanking.uat.bh")
   @objc(setAuthToken:)
   func setAuthToken(command: CDVInvokedUrlCommand) {
       let token = command.arguments[0] as? String
       suite?.set(token, forKey: "AUB_Auth_Token")
       suite?.synchronize()
       self.commandDelegate.send(CDVPluginResult(status: CDVCommandStatus_OK), callbackId: command.callbackId)
   }
   @objc(startProvisioning:)
   func startProvisioning(command: CDVInvokedUrlCommand) {
       self.callbackId = command.callbackId
       let cardId = command.arguments[0] as? String ?? ""
       let cardName = command.arguments[1] as? String ?? "KFH Card"
       let config = PKAddPaymentPassRequestConfiguration(encryptionScheme: .ECC_V2)!
       config.primaryAccountSuffix = String(cardId.suffix(4))
       config.localizedDescription = cardName
       suite?.set(cardId, forKey: "ACTIVE_CARD")
       let vc = PKAddPaymentPassViewController(requestConfiguration: config, delegate: self)!
       self.viewController.present(vc, animated: true)
   }
}
extension KFHWalletPlugin: PKAddPaymentPassViewControllerDelegate {
   func addPaymentPassViewController(_ controller: PKAddPaymentPassViewController, generateRequestWithCertificateChain certificates: [Data], nonce: Data, nonceSignature: Data, completionHandler: @escaping (PKAddPaymentPassRequest) -> Void) {
       let cardId = suite?.string(forKey: "ACTIVE_CARD") ?? ""
       let token = suite?.string(forKey: "AUB_Auth_Token") ?? ""
       let body: [String: Any] = [
           "cardId": cardId,
           "certificates": certificates.map { $0.base64EncodedString() },
           "nonce": nonce.base64EncodedString(),
           "nonceSignature": nonceSignature.base64EncodedString()
       ]
       var request = URLRequest(url: URL(string: "https://api.aub.com.bh/v1/wallet/encrypt")!)
       request.httpMethod = "POST"
       request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
       request.httpBody = try? JSONSerialization.data(withJSONObject: body)
       URLSession.shared.dataTask(with: request) { data, _, _ in
           let res = PKAddPaymentPassRequest()
           if let data = data, let dec = try? JSONDecoder().decode(KFHEncryptionResponse.self, from: data) {
               res.encryptedPassData = Data(base64Encoded: dec.encryptedPassData)
               res.activationData = Data(base64Encoded: dec.activationData)
               res.ephemeralPublicKey = Data(base64Encoded: dec.ephemeralPublicKey)
           }
           completionHandler(res)
       }.resume()
   }
   func addPaymentPassViewController(_ controller: PKAddPaymentPassViewController, didFinishWith pass: PKPaymentPass?, error: Error?) {
       controller.dismiss(animated: true) {
           self.commandDelegate.send(CDVPluginResult(status: (pass != nil) ? .ok : .error), callbackId: self.callbackId)
       }
   }
}
struct KFHEncryptionResponse: Codable {
   let encryptedPassData, activationData, ephemeralPublicKey: String
}
