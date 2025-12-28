import PassKit
class KFHWalletHandler: PKIssuerProvisioningExtensionHandler {
   let sharedSuite = UserDefaults(suiteName: "group.com.aub.mobilebanking.uat.bh")
   override func status(completion: @escaping (PKIssuerProvisioningExtensionStatus) -> Void) {
       let status = PKIssuerProvisioningExtensionStatus()
       let token = sharedSuite?.string(forKey: "AUB_Auth_Token")
       status.requiresAuthentication = (token == nil)
       status.passEntriesAvailable = true
       completion(status)
   }
   override func passEntries(completion: @escaping ([PKIssuerProvisioningExtensionPassEntry]) -> Void) {
       guard let token = sharedSuite?.string(forKey: "AUB_Auth_Token") else { completion([]); return }
       // API Call to get card list
       var request = URLRequest(url: URL(string: "https://api.aub.com.bh/v1/wallet/cards")!)
       request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
       URLSession.shared.dataTask(with: request) { data, _, _ in
           guard let data = data, let cards = try? JSONDecoder().decode([KFHCard].self, from: data) else {
               completion([]); return
           }
           let entries = cards.compactMap { card in
               PKIssuerProvisioningExtensionPaymentPassEntry(
                   identifier: card.id,
                   title: card.name,
                   art: UIImage(named: "kfh_card_art")?.cgImage ?? UIImage().cgImage!,
                   addRequestConfiguration: PKAddPaymentPassRequestConfiguration(encryptionScheme: .ECC_V2)!
               )
           }
           completion(entries)
       }.resume()
   }
   override func generateAddPaymentPassRequest(forPassEntryWithIdentifier identifier: String, configuration: PKAddPaymentPassRequestConfiguration, certificateChain: [Data], nonce: Data, nonceSignature: Data, completionHandler: @escaping (PKAddPaymentPassRequest?) -> Void) {
       // Logic same as Plugin Delegate above, pointing to /v1/wallet/encrypt
   }
}
struct KFHCard: Codable { let id: String; let name: String }
struct KFHEncryptionResponse: Codable {
   let encryptedPassData, activationData, ephemeralPublicKey: String
}
