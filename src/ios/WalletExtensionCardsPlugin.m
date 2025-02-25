#import "WalletExtensionCardsPlugin.h"
#import <LocalAuthentication/LocalAuthentication.h>
#import <PassKit/PassKit.h>
#import <WatchConnectivity/WatchConnectivity.h>

@interface WalletExtensionCardsPlugin () <PKAddPaymentPassViewControllerDelegate>
@property (nonatomic, strong) CDVInvokedUrlCommand *pendingCommand;
@end

@implementation WalletExtensionCardsPlugin




- (NSString *) getCardFPAN:(NSString *) cardSuffix{
    
    PKPassLibrary *passLibrary = [[PKPassLibrary alloc] init];
    NSArray<PKPass *> *paymentPasses = [passLibrary passesOfType:PKPassTypePayment];
    for (PKPass *pass in paymentPasses) {
        PKPaymentPass * paymentPass = [pass paymentPass];
        if([[paymentPass primaryAccountNumberSuffix] isEqualToString:cardSuffix])
            return [paymentPass primaryAccountIdentifier];
    }
    
    if (WCSession.isSupported) { // check if the device support to handle an Apple Watch
        WCSession *session = [WCSession defaultSession];
        [session setDelegate:self.appDelegate];
        [session activateSession];
        
        if ([session isPaired]) { // Check if the iPhone is paired with the Apple Watch
            paymentPasses = [passLibrary remotePaymentPasses];
            for (PKPass *pass in paymentPasses) {
                PKPaymentPass * paymentPass = [pass paymentPass];
                if([[paymentPass primaryAccountNumberSuffix] isEqualToString:cardSuffix])
                    return [paymentPass primaryAccountIdentifier];
            }
        }
    }
    
    return nil;
}

- (void)addCardToWallet:(CDVInvokedUrlCommand *)command {
    NSDictionary *cardDetails = [command.arguments objectAtIndex:0];

    if (!cardDetails || ![cardDetails isKindOfClass:[NSDictionary class]]) {
        CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:@"Invalid card details"];
        [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
        return;
    }

    NSString *cardholderName = [cardDetails objectForKey:@"cardholderName"];
    NSString *primaryAccountSuffix = [cardDetails objectForKey:@"primaryAccountSuffix"];
    NSString *localizedDescription = [cardDetails objectForKey:@"localizedDescription"];
    NSString *paymentNetwork = [cardDetails objectForKey:@"paymentNetwork"];

    if (!cardholderName || !primaryAccountSuffix || !localizedDescription || !paymentNetwork) {
        CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:@"Missing required card details"];
        [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
        return;
    }

    // Check if the device supports adding payment passes
    if (![PKAddPaymentPassViewController canAddPaymentPass]) {
        CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:@"Device does not support adding payment passes"];
        [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
        return;
    }

    PKAddPaymentPassRequestConfiguration *config = [[PKAddPaymentPassRequestConfiguration alloc] initWithEncryptionScheme:PKEncryptionSchemeECC_V2];
    config.cardholderName = cardholderName;
    config.primaryAccountSuffix = primaryAccountSuffix;
    config.localizedDescription = localizedDescription;
    config.paymentNetwork = paymentNetwork;
    config.primaryAccountIdentifier = [self getCardFPAN:primaryAccountSuffix];

    PKAddPaymentPassViewController *vc = [[PKAddPaymentPassViewController alloc] initWithRequestConfiguration:config delegate:self];

    if (!vc) {
        NSLog(@"Failed to initialize PKAddPaymentPassViewController. Configuration: %@", config);
        CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:@"Failed to initialize PKAddPaymentPassViewController"];
        [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
        return;
    }

    self.pendingCommand = command;
    [self.viewController presentViewController:vc animated:YES completion:nil];
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
        CDVPluginResult* pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:@"Biometric authentication not available"];
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
          didFinishAddingPaymentPass:(nullable PKPaymentPass *)pass
                              error:(nullable NSError *)error {
    [controller dismissViewControllerAnimated:YES completion:nil];
    
    if (error) {
        CDVPluginResult* pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:error.localizedDescription];
        [self.commandDelegate sendPluginResult:pluginResult callbackId:self.pendingCommand.callbackId];
    } else {
        CDVPluginResult* pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
        [self.commandDelegate sendPluginResult:pluginResult callbackId:self.pendingCommand.callbackId];
    }
    
    self.pendingCommand = nil;
}



@end
