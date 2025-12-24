import Foundation
import PassKit
import UIKit
class KFHUIHandler: UIViewController, PKIssuerProvisioningExtensionAuthorizationProviding {
   // This handler is called by iOS to notify the Wallet app if the user is authorized
   var completionHandler: ((PKIssuerProvisioningExtensionAuthorizationResult) -> Void)?
   override func viewDidLoad() {
       super.viewDidLoad()
       view.backgroundColor = .systemBackground // Better for Dark Mode support
       setupUI()
   }
   private func setupUI() {
       // 1. Message Label
       let label = UILabel()
       label.text = "Please log in to the AUB Mobile app to manage your cards."
       label.numberOfLines = 0
       label.textAlignment = .center
       label.font = UIFont.preferredFont(forTextStyle: .body)
       label.translatesAutoresizingMaskIntoConstraints = false
       view.addSubview(label)
       // 2. Login/Open App Button
       let loginBtn = UIButton(type: .system)
       loginBtn.setTitle("Open AUB App", for: .normal)
       loginBtn.titleLabel?.font = UIFont.boldSystemFont(ofSize: 17)
       loginBtn.addTarget(self, action: #selector(authorize), for: .touchUpInside)
       loginBtn.translatesAutoresizingMaskIntoConstraints = false
       view.addSubview(loginBtn)
       // 3. Layout Constraints (Better than fixed Frames)
       NSLayoutConstraint.activate([
           label.centerXAnchor.constraint(equalTo: view.centerXAnchor),
           label.centerYAnchor.constraint(equalTo: view.centerYAnchor, constant: -40),
           label.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 40),
           label.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -40),
           loginBtn.topAnchor.constraint(equalTo: label.bottomAnchor, constant: 20),
           loginBtn.centerXAnchor.constraint(equalTo: view.centerXAnchor),
           loginBtn.widthAnchor.constraint(equalToConstant: 200),
           loginBtn.heightAnchor.constraint(equalToConstant: 50)
       ])
   }
   @objc func authorize() {
       // In a real production scenario, you would trigger a Deep Link to your main app here
       // for the user to login.
       // This tells the Wallet App the user is now allowed to see their cards
       completionHandler?(.authorized)
   }
}
