import Foundation

import PassKit

import OSLog

@objc(KFHWalletHandler)

class KFHWalletHandler: PKIssuerProvisioningExtensionHandler {

    private let groupID = "group.com.aub.mobilebanking.uat.bh"

    private let logger = Logger(subsystem: "com.aub.mobilebanking.uat.bh", category: "Extension")

    override func status(completion: @escaping (PKIssuerProvisioningExtensionStatus) -> Void) {

        logger.notice("KFH_LOG: [Status Check] Started")

        let status = PKIssuerProvisioningExtensionStatus()

        status.passEntriesAvailable = true

        status.remotePassEntriesAvailable = true

        let token = UserDefaults(suiteName: groupID)?.string(forKey: "AUB_Auth_Token")

        status.requiresAuthentication = (token == nil)

        logger.notice("KFH_LOG: [Status Check] Auth Required: \(status.requiresAuthentication, privacy: .public)")

        completion(status)

    }

    override func passEntries(completion: @escaping ([PKIssuerProvisioningExtensionPassEntry]) -> Void) {

        let apiUrl = "https://api.aub.com.bh/v1/wallet/cards"

        logger.notice("KFH_LOG: [PassEntries] Fetching from: \(apiUrl, privacy: .public)")

        guard let token = UserDefaults(suiteName: groupID)?.string(forKey: "AUB_Auth_Token") else {

            logger.error("KFH_LOG: [PassEntries] Error - No AUB_Auth_Token found in App Group")

            completion([]); return

        }

        var request = URLRequest(url: URL(string: apiUrl)!)

        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        request.cachePolicy = .reloadIgnoringLocalCacheData

        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in

            guard let self = self else { return }

            // 1. Log HTTP Status Code

            if let httpResponse = response as? HTTPURLResponse {

                self.logger.notice("KFH_LOG: [PassEntries] HTTP Status: \(httpResponse.statusCode, privacy: .public)")

            }

            // 2. Handle Network Errors

            if let error = error {

                self.logger.error("KFH_LOG: [PassEntries] Network Error: \(error.localizedDescription, privacy: .public)")

                completion([]); return

            }

            // 3. Log Raw JSON Response Body

            if let data = data, let jsonString = String(data: data, encoding: .utf8) {

                self.logger.notice("KFH_LOG: [PassEntries] Response JSON: \(jsonString, privacy: .public)")

            }

            // 4. Parse JSON to Models

            guard let data = data, let cards = try? JSONDecoder().decode([KFHCardEntry].self, from: data) else {

                self.logger.error("KFH_LOG: [PassEntries] Failed to parse JSON into [KFHCardEntry]")

                completion([]); return

            }

            // 5. Build Pass Entries

            let cardArt = UIImage(named: "kfh_card_art")?.cgImage ?? UIImage().cgImage!

            let entries: [PKIssuerProvisioningExtensionPassEntry] = cards.compactMap { card in

                guard let config = PKAddPaymentPassRequestConfiguration(encryptionScheme: .ECC_V2) else {

                    self.logger.error("KFH_LOG: [PassEntries] Failed to create PKAddPaymentPassRequestConfiguration")

                    return nil

                }

                config.cardholderName = "KFH Customer"

                config.primaryAccountSuffix = card.last4

                config.localizedDescription = card.name

                return PKIssuerProvisioningExtensionPaymentPassEntry(

                    identifier: card.id,

                    title: card.name,

                    art: cardArt,

                    addRequestConfiguration: config

                )

            }

            self.logger.notice("KFH_LOG: [PassEntries] Returning \(entries.count, privacy: .public) entries to Wallet")

            completion(entries)

        }.resume()

    }

    override func remotePassEntries(completion: @escaping (([PKIssuerProvisioningExtensionPassEntry]) -> Void)) {

        logger.notice("KFH_LOG: [RemotePassEntries] Forwarding to passEntries")

        self.passEntries(completion: completion)

    }

}
 
