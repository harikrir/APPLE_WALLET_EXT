import UIKit
import SwiftUI
import PassKit
class WUIExtHandler: UIViewController, PKIssuerProvisioningExtensionAuthorizationProviding {
   // System-provided callback to return the authorization result to Apple Wallet
   var completionHandler: ((PKIssuerProvisioningExtensionAuthorizationResult) -> Void)?
   override func viewDidLoad() {
       super.viewDidLoad()
       // Use a background color to prevent a black flicker during loading
       view.backgroundColor = .systemBackground
       AUBLog.ui.info("WUIExtHandler: View loaded. Presenting Auth Screen.")
       // 1. Initialize your SwiftUI view
       // The closure handles the result of your custom auth logic (like FaceID or OTP)
       let authView = WUIExtView { [weak self] success in
           DispatchQueue.main.async {
               if success {
                   AUBLog.ui.notice("WUIExtHandler: User authorized provisioning.")
                   self?.completionHandler?(.authorized)
               } else {
                   AUBLog.ui.warning("WUIExtHandler: User canceled/failed provisioning.")
                   self?.completionHandler?(.canceled)
               }
           }
       }
       // 2. Bridge SwiftUI to UIKit using UIHostingController
       let hostingController = UIHostingController(rootView: authView)
       // 3. Setup the hosting controller as a child
       addChild(hostingController)
       view.addSubview(hostingController.view)
       // 4. Ensure the SwiftUI view fills the entire extension UI container
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
