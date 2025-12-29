import Foundation

import PassKit

import os.log

@objc(KFHWalletHandler)

class KFHWalletHandler: PKIssuerProvisioningExtensionHandler {

    private let groupID = "group.com.aub.mobilebanking.uat.bh"

    private let logger = OSLog(subsystem: "com.aub.mobilebanking.uat.bh", category: "Extension")

    override func status(completion: @escaping (PKIssuerProvisioningExtensionStatus) -> Void) {

        os_log("KFH_LOG: Status check started", log: logger, type: .info)

        let status = PKIssuerProvisioningExtensionStatus()

        status.passEntriesAvailable = true

        status.remotePassEntriesAvailable = true

        let token = UserDefaults(suiteName: groupID)?.string(forKey: "AUB_Auth_Token")

        status.requiresAuthentication = (token == nil)

        os_log("KFH_LOG: Status auth required: %{public}@", log: logger, type: .info, String(status.requiresAuthentication))

        completion(status)

    }

    override func passEntries(completion: @escaping ([PKIssuerProvisioningExtensionPassEntry]) -> Void) {

        os_log("KFH_LOG: Fetching pass entries...", log: logger, type: .info)

        guard let token = UserDefaults(suiteName: groupID)?.string(forKey: "AUB_Auth_Token") else {

            os_log("KFH_LOG: Error - No token found in App Group", log: logger, type: .error)

            completion([]); return

        }

        var request = URLRequest(url: URL(string: "https://api.aub.com.bh/v1/wallet/cards")!)

        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        URLSession.shared.dataTask(with: request as URLRequest) { [weak self] data, _, error in

            guard let self = self else { return }

            if let error = error {

                os_log("KFH_LOG: API Error: %{public}@", log: self.logger, type: .error, error.localizedDescription)

                completion([]); return

            }

            guard let data = data, let cards = try? JSONDecoder().decode([KFHCardEntry].self, from: data) else {

                os_log("KFH_LOG: Error parsing cards JSON", log: self.logger, type: .error)

                completion([]); return

            }

            let cardArt = UIImage(named: "kfh_card_art")?.cgImage ?? UIImage().cgImage!

            // Fix: Use compactMap to handle potential nil configurations and cast to base class

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

            os_log("KFH_LOG: Returning %d entries to Wallet", log: self.logger, type: .info, entries.count)

            completion(entries)

        }.resume()

    }

    override func remotePassEntries(completion: @escaping ([PKIssuerProvisioningExtensionPassEntry]) -> Void) {

        self.passEntries(completion: completion)

    }

}
 
