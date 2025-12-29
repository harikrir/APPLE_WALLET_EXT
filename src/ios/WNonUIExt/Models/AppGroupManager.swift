import Foundation

/**
 This manager handles the connection to the shared container used by 
 the main OutSystems app and its extensions.
 */

// Set the extension's actual app group ID for AUB.
let appGroupID: String = "group.com.aub.mobilebanking.uat.bh"

/**
 Create an object that connects to the user's defaults 
 database within the app group container.
 This is used by WNonUIExtHandler to read card data.
 */
let appGroupSharedDefaults: UserDefaults = {
    guard let defaults = UserDefaults(suiteName: appGroupID) else {
        fatalError("Could not initialize shared UserDefaults for group: \(appGroupID)")
    }
    return defaults
}()

/**
 Optional: Access the shared file system directory if you need to store 
 large assets like card images or PDF terms.
 */
let appGroupSharedContainerDirectory: URL? = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: appGroupID)
