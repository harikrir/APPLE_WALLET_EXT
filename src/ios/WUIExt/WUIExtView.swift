import SwiftUI

struct WUIExtView: View {
    // This closure sends the result back to the WUIExtHandler
    var onAuth: (Bool) -> Void
    
    var body: some View {
        VStack(spacing: 24) {
            Spacer()
            
            // 1. Branding / Card Art
            if let image = UIImage(named: "kfh_card_art") {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFit()
                    .frame(height: 120)
                    .cornerRadius(12)
                    .shadow(radius: 5)
            } else {
                // Fallback icon if image is missing
                Image(systemName: "creditcard.fill")
                    .font(.system(size: 80))
                    .foregroundColor(.gray)
            }
            
            // 2. Descriptive Text
            VStack(spacing: 8) {
                Text("Link Card to Apple Pay")
                    .font(.title2)
                    .fontWeight(.bold)
                
                Text("Authorize AUB to securely add your card to Apple Wallet for faster payments.")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 30)
            }
            
            Spacer()
            
            // 3. Action Buttons
            VStack(spacing: 16) {
                Button(action: { onAuth(true) }) {
                    Text("Confirm and Add")
                        .fontWeight(.semibold)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.blue)
                        .foregroundColor(.white)
                        .cornerRadius(14)
                }
                
                Button(action: { onAuth(false) }) {
                    Text("Cancel")
                        .fontWeight(.medium)
                        .foregroundColor(.red)
                }
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 40)
        }
        .background(Color(UIColor.systemBackground))
    }
}
