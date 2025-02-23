#import <Cordova/CDV.h>
#import <PassKit/PassKit.h>

@interface MyAppleWalletPlugin : CDVPlugin <PKAddPaymentPassViewControllerDelegate>

- (void)addCardToWallet:(CDVInvokedUrlCommand*)command;
- (void)handleExternalAuthentication:(CDVInvokedUrlCommand*)command;

@end
