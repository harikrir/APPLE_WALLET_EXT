import PassKit

class WNonUIExtHandler: PKIssuerProvisioningExtensionHandler {
    private let groupID = "group.com.aub.mobilebanking.uat.bh"

    override func status(completion: @escaping (PKIssuerProvisioningExtensionStatus) -> Void) {
        AUBLog.nonUI.info("Checking extension status...")
        let status = PKIssuerProvisioningExtensionStatus()
        status.requiresUnlock = true
        status.passEntriesAvailable = true // Tell Wallet we have a card
        completion(status)
    }

    override func passEntries(completion: @escaping ([PKIssuerProvisioningExtensionPassEntry]) -> Void) {
        let cardId = UserDefaults(suiteName: groupID)?.string(forKey: "ACTIVE_CARD_ID") ?? "AUB_CARD"
        AUBLog.nonUI.info("Providing pass entries for: \(cardId)")

        let entry = PKIssuerProvisioningExtensionPassEntry(
            identifier: cardId,
            title: "AUB Visa",
            art: UIImage(named: "kfh_card_art")!.cgImage!,
            addRequestConfiguration: PKAddPaymentPassRequestConfiguration(encryptionScheme: .ECC_V2)!
        )
        completion([entry])
    }
}
