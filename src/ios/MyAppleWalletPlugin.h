#import <Cordova/CDV.h>
#import <PassKit/PassKit.h>

@interface MyAppleWalletPlugin : CDVPlugin <PKAddPaymentPassViewControllerDelegate>
@property (nonatomic, strong) CDVInvokedUrlCommand *pendingCommand;
@end
