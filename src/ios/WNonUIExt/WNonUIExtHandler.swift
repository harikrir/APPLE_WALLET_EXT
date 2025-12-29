import PassKit

class WNonUIExtHandler: PKIssuerProvisioningExtensionHandler {
    
    override func status(completion: @escaping (PKIssuerProvisioningExtensionStatus) -> Void) {
        let status = PKIssuerProvisioningExtensionStatus()
        status.requiresUnlock = true
        // If a card ID exists in shared storage, show it in Wallet
        status.passEntriesAvailable = AppGroupManager.shared.getActiveCard() != nil
        completion(status)
    }

    override func passEntries(completion: @escaping ([PKIssuerProvisioningExtensionPassEntry]) -> Void) {
        guard let cardId = AppGroupManager.shared.getActiveCard() else {
            completion([])
            return
        }

        let config = PKAddPaymentPassRequestConfiguration(encryptionScheme: .ECC_V2)!
        config.primaryAccountSuffix = String(cardId.suffix(4))
        
        let entry = PKIssuerProvisioningExtensionPassEntry(
            identifier: cardId,
            title: "AUB Visa Card",
            art: UIImage(named: "kfh_card_art")!.cgImage!,
            addRequestConfiguration: config
        )
        
        completion([entry])
    }
}
