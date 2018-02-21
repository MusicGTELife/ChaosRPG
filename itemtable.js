const { ItemClass, ArmorClass, WeaponClass, JewelClass, WeaponFlags, JewelFlags } = require('./itemclass')
const { StorageFlag } = require('./storageflags')
const { Material, MaterialFlags } = require('./material')
const { StatTable } = require('./stattable')

function createEntry(code, name, storageFlag, itemClass, itemSubClass, requirements, implicitStats, isStarterItem) {
    return {
        code,
        name,
        storage_flag: storageFlag,
        item_class: itemClass,
        item_sub_class: itemSubClass,
        requirements,
        implicit_stats: implicitStats,
        is_starter_item: isStarterItem
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

// Player starter items
ItemTable.CRACKED_WAND = _(0x0001, "Cracked Wand", SF.INVENTORY|SF.ARM, IC.WEAPON, AC.CASTING_1H,
    [ CR(ST.INT.id, 1), CR(ST.VIT.id, 1) ], [ CR(ST.BASE_MATK.id, 1) ],
    true
)
ItemTable.CRACKED_STAFF = _(0x0002, "Cracked Staff", SF.INVENTORY|SF.ARM, IC.WEAPON, AC.CASTING_2H,
    [ CR(ST.INT.id, 1), CR(ST.VIT.id, 1) ], [CR(ST.BASE_ATK.id, 1), CR(ST.BASE_MATK.id, 1) ],
    true
)
ItemTable.CRACKED_BOW = _(0x0003, "Cracked Bow", SF.INVENTORY|SF.ARM, IC.WEAPON, AC.RANGED,
    [ CR(ST.STR.id, 1), CR(ST.DEX.id, 1) ], [ CR(ST.BASE_ATK.id, 1) ],
    true
)
ItemTable.CRACKED_DAGGER = _(0x0004, "Cracked Dagger", SF.INVENTORY|SF.ARM, IC.WEAPON, AC.MELEE_1H,
    [ CR(ST.STR.id, 1), CR(ST.DEX.id, 1) ], [ CR(ST.BASE_ATK.id, 1) ],
    true
)
ItemTable.CRACKED_SWORD = _(0x0005, "Cracked Sword", SF.INVENTORY|SF.ARM, IC.WEAPON, AC.MELEE_1H,
    [ CR(ST.STR.id, 1), CR(ST.DEX.id, 1) ], [ CR(ST.BASE_ATK.id, 1) ],
    true
)

// Armor
ItemTable.GREAT_HELM = _(0x0400, "Great Helmet", SF.INVENTORY|SF.HEAD, IC.ARMOR, AC.HELMET,
    [ CR(ST.DEX.id, 3), CR(ST.STR.id, 4) ], [ ],
    false
)
ItemTable.FACE_MASK = _(0x0401, "Mask", SF.INVENTORY|SF.HEAD, IC.ARMOR, AC.HELMET,
    [ CR(ST.DEX.id, 2), CR(ST.STR.id, 3) ], [ ],
    false
)
ItemTable.LIGHT_GLOVES = _(0x0500, "Light Gloves", SF.INVENTORY|SF.HANDS, IC.ARMOR, AC.GLOVES,
    [ CR(ST.STR.id, 1), CR(ST.DEX.id, 2) ], [ ],
    false
)
ItemTable.SMALL_SHIELD = _(0x0600, "Small Shield", SF.INVENTORY|SF.ARM, IC.ARMOR, AC.SHIELD,
    [ CR(ST.DEX.id, 2), CR(ST.STR.id, 4) ], [ CR(ST.BLOCK.id, 10) ],
    false
)
ItemTable.APPRENTICE_BOOK = _(0x0700, "Apprentice's Spell Book", SF.INVENTORY|SF.ARM, IC.ARMOR, AC.SPELLBOOK,
    [ CR(ST.INT.id, 4), CR(ST.VIT.id, 3) ], [ CR(ST.BASE_MATK.id, 1), CR(ST.BLOCK.id, 5) ],
    false
)
ItemTable.QUIVER = _(0x0800, "Quiver", SF.INVENTORY|SF.ARM, IC.ARMOR, AC.QUIVER,
    [ CR(ST.DEX.id, 5), CR(ST.STR.id, 3) ], [ CR(ST.BASE_ATK.id, 1) ],
    false
)

// Weapons
ItemTable.DAGGER = _(0x1000, "Dagger", SF.INVENTORY|SF.ARM, IC.WEAPON, WC.MELEE_1H,
    [ CR(ST.DEX.id, 3), CR(ST.STR.id, 3) ], [ CR(ST.BASE_ATK.id, 2) ],
    false
)
ItemTable.RAPIER = _(0x1080, "Rapier", SF.INVENTORY|SF.ARM, IC.WEAPON, WC.MELEE_1H,
    [ CR(ST.DEX.id, 2), CR(ST.STR.id, 4) ], [ CR(ST.BASE_ATK.id, 3) ],
    false
)
ItemTable.POLEARM = _(0x1100, "Polearm", SF.INVENTORY|SF.ARM, IC.WEAPON, WC.MELEE_2H,
    [ CR(ST.DEX.id, 4), CR(ST.STR.id, 6) ], [ CR(ST.BASE_ATK.id, 4) ],
    false
)
ItemTable.BOW = _(0x1200, "Bow", SF.INVENTORY|SF.ARM, IC.WEAPON, WC.RANGED,
    [ CR(ST.DEX.id, 5), CR(ST.STR.id, 4) ], [ CR(ST.BASE_ATK.id, 2) ],
    false
)
ItemTable.CROSSBOW = _(0x1280, "Crossbow", SF.INVENTORY|SF.ARM, IC.WEAPON, WC.RANGED,
    [ CR(ST.DEX.id, 6), CR(ST.STR.id, 4) ], [ CR(ST.BASE_ATK.id, 3) ],
    false
)
ItemTable.WAND = _(0x1300, "Wand", SF.INVENTORY|SF.ARM, IC.WEAPON, WC.CASTING_1H,
    [ CR(ST.INT.id, 5), CR(ST.STR.id, 2) ], [ CR(ST.BASE_MATK.id, 2) ],
    false
)
ItemTable.STAFF = _(0x1380, "Staff", SF.INVENTORY|SF.ARM, IC.WEAPON, WC.CASTING_2H,
    [ CR(ST.INT.id, 4), CR(ST.STR.id, 6) ], [ CR(ST.BASE_ATK.id, 1), CR(ST.BASE_MATK.id, 2) ],
    false
)

// Jewellery
ItemTable.RING = _(0x2000, "Ring", SF.INVENTORY|SF.FINGER, IC.JEWEL, JC.RING,
    [ CR(ST.DEX.id, 2), CR(ST.STR.id, 4) ], [ ],
    false
)
ItemTable.NECKLACE = _(0x2100, "Necklace", SF.INVENTORY|SF.NECK, IC.JEWEL, JC.NECKLACE,
    [ CR(ST.DEX.id, 2), CR(ST.STR.id, 4) ], [ ],
    false
)
ItemTable.CHARM = _(0x2300, "Small Charm", SF.INVENTORY, IC.JEWEL, JC.CHARM,
    [ CR(ST.DEX.id, 2), CR(ST.STR.id, 4) ], [ ],
    false
)

module.exports = { ItemTable }
