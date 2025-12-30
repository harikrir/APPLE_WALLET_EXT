import PassKit

class WNonUIExtHandler: PKIssuerProvisioningExtensionHandler {
    
    // 1. Status check: Determines if Apple Wallet should show your app's cards
    override func status(completion: @escaping (PKIssuerProvisioningExtensionStatus) -> Void) {
        AUBLog.nonUI.info("Checking extension status...")
        
        let status = PKIssuerProvisioningExtensionStatus()
        status.requiresUnlock = true
        
        // Ensure we only show entries if we actually have a card to provision
        let activeCard = AppGroupManager.shared.getActiveCard()
        status.passEntriesAvailable = (activeCard != nil)
        
        AUBLog.nonUI.debug("Status determined: passEntriesAvailable = \(status.passEntriesAvailable)")
        completion(status)
    }

    // 2. Pass Entries: Returns the list of cards available to be added
    override func passEntries(completion: @escaping ([PKIssuerProvisioningExtensionPassEntry]) -> Void) {
        AUBLog.nonUI.info("Fetching pass entries...")
        
        guard let cardId = AppGroupManager.shared.getActiveCard() else {
            AUBLog.nonUI.warning("No active card found in App Group storage. Returning empty entries.")
            completion([])
            return
        }

        // Configure the card's visual and technical metadata
        let config = PKAddPaymentPassRequestConfiguration(encryptionScheme: .ECC_V2)
        config?.primaryAccountSuffix = String(cardId.suffix(4))
        config?.localizedDescription = "AUB Payment Card" // Displayed during the addition process

        // Safely load the card art image
        guard let cardArt = UIImage(named: "kfh_card_art")?.cgImage else {
            AUBLog.nonUI.error("Failed to load 'kfh_card_art' from assets.")
            completion([])
            return
        }

        let entry = PKIssuerProvisioningExtensionPassEntry(
            identifier: cardId,
            title: "AUB Visa Card", // The name shown in the "From Apps on your iPhone" list
            art: cardArt,
            addRequestConfiguration: config!
        )
        
        AUBLog.nonUI.notice("Successfully created pass entry for card suffix: \(cardId.suffix(4))")
        completion([entry])
    }
    
    // 3. Optional: Remote Pass Entries
    // Use this if you want to suggest cards that are not yet on this device but linked to the user's account
    override func remotePassEntries(completion: @escaping ([PKIssuerProvisioningExtensionPassEntry]) -> Void) {
        completion([])
    }
}
