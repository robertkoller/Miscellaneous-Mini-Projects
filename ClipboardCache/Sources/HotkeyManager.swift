import AppKit
import Carbon.HIToolbox

final class HotkeyManager {
    var onTriggered: (() -> Void)?

    private var hotKeyRef: EventHotKeyRef?
    private var eventHandlerRef: EventHandlerRef?
    private var selfPointer: UnsafeMutableRawPointer?

    // Global hotkey: ⌘⇧C — registered via Carbon, no Accessibility permission needed
    func start() {
        let retained = Unmanaged.passRetained(self)
        selfPointer = retained.toOpaque()

        var spec = EventTypeSpec(
            eventClass: OSType(kEventClassKeyboard),
            eventKind: UInt32(kEventHotKeyPressed)
        )

        InstallEventHandler(
            GetApplicationEventTarget(),
            { (_, _, userData) -> OSStatus in
                guard let userData = userData else { return noErr }
                let manager = Unmanaged<HotkeyManager>.fromOpaque(userData).takeUnretainedValue()
                DispatchQueue.main.async { manager.onTriggered?() }
                return noErr
            },
            1,
            &spec,
            selfPointer,
            &eventHandlerRef
        )

        var hotKeyID = EventHotKeyID()
        hotKeyID.signature = fourCharCode("CLPC")
        hotKeyID.id = 1

        RegisterEventHotKey(
            UInt32(kVK_ANSI_C),
            UInt32(cmdKey | shiftKey),
            hotKeyID,
            GetApplicationEventTarget(),
            0,
            &hotKeyRef
        )
    }

    func stop() {
        if let hotKey = hotKeyRef { UnregisterEventHotKey(hotKey); hotKeyRef = nil }
        if let handler = eventHandlerRef { RemoveEventHandler(handler); eventHandlerRef = nil }
        if let pointer = selfPointer {
            Unmanaged<HotkeyManager>.fromOpaque(pointer).release()
            selfPointer = nil
        }
    }

    deinit { stop() }
}

private func fourCharCode(_ string: String) -> OSType {
    var result: OSType = 0
    for byte in string.utf8.prefix(4) {
        result = result << 8 | OSType(byte)
    }
    return result
}
