#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

/// Attempts to decode an NSAttributedString from data in the old NSArchiver
/// (NSTypedStream) binary format — the one that starts with 04 0b.
/// Returns the plain text string, or nil if the format is unrecognized or the
/// archive contains only unknown/private classes.
/// ObjC @try/@catch provides exception safety that Swift cannot.
NSString *_Nullable SafeUnarchiveAttributedString(NSData *data);

NS_ASSUME_NONNULL_END
