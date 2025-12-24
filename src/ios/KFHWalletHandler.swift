import PassKit
class KFHWalletHandler: PKIssuerProvisioningExtensionHandler {
   // Exact same Group Name used in OutSystems JS
   let sharedSuite = UserDefaults(suiteName: "group.com.aub.mobilebanking.uat.bh")
   override func status(completion: @escaping (PKIssuerProvisioningExtensionStatus) -> Void) {
   // This will print the ID of the extension currently running to the Mac Console
   print("Extension waking up with ID: \(Bundle.main.bundleIdentifier ?? "Unknown")")
   let status = PKIssuerProvisioningExtensionStatus()
   status.requiresAuthentication = (sharedSuite?.string(forKey: "AUB_Auth_Token") == nil)
   status.passEntriesAvailable = true
   completion(status)
}
   override func passEntries(completion: @escaping ([PKIssuerProvisioningExtensionPassEntry]) -> Void) {
       guard let token = sharedSuite?.string(forKey: "AUB_Auth_Token") else {
           completion([]); return
       }
       // Fetch cards from KFH Backend
       let url = URL(string: "https://api.aub.com.bh/v1/wallet/cards")!
       var request = URLRequest(url: url)
       request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
       URLSession.shared.dataTask(with: request) { data, _, _ in
           guard let data = data,
                 let cards = try? JSONDecoder().decode([KFHCard].self, from: data) else {
               completion([]); return
           }
           let entries = cards.map { card in
               return PKIssuerProvisioningExtensionPassEntry(
                   identifier: card.id,
                   title: card.name,
                   art: UIImage(named: "kfh_card_art")!.cgImage!,
                   addRequestConfiguration: PKAddPaymentPassRequestConfiguration(encryptionScheme: .ECC_V2)!
               )
           }
           completion(entries)
       }.resume()
   }
   // Handles the actual encryption handshake
   override func generateAddPaymentPassRequest(forPassEntryWithIdentifier identifier: String, configuration: PKAddPaymentPassRequestConfiguration, certificateChain: [Data], nonce: Data, nonceSignature: Data, completionHandler: @escaping (PKAddPaymentPassRequest?) -> Void) {
       guard let token = sharedSuite?.string(forKey: "AUB_Auth_Token") else {
           completionHandler(nil); return
       }
       let body: [String: Any] = [
           "cardId": identifier,
           "certificates": certificateChain.map { $0.base64EncodedString() },
           "nonce": nonce.base64EncodedString(),
           "nonceSignature": nonceSignature.base64EncodedString()
       ]
       var request = URLRequest(url: URL(string: "https://api.aub.com.bh/v1/wallet/encrypt")!)
       request.httpMethod = "POST"
       request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
       request.setValue("application/json", forHTTPHeaderField: "Content-Type")
       request.httpBody = try? JSONSerialization.data(withJSONObject: body)
       URLSession.shared.dataTask(with: request) { data, _, _ in
           guard let data = data,
                 let res = try? JSONDecoder().decode(KFHEncryptionResponse.self, from: data) else {
               completionHandler(nil); return
           }
           let addRequest = PKAddPaymentPassRequest()
           addRequest.encryptedPassData = Data(base64Encoded: res.encryptedPassData)
           addRequest.activationData = Data(base64Encoded: res.activationData)
           addRequest.ephemeralPublicKey = Data(base64Encoded: res.ephemeralPublicKey)
           completionHandler(addRequest)
       }.resume()
   }
}
struct KFHCard: Codable { let id: String; let name: String }
struct KFHEncryptionResponse: Codable {
   let encryptedPassData: String
   let activationData: String
   let ephemeralPublicKey: String
}
