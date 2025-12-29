import Foundation

import PassKit

import OSLog

/// The Non-UI Extension Handler for Apple Pay In-App Provisioning

@objc 

class KFHWalletHandler: PKIssuerProvisioningExtensionHandler {

    // Identifiers matching your Developer Portal and plugin.xml

    private let groupID = "group.com.aub.mobilebanking.uat.bh"

    private let logger = Logger(subsystem: "com.aub.mobilebanking.uat.bh", category: "Extension")

    // MARK: - Status

    // Determines if the "Add to Apple Wallet" option appears for your app

    override func status(completion: @escaping (PKIssuerProvisioningExtensionStatus) -> Void) {

        logger.notice("KFH_LOG: [Extension] Status check started")

        let status = PKIssuerProvisioningExtensionStatus()

        status.passEntriesAvailable = true

        status.remotePassEntriesAvailable = true

        // Check if user is logged in via App Group UserDefaults

        let token = UserDefaults(suiteName: groupID)?.string(forKey: "AUB_Auth_Token")

        status.requiresAuthentication = (token == nil)

        logger.notice("KFH_LOG: [Extension] Auth Required: \(status.requiresAuthentication, privacy: .public)")

        completion(status)

    }

    // MARK: - Pass Entries (Local)

    // Fetches the list of cards to show in the Apple Wallet app

    override func passEntries(completion: @escaping ([PKIssuerProvisioningExtensionPassEntry]) -> Void) {

        let apiUrl = "https://api.aub.com.bh/v1/wallet/cards"

        logger.notice("KFH_LOG: [Extension] Fetching cards from: \(apiUrl, privacy: .public)")

        guard let token = UserDefaults(suiteName: groupID)?.string(forKey: "AUB_Auth_Token") else {

            logger.error("KFH_LOG: [Extension] Error: No token found in App Group")

            completion([]); return

        }

        var request = URLRequest(url: URL(string: apiUrl)!)

        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        request.cachePolicy = .reloadIgnoringLocalCacheData

        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in

            guard let self = self else { return }

            // Log HTTP Response status

            if let httpResponse = response as? HTTPURLResponse {

                self.logger.notice("KFH_LOG: [Extension] API HTTP Status: \(httpResponse.statusCode, privacy: .public)")

            }

            if let error = error {

                self.logger.error("KFH_LOG: [Extension] Network Error: \(error.localizedDescription, privacy: .public)")

                completion([]); return

            }

            // Log Raw JSON for debugging

            if let data = data, let jsonString = String(data: data, encoding: .utf8) {

                self.logger.notice("KFH_LOG: [Extension] Response JSON: \(jsonString, privacy: .public)")

            }

            // Parse JSON using the shared Models

            guard let data = data, let cards = try? JSONDecoder().decode([KFHCardEntry].self, from: data) else {

                self.logger.error("KFH_LOG: [Extension] Parsing Error: Could not decode card list")

                completion([]); return

            }

            // Prepare entries for Apple Wallet UI

            let cardArt = UIImage(named: "kfh_card_art")?.cgImage ?? UIImage().cgImage!

            let entries: [PKIssuerProvisioningExtensionPassEntry] = cards.compactMap { card in

                guard let config = PKAddPaymentPassRequestConfiguration(encryptionScheme: .ECC_V2) else {

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

            self.logger.notice("KFH_LOG: [Extension] Returning \(entries.count, privacy: .public) entries to Apple Wallet")

            completion(entries)

        }.resume()

    }

    // MARK: - Remote Pass Entries (Watch / iCloud)

    override func remotePassEntries(completion: @escaping ([PKIssuerProvisioningExtensionPassEntry]) -> Void) {

        logger.notice("KFH_LOG: [Extension] Remote pass entries requested (Watch/iCloud)")

        self.passEntries(completion: completion)

    }

}
 
