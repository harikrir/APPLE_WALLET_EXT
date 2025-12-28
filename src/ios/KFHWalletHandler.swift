import Foundation

import PassKit

class KFHWalletHandler: PKIssuerProvisioningExtensionHandler {

    // Use a lazy-loaded URLSession to keep memory usage low

    private lazy var session: URLSession = {

        let config = URLSessionConfiguration.default

        config.timeoutIntervalForRequest = 15.0 // Apple timeout is 20s; we fail earlier to handle it gracefully

        return URLSession(configuration: config)

    }()

    let sharedSuite = UserDefaults(suiteName: "group.com.aub.mobilebanking.uat.bh")

    // MARK: - 1. Status Check

    override func status(completion: @escaping (PKIssuerProvisioningExtensionStatus) -> Void) {

        let status = PKIssuerProvisioningExtensionStatus()

        let token = sharedSuite?.string(forKey: "AUB_Auth_Token")

        // If no token, Wallet will trigger the KFHUIHandler for login

        status.requiresAuthentication = (token == nil)

        status.passEntriesAvailable = true

        completion(status)

    }

    // MARK: - 2. Remote Pass Entries (For Apple Watch)

    // IMPORTANT: You must implement this if you want cards to show for the paired Watch.

    override func remotePassEntries(completion: @escaping ([PKIssuerProvisioningExtensionPassEntry]) -> Void) {

        self.passEntries(completion: completion)

    }

    // MARK: - 3. Local Pass Entries (For iPhone)

    override func passEntries(completion: @escaping ([PKIssuerProvisioningExtensionPassEntry]) -> Void) {

        guard let token = sharedSuite?.string(forKey: "AUB_Auth_Token") else {

            completion([]); return

        }

        let url = URL(string: "https://api.aub.com.bh/v1/wallet/cards")!

        var request = URLRequest(url: url)

        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        session.dataTask(with: request) { data, _, error in

            guard error == nil, let data = data,

                  let cards = try? JSONDecoder().decode([KFHCard].self, from: data) else {

                completion([]); return

            }

            // Optimization: Load image once, not inside the loop

            let cardArt = UIImage(named: "kfh_card_art")?.cgImage

            let entries = cards.compactMap { card -> PKIssuerProvisioningExtensionPassEntry? in

                guard let cgImage = cardArt else { return nil }

                return PKIssuerProvisioningExtensionPassEntry(

                    identifier: card.id,

                    title: card.name,

                    art: cgImage,

                    addRequestConfiguration: PKAddPaymentPassRequestConfiguration(encryptionScheme: .ECC_V2)!

                )

            }

            completion(entries)

        }.resume()

    }

    // MARK: - 4. Generate Request (The Handshake)

    override func generateAddPaymentPassRequest(forPassEntryWithIdentifier identifier: String, configuration: PKAddPaymentPassRequestConfiguration, certificateChain: [Data], nonce: Data, nonceSignature: Data, completionHandler: @escaping (PKAddPaymentPassRequest?) -> Void) {

        guard let token = sharedSuite?.string(forKey: "AUB_Auth_Token") else {

            completionHandler(nil); return

        }

        // Standard Payload for Visa/Mastercard TSPs

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

        session.dataTask(with: request) { data, _, error in

            guard error == nil, let data = data,

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
 
