import SwiftUI

struct WUIExtView: View {
    var onAuth: (Bool) -> Void
    
    var body: some View {
        VStack(spacing: 20) {
            Image("kfh_card_art").resizable().scaledToFit().frame(height: 100)
            Text("Login to AUB").font(.headline)
            Button("Authorize Apple Pay") { onAuth(true) }
                .padding().background(Color.blue).foregroundColor(.white).cornerRadius(10)
        }
    }
}
