import UIKit
import SwiftUI
import PassKit

/**
 The UI extension's principal class for AUB Wallet.
 This controller hosts the SwiftUI view used for user authentication.
 */
class WUIExtHandler: UIViewController, PKIssuerProvisioningExtensionAuthorizationProviding {

    // MARK: - PKIssuerProvisioningExtensionAuthorizationProviding
    
    /// The completion handler provided by the system to report the result of the authorization.
    var completionHandler: ((PKIssuerProvisioningExtensionAuthorizationResult) -> Void)?
    
    // MARK: - Lifecycle
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        // 1. Initialize the SwiftUI View (WUIExtView)
        // Ensure WUIExtView is defined to accept the completionHandler
        let swiftUIView = WUIExtView(completionHandler: completionHandler)
        
        // 2. Create a UIHostingController to bridge SwiftUI into UIKit
        let controller = UIHostingController(rootView: swiftUIView)
        
        // 3. Setup the view hierarchy
        addChild(controller)
        controller.view.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(controller.view)
        
        // 4. Set and activate constraints to fill the view
        NSLayoutConstraint.activate([
            controller.view.topAnchor.constraint(equalTo: view.topAnchor),
            controller.view.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            controller.view.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            controller.view.trailingAnchor.constraint(equalTo: view.trailingAnchor)
        ])
        
        // 5. Notify the child view controller that the transition is complete
        controller.didMove(toParent: self)
        
        // Ensure the background is clear to match Wallet UI expectations
        view.backgroundColor = .clear
        controller.view.backgroundColor = .clear
    }
}
