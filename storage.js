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

Slots.GROUND =          0xff

const _ = createEntry

const Storage = { }
Storage.EQUIPMENT = _(0x01, "Equipment",
    [
        { id: Slots.ARM_R, name: 'RightArm', flags: F.ARM },
        { id: Slots.ARM_L, name: 'LeftArm', flags: F.ARM },
        { id: Slots.HEAD, name: 'Head', flags: F.HEAD },
        { id: Slots.HANDS, name: 'Hands', flags: F.HANDS },
        { id: Slots.FEET, name: 'Feet', flags: F.FEET },
        { id: Slots.BODY, name: 'Body', flags: F.BODY },
        { id: Slots.NECK, name: 'Neck', flags: F.NECK },
        { id: Slots.FINGER, name: 'Ring', flags: F.FINGER }
        //{ id: Slots.WRIST, flags: F.WRIST },
    ], 8
)

Storage.INVENTORY = _(0x02, "Inventory",
    [
        { id: Slots.INV0, name: 'Slot1', flags: F.ANY|F.INVENTORY },
        { id: Slots.INV1, name: 'Slot2', flags: F.ANY|F.INVENTORY },
        { id: Slots.INV2, name: 'Slot3', flags: F.ANY|F.INVENTORY },
        { id: Slots.INV3, name: 'Slot4', flags: F.ANY|F.INVENTORY },
        { id: Slots.INV4, name: 'Slot5', flags: F.ANY|F.INVENTORY },
        { id: Slots.INV5, name: 'Slot6', flags: F.ANY|F.INVENTORY },
        { id: Slots.INV6, name: 'Slot7', flags: F.ANY|F.INVENTORY },
        { id: Slots.INV7, name: 'Slot8', flags: F.ANY|F.INVENTORY }
    ], 8
)

module.exports = { Storage, Slots }
