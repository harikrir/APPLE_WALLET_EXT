import Foundation

struct KFHEncryptionResponse: Codable {
    let activationData: String
    let encryptedPassData: String
    let ephemeralPublicKey: String
}

struct ProvisioningCredential: Codable {
    let primaryAccountIdentifier: String
    let label: String
    let cardholderName: String
    let localizedDescription: String
    let primaryAccountSuffix: String
    let expiration: String
    let assetName: String
}

class WatchConnectivitySession {
    var isPaired: Bool = true // Simplified for extension logic
}

class Logger {
    func error(_ m: String) { print("ERR: \(m)") }
    func notice(_ m: String) { print("NOT: \(m)") }
    func warning(_ m: String) { print("WRN: \(m)") }
}
let log = Logger()
