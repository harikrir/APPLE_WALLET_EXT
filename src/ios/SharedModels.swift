import Foundation

// Used by the AUBWalletPlugin for the API response
struct KFHEncryptionResponse: Codable {
    let activationData: String
    let encryptedPassData: String
    let ephemeralPublicKey: String
}

// Used by Extensions to read card data from the App Group
struct ProvisioningCredential: Codable {
    let primaryAccountIdentifier: String
    let label: String
    let cardholderName: String
    let localizedDescription: String
    let primaryAccountSuffix: String
    let expiration: String
    let assetName: String
}

// Global logger helper
class Logger {
    func error(_ msg: String) { print("AUB_ERROR: \(msg)") }
    func warning(_ msg: String) { print("AUB_WARN: \(msg)") }
    func notice(_ msg: String) { print("AUB_NOTICE: \(msg)") }
}
let log = Logger()
