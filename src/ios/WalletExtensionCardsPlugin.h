#import <Cordova/CDV.h>
#import <PassKit/PassKit.h>
#import <LocalAuthentication/LocalAuthentication.h>

@interface WalletExtensionCardsPlugin : CDVPlugin <PKAddPaymentPassViewControllerDelegate>

- (void)addCardToWallet:(CDVInvokedUrlCommand*)command;
- (void)authenticateWithFaceID:(CDVInvokedUrlCommand*)command;

@end
