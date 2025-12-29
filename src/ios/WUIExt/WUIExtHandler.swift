import SwiftUI
import PassKit

class WUIExtHandler: UIViewController, PKIssuerProvisioningExtensionAuthorizationProviding {
    var completionHandler: ((PKIssuerProvisioningExtensionAuthorizationResult) -> Void)?

    override func viewDidLoad() {
        super.viewDidLoad()
        
        let authView = WUIExtView { [weak self] success in
            self?.completionHandler?(success ? .authorized : .canceled)
        }
        
        let hostingController = UIHostingController(rootView: authView)
        addChild(hostingController)
        view.addSubview(hostingController.view)
        hostingController.view.frame = view.bounds
        hostingController.didMove(toParent: self)
    }
}
