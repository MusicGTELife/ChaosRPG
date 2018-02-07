const { ItemClass, ArmorClass, WeaponClass, JewelClass, WeaponFlags, JewelFlags } = require('./itemclass')
const { StorageFlag } = require('./storageflags')
const { Material, MaterialFlags } = require('./material')
const { StatTable } = require('./stattable')

function createEntry(code, name, storageFlag, itemClass, itemSubClass, requirements) {
    return {
        code,
        name,
        storage_flag: storageFlag,
        item_class: itemClass,
        item_sub_class: itemSubClass,
        requirements
    }
}

function createRequirement(statId, value) {
    return {
        id: statId,
        value
    }
}

const ItemTable = { }

// helpers to make things more concise
const _ = createEntry
const CR = createRequirement
const ST = StatTable
const SF = StorageFlag
const IC = ItemClass
const AC = ArmorClass
const WC = WeaponClass
const JC = JewelClass

// Armor
ItemTable.GREAT_HELM = _(0x0001, "Great Helmet", SF.HEAD, IC.ARMOR, AC.HELMET,
    [ CR(ST.DEX.id, 3), CR(ST.STR.id, 4) ]
)
ItemTable.FACE_MASK = _(0x0002, "Mask", SF.HEAD, IC.ARMOR, AC.HELMET,
    [ CR(ST.DEX.id, 2), CR(ST.STR.id, 3) ]
)
ItemTable.LIGHT_GLOVES = _(0x0100, "Light Gloves", SF.HANDS, IC.ARMOR, AC.GLOVES,
    [ CR(ST.STR.id, 1), CR(ST.DEX.id, 2) ]
)
ItemTable.SMALL_SHIELD = _(0x0800, "Small Shield", SF.ARM, IC.ARMOR, AC.SHIELD,
    [ CR(ST.DEX.id, 2), CR(ST.STR.id, 4) ]
)
ItemTable.APPRENTICE_BOOK = _(0x0900, "Apprentice's Spell Book", SF.ARM, IC.ARMOR, AC.SPELLBOOK,
    [ CR(ST.INT.id, 4), CR(ST.VIT.id, 3) ]
)

// Weapons
ItemTable.DAGGER = _(0x1000, "Dagger", SF.ARM, IC.WEAPON, WC.MELEE_1H,
    [ CR(ST.DEX.id, 5), CR(ST.STR.id, 5) ]
)
ItemTable.RAPIER = _(0x1080, "Rapier", SF.ARM, IC.WEAPON, WC.MELEE_1H,
    [ CR(ST.DEX.id, 5), CR(ST.STR.id, 8) ]
)
ItemTable.POLEARM = _(0x1100, "Polearm", SF.ARM, IC.WEAPON, WC.MELEE_2H,
    [ CR(ST.DEX.id, 5), CR(ST.STR.id, 8) ]
)
ItemTable.BOW = _(0x1200, "Bow", SF.ARM, IC.WEAPON, WC.RANGED,
    [ CR(ST.DEX.id, 5), CR(ST.STR.id, 8) ]
)
ItemTable.WAND = _(0x1300, "Wand", SF.ARM, IC.WEAPON, WC.CASTING_1H,
    [ CR(ST.DEX.id, 5), CR(ST.STR.id, 8) ]
)
ItemTable.STAFF = _(0x1380, "Staff", SF.ARM, IC.WEAPON, WC.CASTING_2H,
    [ CR(ST.DEX.id, 5), CR(ST.STR.id, 8) ]
)

// Jewellery
ItemTable.RING = _(0x2000, "Ring", SF.FINGER, IC.JEWEL, JC.RING,
    [ CR(ST.DEX.id, 5), CR(ST.STR.id, 8) ]
)
ItemTable.NECKLACE = _(0x2100, "Necklace", SF.NECK, IC.JEWEL, JC.NECKLACE,
    [ CR(ST.DEX.id, 5), CR(ST.STR.id, 8) ]
)
ItemTable.BRACELET = _(0x2200, "Bracelet", SF.WRIST, IC.JEWEL, JC.BRACELET,
    [ CR(ST.DEX.id, 5), CR(ST.STR.id, 8) ]
)
ItemTable.CHARM = _(0x2300, "Small Charm", SF.INVENTORY, IC.JEWEL, JC.CHARM,
    [ CR(ST.DEX.id, 5), CR(ST.STR.id, 8) ]
)

module.exports = { ItemTable }
