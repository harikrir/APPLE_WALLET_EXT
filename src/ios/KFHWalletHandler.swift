import Foundation
import PassKit
import os.log
@objc(KFHWalletHandler)
class KFHWalletHandler: PKIssuerProvisioningExtensionHandler {
   private let logger = OSLog(subsystem: "com.aub.mobilebanking.uat.bh", category: "WalletExtension")
   private lazy var session: URLSession = {
       let config = URLSessionConfiguration.default
       config.timeoutIntervalForRequest = 10.0
       return URLSession(configuration: config)
   }()
   // Lazy initialized with logging to catch initialization failures
   private var sharedSuite: UserDefaults? {
       let suite = UserDefaults(suiteName: "group.com.aub.mobilebanking.uat.bh")
       if suite == nil {
           os_log("KFH_EXT: CRITICAL - App Group suite is NIL. Check App Group entitlements.", log: logger, type: .error)
       }
       return suite
   }
   // MARK: - 1. Status Check
   override func status(completion: @escaping (PKIssuerProvisioningExtensionStatus) -> Void) {
       os_log("KFH_EXT: status() check started", log: logger, type: .info)
       let status = PKIssuerProvisioningExtensionStatus()
       let token = sharedSuite?.string(forKey: "AUB_Auth_Token")
       os_log("KFH_EXT: Token retrieval attempted. Success: %{public}b", log: logger, type: .info, token != nil)
       status.requiresAuthentication = (token == nil)
       status.passEntriesAvailable = true
       os_log("KFH_EXT: status() result -> requiresAuth: %{public}b", log: logger, type: .info, status.requiresAuthentication)
       completion(status)
   }
   // MARK: - 2. Remote Pass Entries
   override func remotePassEntries(completion: @escaping ([PKIssuerProvisioningExtensionPassEntry]) -> Void) {
       os_log("KFH_EXT: remotePassEntries() called for Apple Watch", log: logger, type: .info)
       self.passEntries(completion: completion)
   }
   // MARK: - 3. Local Pass Entries
   override func passEntries(completion: @escaping ([PKIssuerProvisioningExtensionPassEntry]) -> Void) {
       os_log("KFH_EXT: passEntries() fetching card list...", log: logger, type: .info)
       guard let token = sharedSuite?.string(forKey: "AUB_Auth_Token") else {
           os_log("KFH_EXT: ABORT - No token in Shared Suite. Cannot fetch cards.", log: logger, type: .error)
           completion([]); return
       }
       let url = URL(string: "https://api.aub.com.bh/v1/wallet/cards")!
       var request = URLRequest(url: url)
       request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
       session.dataTask(with: request) { [weak self] data, response, error in
           guard let self = self else { return }
           if let error = error {
               os_log("KFH_EXT: API error: %{public}@", log: self.logger, type: .error, error.localizedDescription)
               completion([]); return
           }
           if let httpResponse = response as? HTTPURLResponse {
               os_log("KFH_EXT: API HTTP Status: %{public}d", log: self.logger, type: .info, httpResponse.statusCode)
           }
           guard let data = data else {
               os_log("KFH_EXT: API Error - Data task returned nil", log: self.logger, type: .error)
               completion([]); return
           }
           do {
               let cards = try JSONDecoder().decode([KFHCardEntry].self, from: data)
               os_log("KFH_EXT: Success - Decoded %{public}d cards from backend", log: self.logger, type: .info, cards.count)
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
               os_log("KFH_EXT: JSON Decode Error - Could not parse card list", log: self.logger, type: .error)
               completion([])
           }
       }.resume()
   }
   // MARK: - 4. Generate Request
   override func generateAddPaymentPassRequest(forPassEntryWithIdentifier identifier: String, configuration: PKAddPaymentPassRequestConfiguration, certificateChain: [Data], nonce: Data, nonceSignature: Data, completionHandler: @escaping (PKAddPaymentPassRequest?) -> Void) {
       os_log("KFH_EXT: generateRequest() started for ID: %{public}@", log: logger, type: .info, identifier)
       guard let token = sharedSuite?.string(forKey: "AUB_Auth_Token") else {
           os_log("KFH_EXT: Handshake Error - Token missing from suite", log: logger, type: .error)
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
       session.dataTask(with: request) { [weak self] data, response, error in
           guard let self = self else { return }
           if let error = error {
               os_log("KFH_EXT: Handshake Network Error: %{public}@", log: self.logger, type: .error, error.localizedDescription)
               completionHandler(nil); return
           }
           guard let data = data, let res = try? JSONDecoder().decode(KFHEncryptionResponse.self, from: data) else {
               os_log("KFH_EXT: Handshake Decode Error - Response invalid", log: self.logger, type: .error)
               completionHandler(nil); return
           }
           let addRequest = PKAddPaymentPassRequest()
           addRequest.encryptedPassData = Data(base64Encoded: res.encryptedPassData)
           addRequest.activationData = Data(base64Encoded: res.activationData)
           addRequest.ephemeralPublicKey = Data(base64Encoded: res.ephemeralPublicKey)
           os_log("KFH_EXT: Handshake SUCCESS. Returning pass data to Wallet.", log: self.logger, type: .info)
           completionHandler(addRequest)
       }.resume()
   }
}
