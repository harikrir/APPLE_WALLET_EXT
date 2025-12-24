import Foundation

import PassKit

@objc(KFHWalletPlugin) class KFHWalletPlugin : CDVPlugin {

    // Check if the device/region supports Apple Pay

    @objc(canAddCard:)

    func canAddCard(command: CDVInvokedUrlCommand) {

        let isAvailable = PKAddPaymentPassViewController.canAddPaymentPass()

        let result = CDVPluginResult(status: CDVCommandStatus_OK, messageAs: isAvailable)

        self.commandDelegate.send(result, callbackId: command.callbackId)

    }

    // Triggered by your OutSystems JS 'startProvisioning'

    @objc(startProvisioning:)

    func startProvisioning(command: CDVInvokedUrlCommand) {

        guard let cardId = command.arguments[0] as? String,

              let cardName = command.arguments[1] as? String else {

            let result = CDVPluginResult(status: CDVCommandStatus_ERROR, messageAs: "Invalid Arguments")

            self.commandDelegate.send(result, callbackId: command.callbackId)

            return

        }

        let config = PKAddPaymentPassRequestConfiguration(encryptionScheme: .ECC_V2)

        config?.cardholderName = "KFH Customer"

        config?.primaryAccountSuffix = String(cardId.suffix(4))

        config?.localizedDescription = cardName

        guard let vc = PKAddPaymentPassViewController(requestConfiguration: config!, delegate: self) else {

            let result = CDVPluginResult(status: CDVCommandStatus_ERROR, messageAs: "Could not load Apple UI")

            self.commandDelegate.send(result, callbackId: command.callbackId)

            return

        }

        self.viewController.present(vc, animated: true, completion: nil)

    }

}

// Extension to handle Apple's response logic

extension KFHWalletPlugin: PKAddPaymentPassViewControllerDelegate {

    func addPaymentPassViewController(_ controller: PKAddPaymentPassViewController, generateRequestWithCertificateChain certificates: [Data], nonce: Data, nonceSignature: Data, completionHandler: @escaping (PKAddPaymentPassRequest) -> Void) {

        // This is where you would call your backend to get the encrypted pass data

        // For 'In-App' provisioning, usually handled via your API

    }

    func addPaymentPassViewController(_ controller: PKAddPaymentPassViewController, didFinishWith pass: PKPaymentPass?, error: Error?) {

        controller.dismiss(animated: true, completion: nil)

    }

}
 
