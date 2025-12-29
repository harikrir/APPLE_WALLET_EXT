import Foundation
import PassKit

/**
 This model matches the decoding logic in your WNonUIExtHandler.
 It defines the structure for cards stored in the App Group.
 */
struct ProvisioningCredential: Codable {
    let primaryAccountIdentifier: String
    let label: String
    let cardholderName: String
    let localizedDescription: String
    let primaryAccountSuffix: String
    let expiration: String
    let assetName: String
}

/**
 This class handles the communication with your bank's server.
 It is used during the background 'Add to Wallet' request from the extension.
 */
class PassResource {
    static func requestPaymentPassData(_ config: PKAddPaymentPassRequestConfiguration, 
                                       certificateChain: [Data], 
                                       nonce: Data, 
                                       nonceSignature: Data) -> EncryptedPassDataResponse {
        
        // This is a placeholder for your actual encryption API call.
        // In a production app, this would perform a URLSession request to your backend.
        return EncryptedPassDataResponse(activationData: Data(), 
                                         encryptedPassData: Data(), 
                                         ephemeralPublicKey: Data())
    }
}

/**
 Data structure returned by your server to complete the Apple Pay handshake.
 */
struct EncryptedPassDataResponse {
    let activationData: Data
    let encryptedPassData: Data
    let ephemeralPublicKey: Data
}

/**
 Used to check if an Apple Watch is paired to the iPhone.
 */
class WatchConnectivitySession {
    var isPaired: Bool = true
}

/**
 Logger helper used throughout your extensions.
 */
class Logger {
    func error(_ msg: String) { print("AUB_ERROR: \(msg)") }
    func warning(_ msg: String) { print("AUB_WARN: \(msg)") }
    func notice(_ msg: String) { print("AUB_NOTICE: \(msg)") }
}
let log = Logger()
