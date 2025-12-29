import Foundation

import PassKit

import OSLog

@objc(KFHWalletPlugin)

class KFHWalletPlugin : CDVPlugin, PKAddPaymentPassViewControllerDelegate {

    var currentCallbackId: String?

    private let logger = Logger(subsystem: "com.aub.mobilebanking.uat.bh", category: "Plugin")

    private let groupID = "group.com.aub.mobilebanking.uat.bh"

    @objc(setAuthToken:)

    func setAuthToken(command: CDVInvokedUrlCommand) {

        let token = command.arguments[0] as? String ?? "NIL"

        UserDefaults(suiteName: groupID)?.set(token, forKey: "AUB_Auth_Token")

        // Using .notice and privacy: .public ensures this is visible in Mac Console

        logger.notice("KFH_LOG: [Plugin] Auth token saved: \(token, privacy: .public)")

        self.commandDelegate.send(CDVPluginResult(status: CDVCommandStatus_OK), callbackId: command.callbackId)

    }

    @objc(startProvisioning:)

    func startProvisioning(command: CDVInvokedUrlCommand) {

        self.currentCallbackId = command.callbackId

        guard let cardId = command.arguments[0] as? String,

              let cardName = command.arguments[1] as? String else {

            logger.error("KFH_LOG: [Plugin] Error - Missing startProvisioning arguments")

            return

        }

        logger.notice("KFH_LOG: [Plugin] Starting UI for card: \(cardName, privacy: .public)")

        guard PKAddPaymentPassViewController.canAddPaymentPass() else {

            logger.error("KFH_LOG: [Plugin] Error - Device/Region not supported for Apple Pay")

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

        } else {

            logger.error("KFH_LOG: [Plugin] Error - Failed to initialize PKAddPaymentPassViewController (Check Entitlements)")

        }

    }

    // This method is called by Apple when it's time to encrypt the card data

    func addPaymentPassViewController(_ controller: PKAddPaymentPassViewController, generateRequestWithCertificateChain certificates: [Data], nonce: Data, nonceSignature: Data, completionHandler: @escaping (PKAddPaymentPassRequest) -> Void) {

        logger.notice("KFH_LOG: [Plugin] Encryption request triggered by Apple")

        guard let token = UserDefaults(suiteName: groupID)?.string(forKey: "AUB_Auth_Token"),

              let cardId = UserDefaults(suiteName: groupID)?.string(forKey: "ACTIVE_CARD_ID") else {

            logger.error("KFH_LOG: [Plugin] Error - Missing token or cardId in App Group")

            completionHandler(PKAddPaymentPassRequest()); return

        }

        let body: [String: Any] = [

            "cardId": cardId,

            "certificates": certificates.map { $0.base64EncodedString() },

            "nonce": nonce.base64EncodedString(),

            "nonceSignature": nonceSignature.base64EncodedString()

        ]

        let urlString = "https://api.aub.com.bh/v1/wallet/encrypt"

        var request = URLRequest(url: URL(string: urlString)!)

        request.httpMethod = "POST"

        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        request.httpBody = try? JSONSerialization.data(withJSONObject: body)

        // Log the Request Details

        if let bodyData = request.httpBody, let bodyString = String(data: bodyData, encoding: .utf8) {

            logger.notice("KFH_LOG: [Plugin] POST \(urlString, privacy: .public)")

            logger.notice("KFH_LOG: [Plugin] Request Body: \(bodyString, privacy: .public)")

        }

        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in

            guard let self = self else { return }

            let addRequest = PKAddPaymentPassRequest()

            if let httpResponse = response as? HTTPURLResponse {

                self.logger.notice("KFH_LOG: [Plugin] Encryption API Status: \(httpResponse.statusCode, privacy: .public)")

            }

            if let data = data, let jsonStr = String(data: data, encoding: .utf8) {

                self.logger.notice("KFH_LOG: [Plugin] Encryption API Response: \(jsonStr, privacy: .public)")

            }

            if let data = data, let res = try? JSONDecoder().decode(KFHEncryptionResponse.self, from: data) {

                addRequest.encryptedPassData = Data(base64Encoded: res.encryptedPassData)

                addRequest.activationData = Data(base64Encoded: res.activationData)

                addRequest.ephemeralPublicKey = Data(base64Encoded: res.ephemeralPublicKey)

                self.logger.notice("KFH_LOG: [Plugin] Successfully prepared PKAddPaymentPassRequest")

            } else {

                self.logger.error("KFH_LOG: [Plugin] Error - Failed to parse encryption response")

            }

            completionHandler(addRequest)

        }.resume()

    }

    func addPaymentPassViewController(_ controller: PKAddPaymentPassViewController, didFinishAdding pass: PKPaymentPass?, error: Error?) {

        if let error = error {

            logger.error("KFH_LOG: [Plugin] Flow finished with error: \(error.localizedDescription, privacy: .public)")

        } else {

            logger.notice("KFH_LOG: [Plugin] Flow finished successfully. Card added: \(pass != nil, privacy: .public)")

        }

        controller.dismiss(animated: true) {

            let status = (pass != nil) ? CDVCommandStatus_OK : CDVCommandStatus_ERROR

            self.commandDelegate.send(CDVPluginResult(status: status), callbackId: self.currentCallbackId)

        }

    }

}
 
