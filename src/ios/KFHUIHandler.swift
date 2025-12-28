import UIKit
import PassKit
class KFHUIHandler: UIViewController, PKIssuerProvisioningExtensionAuthorizationProviding {
   var completionHandler: ((PKIssuerProvisioningExtensionAuthorizationResult) -> Void)?
   override func viewDidLoad() {
       super.viewDidLoad()
       view.backgroundColor = .systemBackground
       let btn = UIButton(type: .system)
       btn.setTitle("Authorize KFH Wallet", for: .normal)
       btn.frame = CGRect(x: 50, y: 200, width: 200, height: 50)
       btn.addTarget(self, action: #selector(auth), for: .touchUpInside)
       view.addSubview(btn)
   }
   @objc func auth() {
       // Here you would normally verify the token in App Groups
       completionHandler?(.authorized)
   }
}
