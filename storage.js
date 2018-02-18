const { StorageFlag } = require('./storageflags')

const F = StorageFlag

function createEntry(id, name, descriptor, size) {
    return {
        id, name, descriptor, size
    }
}

const Slots = { }
Slots.ARM_R =           0x01
Slots.ARM_L =           0x02
Slots.HEAD =            0x03
Slots.HANDS =           0x04
Slots.FEET =            0x05
Slots.BODY =            0x06
Slots.NECK =            0x07
Slots.FINGER =          0x08
Slots.WRIST =           0x09

Slots.INV0 =            0x20
Slots.INV1 =            0x21
Slots.INV2 =            0x22
Slots.INV3 =            0x23
Slots.INV4 =            0x24
Slots.INV5 =            0x25
Slots.INV6 =            0x26
Slots.INV7 =            0x27

const _ = createEntry

const Storage = { }
Storage.EQUIPMENT = _(0x01, "Equipment",
    [
        { id: Slots.ARM_R, flags: F.ARM },
        { id: Slots.ARM_L, flags: F.ARM },
        { id: Slots.HEAD, flags: F.HEAD },
        { id: Slots.HANDS, flags: F.HANDS },
        { id: Slots.FEET, flags: F.FEET },
        { id: Slots.BODY, flags: F.BODY },
        { id: Slots.NECK, flags: F.NECK },
        { id: Slots.FINGER, flags: F.FINGER }
        //{ id: Slots.WRIST, flags: F.WRIST },
    ], 8
)

Storage.INVENTORY = _(0x02, "Inventory",
    [
        { id: Slots.INV0, flags: F.ANY|F.INVENTORY },
        { id: Slots.INV1, flags: F.ANY|F.INVENTORY },
        { id: Slots.INV2, flags: F.ANY|F.INVENTORY },
        { id: Slots.INV3, flags: F.ANY|F.INVENTORY },
        { id: Slots.INV4, flags: F.ANY|F.INVENTORY },
        { id: Slots.INV5, flags: F.ANY|F.INVENTORY },
        { id: Slots.INV6, flags: F.ANY|F.INVENTORY },
        { id: Slots.INV7, flags: F.ANY|F.INVENTORY }
    ], 8
)

module.exports = { Storage, Slots }
