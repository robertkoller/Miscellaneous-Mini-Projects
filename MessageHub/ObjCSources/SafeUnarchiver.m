#import "include/SafeUnarchiver.h"

NSString *SafeUnarchiveAttributedString(NSData *data) {
    @try {
        id result = [NSUnarchiver unarchiveObjectWithData:data];
        if ([result isKindOfClass:[NSAttributedString class]]) {
            NSString *text = [(NSAttributedString *)result string];
            return text.length > 0 ? text : nil;
        }
        if ([result isKindOfClass:[NSString class]]) {
            NSString *text = (NSString *)result;
            return text.length > 0 ? text : nil;
        }
    } @catch (NSException *exception) {
        // Unknown private class or corrupt archive — fall through.
    }
    return nil;
}
