import SwiftUI
import PassKit

class WUIExtHandler: UIViewController, PKIssuerProvisioningExtensionAuthorizationProviding {
    
    // The system-provided callback to return the auth result
    var completionHandler: ((PKIssuerProvisioningExtensionAuthorizationResult) -> Void)?

    override func viewDidLoad() {
        super.viewDidLoad()
        AUBLog.ui.info("WUIExtHandler: View loaded. Presenting Auth Screen.")

        // Initialize your SwiftUI view
        let authView = WUIExtView { [weak self] success in
            if success {
                AUBLog.ui.notice("WUIExtHandler: User authorized provisioning.")
                self?.completionHandler?(.authorized)
            } else {
                AUBLog.ui.warning("WUIExtHandler: User canceled provisioning.")
                self?.completionHandler?(.canceled)
            }
        }

        // Bridge SwiftUI to UIKit
        let hostingController = UIHostingController(rootView: authView)
        addChild(hostingController)
        view.addSubview(hostingController.view)
        
        // Ensure the SwiftUI view fills the entire extension container
        hostingController.view.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            hostingController.view.topAnchor.constraint(equalTo: view.topAnchor),
            hostingController.view.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            hostingController.view.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            hostingController.view.trailingAnchor.constraint(equalTo: view.trailingAnchor)
        ])
        
        hostingController.didMove(toParent: self)
    }
}
