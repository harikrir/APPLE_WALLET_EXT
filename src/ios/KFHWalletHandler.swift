import PassKit
class KFHWalletHandler: PKIssuerProvisioningExtensionHandler {
   let sharedSuite = UserDefaults(suiteName: "group.com.bhuat.wallet")
   override func status(completion: @escaping (PKIssuerProvisioningExtensionStatus) -> Void) {
       let status = PKIssuerProvisioningExtensionStatus()
       status.requiresAuthentication = (sharedSuite?.string(forKey: "KFH_Auth_Token") == nil)
       status.passEntriesAvailable = true
       completion(status)
   }
   override func passEntries(completion: @escaping ([PKIssuerProvisioningExtensionPassEntry]) -> Void) {
       guard let token = sharedSuite?.string(forKey: "KFH_Auth_Token") else {
           completion([]); return
       }
       let url = URL(string: "https://api.kfh.com/v1/wallet/cards")!
       var request = URLRequest(url: url)
       request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
       URLSession.shared.dataTask(with: request) { data, _, _ in
           guard let data = data, let cards = try? JSONDecoder().decode([KFHCard].self, from: data) else {
               completion([]); return
           }
           let entries = cards.map { card in
               return PKIssuerProvisioningExtensionPassEntry(
                   identifier: card.id, title: card.name,
                   art: UIImage(named: "kfh_card_art")!.cgImage!,
                   addRequestConfiguration: PKAddPaymentPassRequestConfiguration(encryptionScheme: .ECC_V2)!
               )
           }
           completion(entries)
       }.resume()
   }
}
struct KFHCard: Codable { let id: String; let name: String }
