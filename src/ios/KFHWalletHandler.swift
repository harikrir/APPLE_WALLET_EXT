import Foundation

import PassKit

import OSLog

import UIKit

@objc

class KFHWalletHandler: PKIssuerProvisioningExtensionHandler {

    private let logger = Logger(

        subsystem: "com.aub.mobilebanking.uat.bh",

        category: "IssuerProvisioning"

    )

    private let groupID = "group.com.aub.mobilebanking.uat.bh"

    // MARK: - 1️⃣ Status

    override func status(completion: @escaping (PKIssuerProvisioningExtensionStatus) -> Void) {

        logger.notice("KFH_LOG: status() called")

        let status = PKIssuerProvisioningExtensionStatus()

        // Wallet visibility

        status.passEntriesAvailable = PKAddPaymentPassViewController.canAddPaymentPass()

        status.remotePassEntriesAvailable = status.passEntriesAvailable

        // Auth check via App Group

        let token = UserDefaults(suiteName: groupID)?

            .string(forKey: "AUB_Auth_Token")

        status.requiresAuthentication = (token == nil)

        logger.notice("KFH_LOG: requiresAuth = \(status.requiresAuthentication)")

        completion(status)

    }

    // MARK: - 2️⃣ Available Cards

    override func passEntries(

        completion: @escaping ([PKIssuerProvisioningExtensionPassEntry]) -> Void

    ) {

        logger.notice("KFH_LOG: passEntries() called")

        guard PKAddPaymentPassViewController.canAddPaymentPass() else {

            logger.error("KFH_LOG: Device cannot add payment passes")

            completion([])

            return

        }

        let config = PKAddPaymentPassRequestConfiguration(

            encryptionScheme: .ECC_V2

        )!

        config.primaryAccountSuffix = "1234"

        config.localizedDescription = "KFH Visa Gold"

        config.cardholderName = "KFH User"

        guard

            let image = UIImage(named: "kfh_card_art"),

            let cgImage = image.cgImage

        else {

            logger.error("KFH_LOG: Missing card art image")

            completion([])

            return

        }

        let entry = PKIssuerProvisioningExtensionPaymentPassEntry(

            identifier: "kfh_card_01",

            title: "KFH Visa Gold",

            art: cgImage,

            addRequestConfiguration: config

        )!

        completion([entry])

    }

    // MARK: - 3️⃣ Provisioning Handshake

    override func generateAddPaymentPassRequestForPassEntryWithIdentifier(

        _ identifier: String,

        configuration: PKAddPaymentPassRequestConfiguration,

        certificateChain certificates: [Data],

        nonce: Data,

        nonceSignature: Data,

        completionHandler completion: @escaping (PKAddPaymentPassRequest?) -> Void

    ) {

        logger.notice("KFH_LOG: generateAddPaymentPassRequest() for \(identifier)")

        // 🔐 Normally:

        // 1. Send certificates + nonce + signature to backend

        // 2. Backend calls Apple Pay servers

        // 3. Backend returns encrypted payloads

        // ✅ MOCK RESPONSE (for first Wallet visibility & testing)

        let request = PKAddPaymentPassRequest()

        request.activationData = Data()

        request.encryptedPassData = Data()

        request.ephemeralPublicKey = Data()

        logger.notice("KFH_LOG: Returning mock PKAddPaymentPassRequest")

        completion(request)

    }

}
 
