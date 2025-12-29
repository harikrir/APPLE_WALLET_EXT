import Foundation
import os

public struct AUBLog {
    private static let subsystem = "com.aub.mobilebanking.uat.bh"
    static let plugin = Logger(subsystem: subsystem, category: "App-Plugin")
    static let nonUI = Logger(subsystem: subsystem, category: "Ext-NonUI")
    static let ui = Logger(subsystem: subsystem, category: "Ext-UI")
}
