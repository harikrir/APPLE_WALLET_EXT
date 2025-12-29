import Foundation
struct KFHEncryptionResponse: Codable {
   let encryptedPassData: String
   let activationData: String
   let ephemeralPublicKey: String
}
struct KFHCardEntry: Codable {
   let id: String
   let name: String
   let last4: String
}
