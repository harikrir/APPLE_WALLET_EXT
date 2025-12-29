import UIKit
import PassKit
import OSLog
@objc(KFHUIHandler)
class KFHUIHandler: UIViewController,
                   PKIssuerProvisioningExtensionAuthorizationProviding {
   private let logger = Logger(
       subsystem: "com.aub.mobilebanking.uat.bh",
       category: "WalletUIExtension"
   )
   private var authorizationCompletion:
       ((PKIssuerProvisioningExtensionAuthorizationResult) -> Void)?
   // MARK: - Wallet Entry Point
   func provideAuthorization(
       completionHandler: @escaping
       (PKIssuerProvisioningExtensionAuthorizationResult) -> Void
   ) {
       logger.notice("UI Extension provideAuthorization() called")
       self.authorizationCompletion = completionHandler
   }
   // MARK: - Lifecycle
   override func viewDidLoad() {
       super.viewDidLoad()
       logger.notice("UI Extension viewDidLoad")
       setupUI()
   }
   override func viewWillDisappear(_ animated: Bool) {
       super.viewWillDisappear(animated)
       // If user leaves without action → cancel
       if authorizationCompletion != nil {
           logger.notice("UI dismissed without authorization")
           authorizationCompletion?(.canceled)
           authorizationCompletion = nil
       }
   }
   // MARK: - UI
   private func setupUI() {
       view.backgroundColor = .systemBackground
       let button = UIButton(type: .system)
       button.setTitle("Authorize Adding Card", for: .normal)
       button.titleLabel?.font = .boldSystemFont(ofSize: 17)
       button.translatesAutoresizingMaskIntoConstraints = false
       button.addTarget(self, action: #selector(authorizeTapped), for: .touchUpInside)
       view.addSubview(button)
       NSLayoutConstraint.activate([
           button.centerXAnchor.constraint(equalTo: view.centerXAnchor),
           button.centerYAnchor.constraint(equalTo: view.centerYAnchor),
           button.heightAnchor.constraint(equalToConstant: 44),
           button.widthAnchor.constraint(equalToConstant: 240)
       ])
       logger.notice("UI rendered")
   }
   // MARK: - Actions
   @objc private func authorizeTapped() {
       logger.notice("User authorized provisioning")
       authorizationCompletion?(.authorized)
       authorizationCompletion = nil
   }
}
