import Foundation

import PassKit

import os.log

@objc(KFHWalletHandler)

class KFHWalletHandler: PKIssuerProvisioningExtensionHandler {

    private let logger = OSLog(subsystem: "com.aub.mobilebanking.uat.bh", category: "WalletExtension")

    private let groupID = "group.com.aub.mobilebanking.uat.bh"

    // MARK: - 1. Status (MUST BE < 100ms)

    override func status(completion: @escaping (PKIssuerProvisioningExtensionStatus) -> Void) {

        os_log("KFH_EXT: [STATUS] Called by Wallet App", log: logger, type: .info)

        let status = PKIssuerProvisioningExtensionStatus()

        status.passEntriesAvailable = true

        status.remotePassEntriesAvailable = true

        // We check token presence, but we DON'T do networking here.

        let suite = UserDefaults(suiteName: groupID)

        if suite == nil {

            os_log("KFH_EXT: [ERROR] Shared Suite is NIL. Entitlements failed.", log: logger, type: .error)

        }

        let token = suite?.string(forKey: "AUB_Auth_Token")

        status.requiresAuthentication = (token == nil)

        os_log("KFH_EXT: [STATUS] Completed. Auth Req: %{public}b", log: logger, type: .info, status.requiresAuthentication)

        completion(status)

    }

    // MARK: - 3. Pass Entries (Fetch Card List)

    override func passEntries(completion: @escaping ([PKIssuerProvisioningExtensionPassEntry]) -> Void) {

        os_log("KFH_EXT: [ENTRIES] Fetching cards from API...", log: logger, type: .info)

        guard let token = UserDefaults(suiteName: groupID)?.string(forKey: "AUB_Auth_Token") else {

            os_log("KFH_EXT: [ABORT] No token found in shared storage", log: logger, type: .error)

            completion([]); return

        }

        let url = URL(string: "https://api.aub.com.bh/v1/wallet/cards")!

        var request = URLRequest(url: url)

        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        request.timeoutInterval = 15.0

        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in

            guard let self = self else { return }

            if let error = error {

                os_log("KFH_EXT: [API] Error: %{public}@", log: self.logger, type: .error, error.localizedDescription)

                completion([]); return

            }

            guard let data = data else {

                os_log("KFH_EXT: [API] No data received", log: self.logger, type: .error)

                completion([]); return

            }

            do {

                let cards = try JSONDecoder().decode([KFHCardEntry].self, from: data)

                os_log("KFH_EXT: [API] Found %{public}d cards", log: self.logger, type: .info, cards.count)

                let cardArt = UIImage(named: "kfh_card_art")?.cgImage

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

                os_log("KFH_EXT: [PARSE] JSON decoding failed", log: self.logger, type: .error)

                completion([])

            }

        }.resume()

    }

    override func remotePassEntries(completion: @escaping ([PKIssuerProvisioningExtensionPassEntry]) -> Void) {

        self.passEntries(completion: completion)

    }

}
 
