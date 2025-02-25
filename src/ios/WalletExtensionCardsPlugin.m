#import "WalletExtensionCardsPlugin.h"
#import <LocalAuthentication/LocalAuthentication.h>
#import <PassKit/PassKit.h>
#import <WatchConnectivity/WatchConnectivity.h>

@interface WalletExtensionCardsPlugin () <PKAddPaymentPassViewControllerDelegate>
@property (nonatomic, strong) CDVInvokedUrlCommand *pendingCommand;
 @property (nonatomic, retain) UIViewController* addPaymentPassModal;




 
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


    NSLog(@"LOG start startAddPaymentPass");
    CDVPluginResult* pluginResult;
    NSArray* arguments = command.arguments;
    
  
    
    if ([arguments count] != 1){
        pluginResult =[CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:@"incorrect number of arguments"];
        [pluginResult setKeepCallback:[NSNumber numberWithBool:YES]];
        [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
    } else {
        // Options
        NSDictionary* options = [arguments objectAtIndex:0];
        
        // encryption scheme to be used (RSA_V2 or ECC_V2)
        NSString* scheme = [options objectForKey:@"encryptionScheme"];
        PKEncryptionScheme encryptionScheme = PKEncryptionSchemeRSA_V2;
        if (scheme != nil) {
            if([[scheme uppercaseString] isEqualToString:@"RSA_V2"]) {
                encryptionScheme = PKEncryptionSchemeRSA_V2;
            }
            
            if([[scheme uppercaseString] isEqualToString:@"ECC_V2"]) {
                encryptionScheme = PKEncryptionSchemeECC_V2;
            }
        }

        PKAddPaymentPassRequestConfiguration* configuration = [[PKAddPaymentPassRequestConfiguration alloc] initWithEncryptionScheme:encryptionScheme];
        
        // The name of the person the card is issued to
        configuration.cardholderName = [options objectForKey:@"cardholderName"];
        
        // Last 4/5 digits of PAN. The last four or five digits of the PAN. Presented to the user with dots prepended to indicate that it is a suffix.
        configuration.primaryAccountSuffix = [options objectForKey:@"primaryAccountSuffix"];
        
        // A short description of the card.
        configuration.localizedDescription = [options objectForKey:@"localizedDescription"];
        
        // Filters the device and attached devices that already have this card provisioned. No filter is applied if the parameter is omitted
        configuration.primaryAccountIdentifier = [self getCardFPAN:configuration.primaryAccountSuffix]; //@"V-3018253329239943005544";//@"";
        
        
        // Filters the networks shown in the introduction view to this single network.
        NSString* paymentNetwork = [options objectForKey:@"paymentNetwork"];
        if([[paymentNetwork uppercaseString] isEqualToString:@"VISA"]) {
            configuration.paymentNetwork = PKPaymentNetworkVisa;
        }
        if([[paymentNetwork uppercaseString] isEqualToString:@"MASTERCARD"]) {
            configuration.paymentNetwork = PKPaymentNetworkMasterCard;
        }
         // configuration.requiresAuthentication = YES; 
         
        // Present view controller
        self.addPaymentPassModal = [[PKAddPaymentPassViewController alloc] initWithRequestConfiguration:configuration delegate:self];
        
        if (!self.addPaymentPassModal) {
        NSLog(@"Failed to initialize PKAddPaymentPassViewController. Configuration: %@", config);
        CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:@"Failed to init PKAddPaymentPassViewController"];
        [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
        return;
    }

    self.pendingCommand = command;
    [self.viewController presentViewController:self.addPaymentPassModal animated:YES completion:nil];
    
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
