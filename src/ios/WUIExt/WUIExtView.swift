import SwiftUI
import PassKit

struct WUIExtView: View {
    
    // Instance variable for the completion handler
    var completionHandler: ((PKIssuerProvisioningExtensionAuthorizationResult) -> Void)?
    
    @State private var username: String = ""
    @State private var password: String = ""
    
    /**
     Handle a tap on the Log In button.
     */
    func handleLogin() {
        // TODO: Replace with your actual AUB API authentication logic
        print("Log In button tapped")
        
        // Safety: Always check if the handler exists before calling
        if let handler = completionHandler {
            // Logic to determine authorization
            let isAuthorized = !username.isEmpty && !password.isEmpty 
            handler(isAuthorized ? .authorized : .canceled)
        }
    }
    
    /**
     Handle a tap on the Face ID button.
     */
    func handleBiometricLogin() {
        print("Face ID button tapped")
        
        if let handler = completionHandler {
            // Logic to determine biometric authorization
            // In production, use LocalAuthentication (LAContext)
            handler(.authorized)
        }
    }
   
    var body: some View {
        VStack {
            // Header Section
            VStack(spacing: 10) {
                Image(systemName: "banknote.fill")
                    .font(.system(size: 50, weight: .bold))
                    .foregroundColor(.white)
                
                Text("AUB Mobile Banking")
                    .font(.title)
                    .bold()
                    .foregroundColor(.white)
                    .multilineTextAlignment(.center)
            }
            .padding(.top, 40)
            
            // Login Fields
            List {
                Section(header: Text("LOGIN TO AUTHORIZE").foregroundColor(.white.opacity(0.7))) {
                    HStack {
                        Image(systemName: "person")
                            .foregroundColor(.gray)
                        TextField("Username", text: $username)
                            .autocapitalization(.none)
                    }
                    
                    HStack {
                        Image(systemName: "lock")
                            .foregroundColor(.gray)
                        SecureField("Password", text: $password)
                    }
                }
                .listRowBackground(Color.white.opacity(0.9))
                
                // Buttons Section
                Section {
                    HStack(spacing: 20) {
                        // Face ID Button
                        Button(action: handleBiometricLogin) {
                            HStack {
                                Image(systemName: "faceid")
                                Text("Face ID")
                            }
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.black.opacity(0.7))
                            .foregroundColor(.white)
                            .cornerRadius(12)
                        }
                        
                        // Login Button
                        Button(action: handleLogin) {
                            Text("Log In")
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(Color.orange)
                                .foregroundColor(.white)
                                .cornerRadius(12)
                        }
                    }
                    .listRowBackground(Color.clear)
                    .listRowInsets(EdgeInsets())
                }
            }
            .scrollContentBackground(.hidden) // Makes the List background transparent
            
            // Footer Section
            VStack(spacing: 8) {
                Text("Secure Authorization for Apple Wallet")
                    .font(.caption)
                    .foregroundColor(.white.opacity(0.8))
                
                HStack {
                    Link("Terms of Use", destination: URL(string: "https://api.aub.com.bh/terms")!)
                    Text("|")
                    Link("Privacy Policy", destination: URL(string: "https://api.aub.com.bh/privacy")!)
                }
                .font(.system(size: 12))
                .foregroundColor(.white)
            }
            .padding(.bottom, 20)
        }
        .background(
            LinearGradient(gradient: Gradient(colors: [Color.blue, Color.blue.opacity(0.8)]), 
                           startPoint: .top, endPoint: .bottom)
        )
        .edgesIgnoringSafeArea(.all)
    }
}
