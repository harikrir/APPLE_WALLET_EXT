import PassKit
import os

class WNonUIExtHandler: PKIssuerProvisioningExtensionHandler {
    
    // Using Unified Logging to track extension activity
    private let logger = Logger(subsystem: "com.aub.mobilebanking.uat.bh", category: "WNonUIExt")
    private let groupID = "group.com.aub.mobilebanking.uat.bh"

    // 1. Apple Wallet calls this to see if the app has any cards to suggest
    override func status(completion: @escaping (PKIssuerProvisioningExtensionStatus) -> Void) {
        logger.info("Extension status check triggered.")
        
        let status = PKIssuerProvisioningExtensionStatus()
        status.requiresUnlock = true
        
        // Check if we have a card stored in the App Group by the main app
        let activeCardId = UserDefaults(suiteName: groupID)?.string(forKey: "ACTIVE_CARD_ID")
        status.passEntriesAvailable = (activeCardId != nil)
        
        logger.debug("Pass entries available: \(status.passEntriesAvailable)")
        completion(status)
    }

    // 2. Returns the card details (metadata and art) to display in the Wallet suggest list
    override func passEntries(completion: @escaping ([PKIssuerProvisioningExtensionPassEntry]) -> Void) {
        logger.info("Fetching pass entries for Wallet.")
        
        guard let cardId = UserDefaults(suiteName: groupID)?.string(forKey: "ACTIVE_CARD_ID") else {
            logger.warning("No card found in shared storage. Returning empty list.")
            completion([])
            return
        }

        // Setup the card configuration
        let config = PKAddPaymentPassRequestConfiguration(encryptionScheme: .ECC_V2)
        config?.primaryAccountSuffix = String(cardId.suffix(4))
        config?.localizedDescription = "AUB Payment Card"

        // Load card art from the plugin assets
        guard let cardImage = UIImage(named: "kfh_card_art")?.cgImage else {
            logger.error("Critical Error: 'kfh_card_art' image not found in extension bundle.")
            completion([])
            return
        }

        let entry = PKIssuerProvisioningExtensionPassEntry(
            identifier: cardId,
            title: "AUB Visa Card",
            art: cardImage,
            addRequestConfiguration: config!
        )
        
        logger.notice("Successfully sent pass entry for suffix \(cardId.suffix(4))")
        completion([entry])
    }
}
