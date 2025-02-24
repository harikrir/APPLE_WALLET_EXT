#import "WalletExtensionCardsPlugin.h"

@implementation WalletExtensionCardsPlugin {
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

- (void)authenticateWithFaceID:(CDVInvokedUrlCommand*)command {
    LAContext *context = [[LAContext alloc] init];
    NSError *error = nil;
    
    if ([context canEvaluatePolicy:LAPolicyDeviceOwnerAuthenticationWithBiometrics error:&error]) {
        [context evaluatePolicy:LAPolicyDeviceOwnerAuthenticationWithBiometrics
                localizedReason:@"Authenticate to add card to Wallet"
                          reply:^(BOOL success, NSError *error) {
            if (success) {
                CDVPluginResult* pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
                [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
            } else {
                CDVPluginResult* pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:error.localizedDescription];
                [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
            }
        }];
    } else {
        CDVPluginResult* pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:@"Face ID not available"];
        [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
    }
}

#pragma mark - PKAddPaymentPassViewControllerDelegate

- (void)addPaymentPassViewController:(PKAddPaymentPassViewController *)controller
 generateRequestWithCertificateChain:(NSArray<NSData *> *)certificates
                               nonce:(NSData *)nonce
                      nonceSignature:(NSData *)nonceSignature
                   completionHandler:(void (^)(PKAddPaymentPassRequest *request))handler {
    // Generate the PKAddPaymentPassRequest
    PKAddPaymentPassRequest *request = [[PKAddPaymentPassRequest alloc] init];
    
    // Replace with actual server-side logic to generate encrypted card data
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
