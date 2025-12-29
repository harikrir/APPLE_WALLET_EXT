import Foundation

class AppGroupManager {
    static let shared = AppGroupManager()
    private let groupID = "group.com.aub.mobilebanking.uat.bh"
    private let defaults: UserDefaults?

    private init() {
        self.defaults = UserDefaults(suiteName: groupID)
    }

    func saveActiveCard(id: String) {
        defaults?.set(id, forKey: "ACTIVE_CARD_ID")
        defaults?.synchronize()
    }

    func getActiveCard() -> String? {
        return defaults?.string(forKey: "ACTIVE_CARD_ID")
    }
}
