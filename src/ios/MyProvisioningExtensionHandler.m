#import <PassKit/PassKit.h>

@interface MyProvisioningExtensionHandler : PKIssuerProvisioningExtensionHandler
@end

@implementation MyProvisioningExtensionHandler

- (void)statusWithCompletion:(void (^)(PKIssuerProvisioningExtensionStatus *status))completion {
    PKIssuerProvisioningExtensionStatus *status = [[PKIssuerProvisioningExtensionStatus alloc] init];
    status.passEntriesAvailable = YES; // Indicate that a payment pass is available
    status.remotePassEntriesAvailable = YES; // Indicate that a payment pass is available for Apple Watch
    status.requiresAuthentication = YES; // Indicate that authentication is required
    completion(status);
}

@end
