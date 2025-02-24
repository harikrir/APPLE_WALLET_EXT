#import "MyAppleWalletPlugin.h"
#import <PassKit/PassKit.h>
#import <WatchConnectivity/WatchConnectivity.h>
#import "AppDelegate.h"

@implementation MyAppleWalletPlugin {
    CDVInvokedUrlCommand* _pendingCommand;
}

- (void)addCardToWallet:(CDVInvokedUrlCommand*)command {
    NSDictionary* cardDetails = [command.arguments objectAtIndex:0];
    
    if (!cardDetails) {
        CDVPluginResult* pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:@"Invalid card details"];
        [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
        return;
    }
    
    // Create a PKAddPaymentPassRequestConfiguration
    PKAddPaymentPassRequestConfiguration *config = [[PKAddPaymentPassRequestConfiguration alloc] initWithEncryptionScheme:PKEncryptionSchemeECC_V2];
    config.cardholderName = cardDetails[@"cardholderName"];
    config.primaryAccountSuffix = cardDetails[@"primaryAccountSuffix"];
    config.requiresAuthentication = YES; // Enable external authentication
    
    // Create a PKAddPaymentPassViewController
    PKAddPaymentPassViewController *vc = [[PKAddPaymentPassViewController alloc] initWithRequestConfiguration:config delegate:self];
    
    if (vc) {
        _pendingCommand = command; // Store the command for later use
        [self.viewController presentViewController:vc animated:YES completion:nil];
    } else {
        CDVPluginResult* pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:@"Failed to initialize PKAddPaymentPassViewController"];
        [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
    }
}

- (void)handleExternalAuthentication:(CDVInvokedUrlCommand*)command {
    NSDictionary* authData = [command.arguments objectAtIndex:0];
    
    if (!authData) {
        CDVPluginResult* pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:@"Invalid authentication data"];
        [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
        return;
    }
    
    // Handle external authentication (e.g., communicate with your server)
    // This is where you would send the authData to your server for verification
    // and receive the encrypted card data.
    
    // For now, simulate success
    CDVPluginResult* pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
    [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
}

#pragma mark - PKAddPaymentPassViewControllerDelegate

- (void)addPaymentPassViewController:(PKAddPaymentPassViewController *)controller
 generateRequestWithCertificateChain:(NSArray<NSData *> *)certificates
                               nonce:(NSData *)nonce
                      nonceSignature:(NSData *)nonceSignature
                   completionHandler:(void (^)(PKAddPaymentPassRequest *request))handler {
    // Generate the PKAddPaymentPassRequest
    PKAddPaymentPassRequest *request = [[PKAddPaymentPassRequest alloc] init];
    
    // Simulate encrypted card data (replace with actual server-side logic)
    request.encryptedPassData = [NSData data]; // Encrypted card data from your server
    request.activationData = [NSData data]; // Activation data from your server
    request.ephemeralPublicKey = [NSData data]; // Ephemeral public key from your server
    
    handler(request);
}

- (void)addPaymentPassViewController:(PKAddPaymentPassViewController *)controller
          didFinishAddingPaymentPass:(PKPaymentPass *)pass
                              error:(NSError *)error {
    [controller dismissViewControllerAnimated:YES completion:nil];
    
    if (error) {
        CDVPluginResult* pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:error.localizedDescription];
        [self.commandDelegate sendPluginResult:pluginResult callbackId:_pendingCommand.callbackId];
    } else {
        CDVPluginResult* pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
        [self.commandDelegate sendPluginResult:pluginResult callbackId:_pendingCommand.callbackId];
    }
    
    _pendingCommand = nil;
}

@end
