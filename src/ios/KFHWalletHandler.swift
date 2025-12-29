import Foundation
import PassKit
import os.log
@objc(KFHWalletHandler)
class KFHWalletHandler: PKIssuerProvisioningExtensionHandler {
   // Group ID must match your Entitlements and Plugin.xml
   private let groupID = "group.com.aub.mobilebanking.uat.bh"
   // Unified Logger for the Extension
   private let logger = OSLog(subsystem: "com.aub.mobilebanking.uat.bh", category: "Extension")
   override func status(completion: @escaping (PKIssuerProvisioningExtensionStatus) -> Void) {
       os_log("KFH_LOG: Status check started", log: logger, type: .info)
       let status = PKIssuerProvisioningExtensionStatus()
       status.passEntriesAvailable = true
       status.remotePassEntriesAvailable = true
       // Check if we have the token in the shared locker
       let token = UserDefaults(suiteName: groupID)?.string(forKey: "AUB_Auth_Token")
       if token == nil {
           os_log("KFH_LOG: Status - No Auth Token found. Login required.", log: logger, type: .error)
           status.requiresAuthentication = true
       } else {
           os_log("KFH_LOG: Status - Auth Token found.", log: logger, type: .info)
           status.requiresAuthentication = false
       }
       completion(status)
   }
   override func passEntries(completion: @escaping ([PKIssuerProvisioningExtensionPassEntry]) -> Void) {
       os_log("KFH_LOG: Fetching pass entries...", log: logger, type: .info)
       guard let token = UserDefaults(suiteName: groupID)?.string(forKey: "AUB_Auth_Token") else {
           os_log("KFH_LOG: Error - Cannot fetch cards without token.", log: logger, type: .error)
           completion([]); return
       }
       var request = URLRequest(url: URL(string: "https://api.aub.com.bh/v1/wallet/cards")!)
       request.httpMethod = "GET"
       request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
       request.timeoutInterval = 10.0 // Ensure we don't hang too long
       URLSession.shared.dataTask(with: request as URLRequest) { [weak self] data, response, error in
           guard let self = self else { return }
           if let error = error {
               os_log("KFH_LOG: Network Error fetching cards: %{public}@", log: self.logger, type: .error, error.localizedDescription)
               completion([]); return
           }
           guard let data = data else {
               os_log("KFH_LOG: Error - No data received from cards API", log: self.logger, type: .error)
               completion([]); return
           }
           do {
               let cards = try JSONDecoder().decode([KFHCardEntry].self, from: data)
               os_log("KFH_LOG: Successfully parsed %d cards", log: self.logger, type: .info, cards.count)
               let cardArt = UIImage(named: "kfh_card_art")?.cgImage
               if cardArt == nil {
                   os_log("KFH_LOG: Warning - kfh_card_art.png not found in bundle", log: self.logger, type: .fault)
               }
               let entries = cards.map { card in
                   PKIssuerProvisioningExtensionPaymentPassEntry(
                       identifier: card.id,
                       title: card.name,
                       art: cardArt ?? UIImage().cgImage!,
                       addRequestConfiguration: PKAddPaymentPassRequestConfiguration(encryptionScheme: .ECC_V2)!
                   )
               }
               completion(entries)
           } catch {
               os_log("KFH_LOG: JSON Parsing Error: %{public}@", log: self.logger, type: .error, error.localizedDescription)
               completion([])
           }
       }.resume()
   }
   override func remotePassEntries(completion: @escaping ([PKIssuerProvisioningExtensionPassEntry]) -> Void) {
       os_log("KFH_LOG: Fetching remote (Watch) entries", log: logger, type: .info)
       self.passEntries(completion: completion)
   }
}
