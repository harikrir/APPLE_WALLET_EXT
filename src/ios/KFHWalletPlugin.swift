import Foundation

import PassKit

import OSLog

@objc(KFHWalletPlugin)

class KFHWalletPlugin: CDVPlugin, PKAddPaymentPassViewControllerDelegate {

    private let logger = Logger(

        subsystem: "com.aub.mobilebanking.uat.bh",

        category: "ApplePay"

    )

    private let groupID = "group.com.aub.mobilebanking.uat.bh"

    private var currentCallbackId: String?

    // MARK: - Token

    @objc(setAuthToken:)

    func setAuthToken(command: CDVInvokedUrlCommand) {

        let token = command.arguments.first as? String

        UserDefaults(suiteName: groupID)?.set(token, forKey: "AUB_Auth_Token")

        logger.notice("Auth token stored")

        commandDelegate.send(

            CDVPluginResult(status: CDVCommandStatus_OK),

            callbackId: command.callbackId

        )

    }

    // MARK: - Start Wallet UI

    @objc(startProvisioning:)

    func startProvisioning(command: CDVInvokedUrlCommand) {

        currentCallbackId = command.callbackId

        guard

            let cardId = command.arguments[0] as? String,

            let cardName = command.arguments[1] as? String

        else {

            sendError("Invalid arguments")

            return

        }

        guard PKAddPaymentPassViewController.canAddPaymentPass() else {

            sendError("Apple Pay not supported")

            return

        }

        let config = PKAddPaymentPassRequestConfiguration(encryptionScheme: .ECC_V2)!

        config.cardholderName = "KFH Customer"

        config.primaryAccountSuffix = String(cardId.suffix(4))

        config.localizedDescription = cardName

        UserDefaults(suiteName: groupID)?.set(cardId, forKey: "ACTIVE_CARD_ID")

        guard let vc = PKAddPaymentPassViewController(

            requestConfiguration: config,

            delegate: self

        ) else {

            sendError("Wallet UI init failed")

            return

        }

        viewController.present(vc, animated: true)

    }

    // MARK: - Encryption Handshake

    func addPaymentPassViewController(

        _ controller: PKAddPaymentPassViewController,

        generateRequestWithCertificateChain certificates: [Data],

        nonce: Data,

        nonceSignature: Data,

        completionHandler: @escaping (PKAddPaymentPassRequest) -> Void

    ) {

        guard

            let token = UserDefaults(suiteName: groupID)?

                .string(forKey: "AUB_Auth_Token"),

            let cardId = UserDefaults(suiteName: groupID)?

                .string(forKey: "ACTIVE_CARD_ID")

        else {

            controller.dismiss(animated: true)

            return

        }

        let payload: [String: Any] = [

            "cardId": cardId,

            "certificates": certificates.map { $0.base64EncodedString() },

            "nonce": nonce.base64EncodedString(),

            "nonceSignature": nonceSignature.base64EncodedString()

        ]

        var request = URLRequest(

            url: URL(string: "https://api.aub.com.bh/v1/wallet/encrypt")!

        )

        request.httpMethod = "POST"

        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        request.httpBody = try? JSONSerialization.data(withJSONObject: payload)

        URLSession.shared.dataTask(with: request) { data, _, _ in

            guard

                let data = data,

                let response = try? JSONDecoder()

                    .decode(KFHEncryptionResponse.self, from: data)

            else {

                DispatchQueue.main.async {

                    controller.dismiss(animated: true)

                }

                return

            }

            let addRequest = PKAddPaymentPassRequest()

            addRequest.activationData = Data(base64Encoded: response.activationData)

            addRequest.encryptedPassData = Data(base64Encoded: response.encryptedPassData)

            addRequest.ephemeralPublicKey = Data(base64Encoded: response.ephemeralPublicKey)

            DispatchQueue.main.async {

                completionHandler(addRequest)

            }

        }.resume()

    }

    // MARK: - Completion

    func addPaymentPassViewController(

        _ controller: PKAddPaymentPassViewController,

        didFinishAdding pass: PKPaymentPass?,

        error: Error?

    ) {

        controller.dismiss(animated: true) {

            let status: CDVCommandStatus =

                (pass != nil && error == nil) ? .OK : .ERROR

            self.commandDelegate.send(

                CDVPluginResult(status: status),

                callbackId: self.currentCallbackId

            )

        }

    }

    // MARK: - Helpers

    private func sendError(_ message: String) {

        commandDelegate.send(

            CDVPluginResult(status: .ERROR, messageAs: message),

            callbackId: currentCallbackId

        )

    }

}
 
