import Foundation

import PassKit

import OSLog // Modern logging framework

@objc(KFHWalletHandler)

class KFHWalletHandler: PKIssuerProvisioningExtensionHandler {

    private let groupID = "group.com.aub.mobilebanking.uat.bh"

    // Use Logger instead of OSLog for better Swift support

    private let logger = Logger(subsystem: "com.aub.mobilebanking.uat.bh", category: "Extension")

    override func status(completion: @escaping (PKIssuerProvisioningExtensionStatus) -> Void) {

        // Use .notice or .error level so the log isn't discarded by MABS/iOS

        logger.notice("KFH_LOG: Status check started")

        let status = PKIssuerProvisioningExtensionStatus()

        status.passEntriesAvailable = true

        status.remotePassEntriesAvailable = true

        let token = UserDefaults(suiteName: groupID)?.string(forKey: "AUB_Auth_Token")

        status.requiresAuthentication = (token == nil)

        // Use privacy: .public so the actual value shows in Console.app

        logger.notice("KFH_LOG: Status auth required: \(status.requiresAuthentication, privacy: .public)")

        completion(status)

    }

    override func passEntries(completion: @escaping ([PKIssuerProvisioningExtensionPassEntry]) -> Void) {

        logger.notice("KFH_LOG: Fetching pass entries...")

        guard let token = UserDefaults(suiteName: groupID)?.string(forKey: "AUB_Auth_Token") else {

            logger.error("KFH_LOG: Error - No token found in App Group")

            completion([]); return

        }

        var request = URLRequest(url: URL(string: "https://api.aub.com.bh/v1/wallet/cards")!)

        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        URLSession.shared.dataTask(with: request as URLRequest) { [weak self] data, _, error in

            guard let self = self else { return }

            if let error = error {

                self.logger.error("KFH_LOG: API Error: \(error.localizedDescription, privacy: .public)")

                completion([]); return

            }

            guard let data = data, let cards = try? JSONDecoder().decode([KFHCardEntry].self, from: data) else {

                self.logger.error("KFH_LOG: Error parsing cards JSON")

                completion([]); return

            }

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

            self.logger.notice("KFH_LOG: Returning \(entries.count, privacy: .public) entries to Wallet")

            completion(entries)

        }.resume()

    }

    override func remotePassEntries(completion: @escaping ([PKIssuerProvisioningExtensionPassEntry]) -> Void) {

        self.passEntries(completion: completion)

    }

}
 
