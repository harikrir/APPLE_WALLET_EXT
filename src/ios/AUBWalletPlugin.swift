import Foundation
import PassKit
import OSLog

@objc(AUBWalletPlugin)
class AUBWalletPlugin: CDVPlugin, PKAddPaymentPassViewControllerDelegate {
    private let groupID = "group.com.aub.mobilebanking.uat.bh"
    private var currentCallbackId: String?

    // Set the Auth Token from OutSystems for API calls
    @objc(setAuthToken:)
    func setAuthToken(command: CDVInvokedUrlCommand) {
        let token = command.arguments.first as? String
        UserDefaults(suiteName: groupID)?.set(token, forKey: "AUB_Auth_Token")
        self.commandDelegate.send(CDVPluginResult(status: .OK), callbackId: command.callbackId)
    }

    // Trigger the Apple Pay "Add Card" UI
    @objc(startProvisioning:)
    func startProvisioning(command: CDVInvokedUrlCommand) {
        currentCallbackId = command.callbackId
        
        guard let cardId = command.arguments[0] as? String,
              let cardName = command.arguments[1] as? String else {
            self.commandDelegate.send(CDVPluginResult(status: .ERROR, messageAs: "Invalid Arguments"), callbackId: command.callbackId)
            return
        }

        // 1. Configure the request
        guard let config = PKAddPaymentPassRequestConfiguration(encryptionScheme: .ECC_V2) else {
            self.commandDelegate.send(CDVPluginResult(status: .ERROR, messageAs: "ECC_V2 not supported"), callbackId: command.callbackId)
            return
        }
        
        config.cardholderName = "AUB Customer"
        config.primaryAccountSuffix = String(cardId.suffix(4))
        config.localizedDescription = cardName
        
        // Save state for the delegate to use
        UserDefaults(suiteName: groupID)?.set(cardId, forKey: "ACTIVE_CARD_ID")

        // 2. Present the Apple-managed View Controller
        guard let vc = PKAddPaymentPassViewController(requestConfiguration: config, delegate: self) else {
            self.commandDelegate.send(CDVPluginResult(status: .ERROR, messageAs: "Could not create PKAddPaymentPassViewController"), callbackId: command.callbackId)
            return
        }
        
        self.viewController.present(vc, animated: true)
    }

    // MARK: - PKAddPaymentPassViewControllerDelegate

    func addPaymentPassViewController(_ controller: PKAddPaymentPassViewController, generateRequestWithCertificateChain certificates: [Data], nonce: Data, nonceSignature: Data, completionHandler: @escaping (PKAddPaymentPassRequest) -> Void) {
        
        // Base64 encode the data to send to your backend
        let certChainBase64 = certificates.map { $0.base64EncodedString() }
        let nonceBase64 = nonce.base64EncodedString()
        let nonceSignatureBase64 = nonceSignature.base64EncodedString()
        let cardId = UserDefaults(suiteName: groupID)?.string(forKey: "ACTIVE_CARD_ID") ?? ""
        let authToken = UserDefaults(suiteName: groupID)?.string(forKey: "AUB_Auth_Token") ?? ""

        // 3. Prepare the API Request to AUB/KFH Server
        let requestUrl = URL(string: "https://api.aub.com.bh/v1/wallet/provision")!
        var request = URLRequest(url: requestUrl)
        request.httpMethod = "POST"
        request.setValue("Bearer \(authToken)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body: [String: Any] = [
            "cardId": cardId,
            "certificates": certChainBase64,
            "nonce": nonceBase64,
            "nonceSignature": nonceSignatureBase64
        ]
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)

        // 4. Perform the Handshake
        URLSession.shared.dataTask(with: request) { data, response, error in
            guard let data = data, error == nil else { return }
            
            // Assuming your backend returns EncryptedPassDataResponse
            if let apiResponse = try? JSONDecoder().decode(KFHEncryptionResponse.self, from: data) {
                let addRequest = PKAddPaymentPassRequest()
                addRequest.activationData = Data(base64Encoded: apiResponse.activationData)
                addRequest.encryptedPassData = Data(base64Encoded: apiResponse.encryptedPassData)
                addRequest.ephemeralPublicKey = Data(base64Encoded: apiResponse.ephemeralPublicKey)
                
                // 5. Pass data back to Apple to finish the process
                completionHandler(addRequest)
            }
        }.resume()
    }

    func addPaymentPassViewController(_ controller: PKAddPaymentPassViewController, didFinishAdding pass: PKPaymentPass?, error: Error?) {
        controller.dismiss(animated: true) {
            if let error = error {
                print("Provisioning Error: \(error.localizedDescription)")
                self.commandDelegate.send(CDVPluginResult(status: .ERROR, messageAs: error.localizedDescription), callbackId: self.currentCallbackId)
            } else {
                self.commandDelegate.send(CDVPluginResult(status: .OK), callbackId: self.currentCallbackId)
            }
        }
    }
}
