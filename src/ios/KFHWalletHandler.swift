import Foundation

import PassKit

import OSLog

@objc // Essential for the $(PRODUCT_NAME) namespacing in plugin.xml

class KFHWalletHandler: PKIssuerProvisioningExtensionHandler {

    private let logger = Logger(subsystem: "com.aub.mobilebanking.uat.bh", category: "Extension")

    private let groupID = "group.com.aub.mobilebanking.uat.bh"

    // 1. Apple calls this FIRST to see if your app should be listed in Wallet

    override func status(completion: @escaping (PKIssuerProvisioningExtensionStatus) -> Void) {

        logger.notice("KFH_LOG: Wallet App invoked status()")

        let status = PKIssuerProvisioningExtensionStatus()

        // FOR TESTING: Force these to true. 

        // If these are false, Apple Wallet will HIDE your app.

        status.passEntriesAvailable = true

        status.remotePassEntriesAvailable = true

        // Check authentication via App Group

        let token = UserDefaults(suiteName: groupID)?.string(forKey: "AUB_Auth_Token")

        status.requiresAuthentication = (token == nil)

        logger.notice("KFH_LOG: Status sent. Auth required: \(status.requiresAuthentication)")

        completion(status)

    }

    // 2. Apple calls this SECOND to get the list of cards

    override func passEntries(completion: @escaping ([PKIssuerProvisioningExtensionPassEntry]) -> Void) {

        logger.notice("KFH_LOG: Wallet App invoked passEntries()")

        // Mocking one card entry to guarantee the UI shows something

        let config = PKAddPaymentPassRequestConfiguration(encryptionScheme: .ECC_V2)!

        config.primaryAccountSuffix = "1234"

        config.localizedDescription = "KFH Visa Gold"

        config.cardholderName = "KFH User"

        // Ensure this image name exists in your Resources/Assets

        let cardArt = UIImage(named: "kfh_card_art")?.cgImage ?? UIImage().cgImage!

        let entry = PKIssuerProvisioningExtensionPaymentPassEntry(

            identifier: "card_01",

            title: "KFH Visa Gold",

            art: cardArt,

            addRequestConfiguration: config

        )!

        completion([entry])

    }

    // 3. Apple calls this THIRD when the user clicks "Add"

    override func generateAddPaymentPassRequestForPassEntryWithIdentifier(

        _ identifier: String,

        configuration: PKAddPaymentPassRequestConfiguration,

        certificateChain certificates: [Data],

        nonce: Data,

        nonceSignature: Data,

        completionHandler completion: @escaping (PKAddPaymentPassRequest?) -> Void) {

        logger.notice("KFH_LOG: Handshake started for \(identifier)")

        // This is where you call your backend. 

        // For the first test, just logging the call is enough.

        completion(nil) 

    }

}
 
