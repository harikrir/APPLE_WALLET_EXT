import Foundation
// MARK: - Card List Model
public struct KFHCardEntry: Codable {
   public let id: String
   public let name: String
   public let last4: String
   // Required: Public structs need a public init to be created in other modules
   public init(id: String, name: String, last4: String) {
self.id = id
       self.name = name
       self.last4 = last4
   }
}
// MARK: - Encryption Response Model
public struct KFHEncryptionResponse: Codable {
   public let encryptedPassData: String
   public let activationData: String
   public let ephemeralPublicKey: String
   public init(encryptedPassData: String, activationData: String, ephemeralPublicKey: String) {
       self.encryptedPassData = encryptedPassData
       self.activationData = activationData
       self.ephemeralPublicKey = ephemeralPublicKey
   }
}
