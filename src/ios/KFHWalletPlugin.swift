import Foundation

import PassKit

import OSLog // Modern logging framework

@objc(KFHWalletPlugin)

class KFHWalletPlugin : CDVPlugin, PKAddPaymentPassViewControllerDelegate {

    var currentCallbackId: String?

    // Create a Logger instance instead of OSLog for better Swift integration

    private let logger = Logger(subsystem: "com.aub.mobilebanking.uat.bh", category: "Plugin")

    private let groupID = "group.com.aub.mobilebanking.uat.bh"

    @objc(setAuthToken:)

    func setAuthToken(command: CDVInvokedUrlCommand) {

        // Handle optional safely

        let token = command.arguments[0] as? String ?? "NIL"

        UserDefaults(suiteName: groupID)?.set(token, forKey: "AUB_Auth_Token")

        // Use privacy: .public to ensure you can see the token in Console.app

        // Use .notice or .error level to ensure visibility in release builds

        logger.notice("KFH_LOG: Auth token synchronized for token: \(token, privacy: .public)")

        self.commandDelegate.send(CDVPluginResult(status: CDVCommandStatus_OK), callbackId: command.callbackId)

    }

    @objc(startProvisioning:)

    func startProvisioning(command: CDVInvokedUrlCommand) {

        self.currentCallbackId = command.callbackId

        guard let cardId = command.arguments[0] as? String,

              let cardName = command.arguments[1] as? String else { 

            logger.error("KFH_LOG: Missing arguments in startProvisioning")

            return 

        }

        logger.notice("KFH_LOG: Starting provisioning for Card: \(cardName, privacy: .public)")

        guard PKAddPaymentPassViewController.canAddPaymentPass() else {

            logger.error("KFH_LOG: Device does not support Apple Pay provisioning")

            self.commandDelegate.send(CDVPluginResult(status: CDVCommandStatus_ERROR, messageAs: "Unsupported"), callbackId: self.currentCallbackId)

            return

        }

        let config = PKAddPaymentPassRequestConfiguration(encryptionScheme: .ECC_V2)

        config?.cardholderName = "KFH Customer"

        config?.primaryAccountSuffix = String(cardId.suffix(4))

        config?.localizedDescription = cardName

        UserDefaults(suiteName: groupID)?.set(cardId, forKey: "ACTIVE_CARD_ID")

        if let configData = config, let vc = PKAddPaymentPassViewController(requestConfiguration: configData, delegate: self) {

            self.viewController.present(vc, animated: true)

        }

    }

    func addPaymentPassViewController(_ controller: PKAddPaymentPassViewController, generateRequestWithCertificateChain certificates: [Data], nonce: Data, nonceSignature: Data, completionHandler: @escaping (PKAddPaymentPassRequest) -> Void) {

        logger.notice("KFH_LOG: Apple requested encryption keys")

        guard let token = UserDefaults(suiteName: groupID)?.string(forKey: "AUB_Auth_Token"),

              let cardId = UserDefaults(suiteName: groupID)?.string(forKey: "ACTIVE_CARD_ID") else {

            logger.error("KFH_LOG: Failed to retrieve Token or CardID from App Group")

            completionHandler(PKAddPaymentPassRequest()); return

        }

        let body: [String: Any] = [

            "cardId": cardId,

            "certificates": certificates.map { $0.base64EncodedString() },

            "nonce": nonce.base64EncodedString(),

            "nonceSignature": nonceSignature.base64EncodedString()

        ]

        var request = URLRequest(url: URL(string: "https://api.aub.com.bh/v1/wallet/encrypt")!)

        request.httpMethod = "POST"

        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        request.httpBody = try? JSONSerialization.data(withJSONObject: body)

        URLSession.shared.dataTask(with: request as URLRequest) { [weak self] data, _, error in

            guard let self = self else { return }

            let addRequest = PKAddPaymentPassRequest()

            if let error = error {

                self.logger.error("KFH_LOG: Network Error: \(error.localizedDescription, privacy: .public)")

            }

            if let data = data, let res = try? JSONDecoder().decode(KFHEncryptionResponse.self, from: data) {

                addRequest.encryptedPassData = Data(base64Encoded: res.encryptedPassData)

                addRequest.activationData = Data(base64Encoded: res.activationData)

                addRequest.ephemeralPublicKey = Data(base64Encoded: res.ephemeralPublicKey)

                self.logger.notice("KFH_LOG: Successfully received encrypted payload from KFH API")

            } else {

                self.logger.error("KFH_LOG: Failed to parse encryption response")

            }

            completionHandler(addRequest)

        }.resume()

    }

    func addPaymentPassViewController(_ controller: PKAddPaymentPassViewController, didFinishAdding pass: PKPaymentPass?, error: Error?) {

        if let error = error {

            logger.error("KFH_LOG: Finished with error: \(error.localizedDescription, privacy: .public)")

        } else {

            logger.notice("KFH_LOG: Finished successfully. Pass added: \(pass != nil)")

        }

        controller.dismiss(animated: true) {

            let status = (pass != nil) ? CDVCommandStatus_OK : CDVCommandStatus_ERROR

            self.commandDelegate.send(CDVPluginResult(status: status), callbackId: self.currentCallbackId)

        }

    }

}
 
