const { StorageFlag } = require('./storageflags')

const F = StorageFlag

const Storage = { }
Storage.EQUIPMENT = {
    id: 0x01, name: "Equipment",
    descriptor: [
        F.ARM_R, F.ARM_L, F.HEAD, F.HANDS, F.FEET, F.BODY, F.NECK, F.FINGER
    ],
    size: 8
}

Storage.INVENTORY = {
    id: 0x02, name: "Inventory",
    descriptor: [ F.ANY, F.ANY, F.ANY, F.ANY, F.ANY, F.ANY, F.ANY, F.ANY ],
    size: 8
}

module.exports = { Storage }
