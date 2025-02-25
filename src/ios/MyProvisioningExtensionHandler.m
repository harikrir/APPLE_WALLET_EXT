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


- (void)passEntriesWithCompletion:(void (^)(NSArray<PKIssuerProvisioningExtensionPaymentPassEntry *> *passEntries))completion {
    PKIssuerProvisioningExtensionPaymentPassEntry *entry = [[PKIssuerProvisioningExtensionPaymentPassEntry alloc] init];
    entry.title = @"Example Card";
    entry.identifier = @"example-card-identifier";
    entry.art = [UIImage imageNamed:@"card-art"]; // Ensure this image meets Apple's requirements

    completion(@[entry]);
}

- (void)remotePassEntriesWithCompletion:(void (^)(NSArray<PKIssuerProvisioningExtensionPaymentPassEntry *> *remotePassEntries))completion {
    PKIssuerProvisioningExtensionPaymentPassEntry *entry = [[PKIssuerProvisioningExtensionPaymentPassEntry alloc] init];
    entry.title = @"Example Card";
    entry.identifier = @"example-card-identifier";
    entry.art = [UIImage imageNamed:@"card-art"]; // Ensure this image meets Apple's requirements

    completion(@[entry]);
}

@end
