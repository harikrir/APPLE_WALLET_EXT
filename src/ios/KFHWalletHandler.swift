import Foundation
import PassKit
import os.log
class KFHWalletHandler: PKIssuerProvisioningExtensionHandler {
   private let logger = OSLog(subsystem: "com.aub.mobilebanking.uat.bh", category: "WalletExtension")
   private lazy var session: URLSession = {
       let config = URLSessionConfiguration.default
       config.timeoutIntervalForRequest = 15.0
       return URLSession(configuration: config)
   }()
   // Ensure this matches your plugin.xml and Apple Portal exactly
   let sharedSuite = UserDefaults(suiteName: "group.com.aub.mobilebanking.uat.bh")
   // MARK: - 1. Status Check
   override func status(completion: @escaping (PKIssuerProvisioningExtensionStatus) -> Void) {
       os_log("KFH_LOG: Status check triggered", log: logger, type: .info)
       let status = PKIssuerProvisioningExtensionStatus()
       let token = sharedSuite?.string(forKey: "AUB_Auth_Token")
       os_log("KFH_LOG: Token present in AppGroup: %{public}b", log: logger, type: .info, token != nil)
       // If no token, we require auth (Wallet will show a "Sign In" button)
       status.requiresAuthentication = (token == nil)
       status.passEntriesAvailable = true
       completion(status)
   }
   // MARK: - 2. Remote Pass Entries (Watch)
   override func remotePassEntries(completion: @escaping ([PKIssuerProvisioningExtensionPassEntry]) -> Void) {
       os_log("KFH_LOG: remotePassEntries called for Apple Watch", log: logger, type: .info)
       self.passEntries(completion: completion)
   }
   // MARK: - 3. Local Pass Entries (iPhone)
   override func passEntries(completion: @escaping ([PKIssuerProvisioningExtensionPassEntry]) -> Void) {
       os_log("KFH_LOG: passEntries called for iPhone", log: logger, type: .info)
       guard let token = sharedSuite?.string(forKey: "AUB_Auth_Token") else {
           os_log("KFH_LOG: ERROR - No token. Returning empty list.", log: logger, type: .error)
           completion([]); return
       }
       let url = URL(string: "https://api.aub.com.bh/v1/wallet/cards")!
       var request = URLRequest(url: url)
       request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
       os_log("KFH_LOG: Fetching cards from API...", log: logger, type: .info)
       session.dataTask(with: request) { [weak self] data, response, error in
           guard let self = self else { return }
           // Check for Network Errors
           if let error = error {
               os_log("KFH_LOG: API Error: %{public}@", log: self.logger, type: .error, error.localizedDescription)
               self.returnTestCard(completion: completion) // Fallback to test card so app icon shows
               return
           }
           // Check for Data
           guard let data = data else {
               os_log("KFH_LOG: No data received from API", log: self.logger, type: .error)
               self.returnTestCard(completion: completion)
               return
           }
           do {
               let cards = try JSONDecoder().decode([KFHCardEntry].self, from: data)
               os_log("KFH_LOG: Found %{public}d cards from API", log: self.logger, type: .info, cards.count)
               if cards.isEmpty {
                   os_log("KFH_LOG: API returned 0 cards. Showing test card for debug.", log: self.logger, type: .info)
                   self.returnTestCard(completion: completion)
                   return
               }
               let cardArt = UIImage(named: "kfh_card_art")?.cgImage
               let entries = cards.compactMap { card -> PKIssuerProvisioningExtensionPassEntry? in
                   return PKIssuerProvisioningExtensionPassEntry(
                       identifier: card.id,
                       title: card.name,
                       art: cardArt ?? UIImage().cgImage!,
                       addRequestConfiguration: PKAddPaymentPassRequestConfiguration(encryptionScheme: .ECC_V2)!
                   )
               }
               completion(entries)
           } catch {
               os_log("KFH_LOG: Decoding failed: %{public}@", log: self.logger, type: .error, error.localizedDescription)
               self.returnTestCard(completion: completion)
           }
       }.resume()
   }
   // HELPER: Returns a fake card so the App Icon appears in Wallet for testing
   private func returnTestCard(completion: @escaping ([PKIssuerProvisioningExtensionPassEntry]) -> Void) {
       os_log("KFH_LOG: Returning hardcoded debug card", log: logger, type: .info)
       let testArt = UIImage(named: "kfh_card_art")?.cgImage ?? UIImage().cgImage!
       let testEntry = PKIssuerProvisioningExtensionPaymentPassEntry(
           identifier: "DEBUG_CARD_001",
           title: "KFH Debug Card (Icon Test)",
           art: testArt,
           addRequestConfiguration: PKAddPaymentPassRequestConfiguration(encryptionScheme: .ECC_V2)!
       )
       completion([testEntry])
   }
   // MARK: - 4. Generate Request
   override func generateAddPaymentPassRequest(forPassEntryWithIdentifier identifier: String, configuration: PKAddPaymentPassRequestConfiguration, certificateChain: [Data], nonce: Data, nonceSignature: Data, completionHandler: @escaping (PKAddPaymentPassRequest?) -> Void) {
       os_log("KFH_LOG: generateRequest for: %{public}@", log: logger, type: .info, identifier)
       guard let token = sharedSuite?.string(forKey: "AUB_Auth_Token") else {
           os_log("KFH_LOG: Handshake failed - No token", log: logger, type: .error)
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
               os_log("KFH_LOG: Handshake API Error: %{public}@", log: self.logger, type: .error, error.localizedDescription)
               completionHandler(nil); return
           }
           guard let data = data, let res = try? JSONDecoder().decode(KFHEncryptionResponse.self, from: data) else {
               os_log("KFH_LOG: Handshake decoding failed", log: self.logger, type: .error)
               completionHandler(nil); return
           }
           let addRequest = PKAddPaymentPassRequest()
           addRequest.encryptedPassData = Data(base64Encoded: res.encryptedPassData)
           addRequest.activationData = Data(base64Encoded: res.activationData)
           addRequest.ephemeralPublicKey = Data(base64Encoded: res.ephemeralPublicKey)
           os_log("KFH_LOG: Success! Returning PKAddPaymentPassRequest", log: self.logger, type: .info)
           completionHandler(addRequest)
       }.resume()
   }
}
// Support Models
struct KFHCardEntry: Codable {
   let id: String
   let name: String
}
