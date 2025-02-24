#import <Cordova/CDV.h>
#import <PassKit/PassKit.h>

@interface WalletExtensionPlugin : CDVPlugin

- (void)updatePassInWallet:(CDVInvokedUrlCommand*)command;
- (void)handleDeepLink:(CDVInvokedUrlCommand*)command;

@end
