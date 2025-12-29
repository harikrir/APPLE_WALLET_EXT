import Foundation
import PassKit
import OSLog

@objc(AUBWalletPlugin)
class AUBWalletPlugin: CDVPlugin, PKAddPaymentPassViewControllerDelegate {
    private let groupID = "group.com.aub.mobilebanking.uat.bh"
    private var currentCallbackId: String?

    @objc(setAuthToken:)
    func setAuthToken(command: CDVInvokedUrlCommand) {
        let token = command.arguments.first as? String
        UserDefaults(suiteName: groupID)?.set(token, forKey: "AUB_Auth_Token")
        commandDelegate.send(CDVPluginResult(status: .OK), callbackId: command.callbackId)
    }

    @objc(startProvisioning:)
    func startProvisioning(command: CDVInvokedUrlCommand) {
        currentCallbackId = command.callbackId
        guard let cardId = command.arguments[0] as? String,
              let cardName = command.arguments[1] as? String else { return }

        let config = PKAddPaymentPassRequestConfiguration(encryptionScheme: .ECC_V2)!
        config.cardholderName = "AUB Customer"
        config.primaryAccountSuffix = String(cardId.suffix(4))
        config.localizedDescription = cardName
        
        UserDefaults(suiteName: groupID)?.set(cardId, forKey: "ACTIVE_CARD_ID")

        let vc = PKAddPaymentPassViewController(requestConfiguration: config, delegate: self)!
        viewController.present(vc, animated: true)
    }

    func addPaymentPassViewController(_ controller: PKAddPaymentPassViewController, generateRequestWithCertificateChain certificates: [Data], nonce: Data, nonceSignature: Data, completionHandler: @escaping (PKAddPaymentPassRequest) -> Void) {
        // ... (Insert the URLSession logic provided in your previous snippet here)
    }

    func addPaymentPassViewController(_ controller: PKAddPaymentPassViewController, didFinishAdding pass: PKPaymentPass?, error: Error?) {
        controller.dismiss(animated: true) {
            let status: CDVCommandStatus = (pass != nil && error == nil) ? .OK : .ERROR
            self.commandDelegate.send(CDVPluginResult(status: status), callbackId: self.currentCallbackId)
        }
    }
}
