import Foundation
import PassKit
@objc(KFHWalletPlugin) class KFHWalletPlugin : CDVPlugin {
   @objc(canAddCard:)
   func canAddCard(command: CDVInvokedUrlCommand) {
       let isAvailable = PKAddPaymentPassViewController.canAddPaymentPass()
       let result = CDVPluginResult(status: CDVCommandStatus_OK, messageAs: isAvailable)
       self.commandDelegate.send(result, callbackId: command.callbackId)
   }
   @objc(startProvisioning:)
   func startProvisioning(command: CDVInvokedUrlCommand) {
       guard let cardId = command.arguments[0] as? String,
             let cardName = command.arguments[1] as? String else {
           let result = CDVPluginResult(status: CDVCommandStatus_ERROR, messageAs: "Invalid Arguments")
           self.commandDelegate.send(result, callbackId: command.callbackId)
           return
       }
       // Logic to launch the native Apple Wallet "Add Card" view goes here
       // This usually triggers the 'generateAddPaymentPassRequest' handshake
       let result = CDVPluginResult(status: CDVCommandStatus_OK, messageAs: "Provisioning Started for \(cardName)")
       self.commandDelegate.send(result, callbackId: command.callbackId)
   }
}
