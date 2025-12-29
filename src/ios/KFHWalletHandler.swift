import Foundation
import PassKit
import os.log
// This attribute is CRITICAL for the plugin.xml to find the class without the Module name
@objc(KFHWalletHandler)
class KFHWalletHandler: PKIssuerProvisioningExtensionHandler {
   // Subsystem allows you to filter in macOS Console.app
   private let logger = OSLog(subsystem: "com.aub.mobilebanking.uat.bh", category: "WalletExtension")
   private lazy var session: URLSession = {
       let config = URLSessionConfiguration.default
       config.timeoutIntervalForRequest = 10.0 // Keep it tight
       return URLSession(configuration: config)
   }()
   let sharedSuite = UserDefaults(suiteName: "group.com.aub.mobilebanking.uat.bh")
   // MARK: - 1. Status Check (Must be extremely fast)
   override func status(completion: @escaping (PKIssuerProvisioningExtensionStatus) -> Void) {
       os_log("KFH_EXT: Status check started", log: logger, type: .info)
       let status = PKIssuerProvisioningExtensionStatus()
       let token = sharedSuite?.string(forKey: "AUB_Auth_Token")
       // Log the token status (don't log the actual token for security)
       os_log("KFH_EXT: Shared Token present: %{public}b", log: logger, type: .info, token != nil)
       status.requiresAuthentication = (token == nil)
       status.passEntriesAvailable = true
       os_log("KFH_EXT: Status check completed. Requires Auth: %{public}b", log: logger, type: .info, status.requiresAuthentication)
       completion(status)
   }
   // MARK: - 2. Remote Pass Entries (For Apple Watch)
   override func remotePassEntries(completion: @escaping ([PKIssuerProvisioningExtensionPassEntry]) -> Void) {
       os_log("KFH_EXT: remotePassEntries called", log: logger, type: .info)
       self.passEntries(completion: completion)
   }
   // MARK: - 3. Local Pass Entries (For iPhone)
   override func passEntries(completion: @escaping ([PKIssuerProvisioningExtensionPassEntry]) -> Void) {
       os_log("KFH_EXT: passEntries called. Fetching cards...", log: logger, type: .info)
       guard let token = sharedSuite?.string(forKey: "AUB_Auth_Token") else {
           os_log("KFH_EXT: ERROR - No token found. Returning empty.", log: logger, type: .error)
           completion([]); return
       }
       let url = URL(string: "https://api.aub.com.bh/v1/wallet/cards")!
       var request = URLRequest(url: url)
       request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
       session.dataTask(with: request) { [weak self] data, _, error in
           guard let self = self else { return }
           if let error = error {
               os_log("KFH_EXT: API error: %{public}@", log: self.logger, type: .error, error.localizedDescription)
               completion([]); return
           }
           guard let data = data else {
               os_log("KFH_EXT: API returned no data", log: self.logger, type: .error)
               completion([]); return
           }
           do {
               let cards = try JSONDecoder().decode([KFHCardEntry].self, from: data)
               os_log("KFH_EXT: Successfully decoded %{public}d cards", log: self.logger, type: .info, cards.count)
               let cardArt = UIImage(named: "kfh_card_art")?.cgImage
               let entries = cards.compactMap { card -> PKIssuerProvisioningExtensionPassEntry? in
                   return PKIssuerProvisioningExtensionPaymentPassEntry(
                       identifier: card.id,
                       title: card.name,
                       art: cardArt ?? UIImage().cgImage!,
                       addRequestConfiguration: PKAddPaymentPassRequestConfiguration(encryptionScheme: .ECC_V2)!
                   )
               }
               completion(entries)
           } catch {
               os_log("KFH_EXT: JSON Decoding failed", log: self.logger, type: .error)
               completion([])
           }
       }.resume()
   }
   // MARK: - 4. Generate Request
   override func generateAddPaymentPassRequest(forPassEntryWithIdentifier identifier: String, configuration: PKAddPaymentPassRequestConfiguration, certificateChain: [Data], nonce: Data, nonceSignature: Data, completionHandler: @escaping (PKAddPaymentPassRequest?) -> Void) {
       os_log("KFH_EXT: generateRequest for card: %{public}@", log: logger, type: .info, identifier)
       guard let token = sharedSuite?.string(forKey: "AUB_Auth_Token") else {
           os_log("KFH_EXT: Handshake failed - No Token", log: logger, type: .error)
           completionHandler(nil); return
       }
       let payload: [String: Any] = [
           "cardId": identifier,
           "certificates": certificateChain.map { $0.base64EncodedString() },
           "nonce": nonce.base64EncodedString(),
           "nonceSignature": nonceSignature.base64EncodedString()
       ]
       var request = URLRequest(url: URL(string: "https://api.aub.com.bh/v1/wallet/encrypt")!)
       request.httpMethod = "POST"
       request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
       request.setValue("application/json", forHTTPHeaderField: "Content-Type")
       request.httpBody = try? JSONSerialization.data(withJSONObject: payload)
       session.dataTask(with: request) { [weak self] data, _, error in
           guard let self = self else { return }
           if let error = error {
               os_log("KFH_EXT: Handshake network error: %{public}@", log: self.logger, type: .error, error.localizedDescription)
               completionHandler(nil); return
           }
           guard let data = data, let res = try? JSONDecoder().decode(KFHEncryptionResponse.self, from: data) else {
               os_log("KFH_EXT: Handshake decoding error", log: self.logger, type: .error)
               completionHandler(nil); return
           }
           let addRequest = PKAddPaymentPassRequest()
           addRequest.encryptedPassData = Data(base64Encoded: res.encryptedPassData)
           addRequest.activationData = Data(base64Encoded: res.activationData)
           addRequest.ephemeralPublicKey = Data(base64Encoded: res.ephemeralPublicKey)
           os_log("KFH_EXT: Handshake successful. Sending pass to Wallet.", log: self.logger, type: .info)
           completionHandler(addRequest)
       }.resume()
   }
}
