#import <Cordova/CDV.h>
#import <PassKit/PassKit.h>
#import "Foundation/Foundation.h"
#import <Cordova/CDVPlugin.h>
#import <WatchConnectivity/WatchConnectivity.h>

@interface MyAppleWalletPlugin : CDVPlugin <PKAddPaymentPassViewControllerDelegate>
@property (nonatomic, strong) CDVInvokedUrlCommand *pendingCommand;
@end
