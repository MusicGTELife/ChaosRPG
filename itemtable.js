const { ItemClass, ArmorClass, WeaponClass, JewelClass } = require('./itemclass')
const { StorageFlag } = require('./storageflags')
// const { Material, MaterialFlags } = require('./material')
const { StatTable } = require('./stattable')

function createEntry(code, name, storageFlag, itemClass, itemSubClass, requirements, implicitStats, isStarterItem) {
    return {
        code,
        name,
        'storage_flag': storageFlag,
        'item_class': itemClass,
        'item_sub_class': itemSubClass,
        requirements,
        'implicit_stats': implicitStats,
        'is_starter_item': isStarterItem
    }
}

function createRequirement(statId, value) {
    return {
        'id': statId,
        value
    }
}

function createImplicitStatRange(statId, min, max) {
    return {
        'id': statId,
        min,
        max
    }
}

const ItemTable = { }

// helpers to make things more concise
const _ = createEntry
const cr = createRequirement
const ci = createImplicitStatRange

const st = StatTable
const sf = StorageFlag
const ic = ItemClass
const ac = ArmorClass
const wc = WeaponClass
const jc = JewelClass

// Player starter items
ItemTable.CRACKED_WAND = _(0x0001, 'Cracked Wand', sf.INVENTORY | sf.ARM, ic.WEAPON, ac.CASTING_1H,
    [ cr(st.INT.id, 1), cr(st.VIT.id, 1) ], [ ci(st.BASE_MATK.id, 3, 3) ],
    true
)
ItemTable.CRACKED_STAFF = _(0x0002, 'Cracked Staff', sf.INVENTORY | sf.ARM, ic.WEAPON, ac.CASTING_2H,
    [ cr(st.INT.id, 1), cr(st.VIT.id, 1) ], [ ci(st.BASE_ATK.id, 2, 2), ci(st.BASE_MATK.id, 3, 3) ],
    true
)
ItemTable.CRACKED_BOW = _(0x0003, 'Cracked Bow', sf.INVENTORY | sf.ARM, ic.WEAPON, ac.RANGED,
    [ cr(st.STR.id, 1), cr(st.DEX.id, 1) ], [ ci(st.BASE_ATK.id, 3, 3) ],
    true
)
ItemTable.CRACKED_DAGGER = _(0x0004, 'Cracked Dagger', sf.INVENTORY | sf.ARM, ic.WEAPON, ac.MELEE_1H,
    [ cr(st.STR.id, 1), cr(st.DEX.id, 1) ], [ ci(st.BASE_ATK.id, 1, 1), ci(st.BASE_MATK.id, 2, 2) ],
    true
)
ItemTable.CRACKED_SWORD = _(0x0005, 'Cracked Sword', sf.INVENTORY | sf.ARM, ic.WEAPON, ac.MELEE_1H,
    [ cr(st.STR.id, 1), cr(st.DEX.id, 1) ], [ ci(st.BASE_ATK.id, 3, 3) ],
    true
)

// Armor
ItemTable.GREAT_HELM = _(0x0400, 'Great Helmet', sf.INVENTORY | sf.HEAD, ic.ARMOR, ac.HELMET,
    [ cr(st.DEX.id, 3), cr(st.STR.id, 4) ], [ ci(st.DEF.id, 10, 20) ],
    false
)
ItemTable.FACE_MASK = _(0x0401, 'Mask', sf.INVENTORY | sf.HEAD, ic.ARMOR, ac.HELMET,
    [ cr(st.DEX.id, 2), cr(st.STR.id, 3) ], [ ci(st.DEF.id, 5, 10), ci(st.MDEF.id, 5, 10) ],
    false
)

ItemTable.LIGHT_GLOVES = _(0x0500, 'Light Gloves', sf.INVENTORY | sf.HANDS, ic.ARMOR, ac.GLOVES,
    [ cr(st.STR.id, 1), cr(st.DEX.id, 2) ], [ ci(st.DEF.id, 5, 10) ],
    false
)
ItemTable.CHAIN_GLOVES = _(0x0510, 'Chain Gloves', sf.INVENTORY | sf.HANDS, ic.ARMOR, ac.GLOVES,
    [ cr(st.STR.id, 3), cr(st.DEX.id, 4) ], [ ci(st.DEF.id, 10, 15) ],
    false
)

ItemTable.CHAIN_BOOTS = _(0x0580, 'Chain Boots', sf.INVENTORY | sf.FEET, ic.ARMOR, ac.BOOTS,
    [ cr(st.STR.id, 3), cr(st.DEX.id, 4) ], [ ci(st.DEF.id, 10, 20) ],
    false
)
ItemTable.SILK_BOOTS = _(0x0581, 'Silk Boots', sf.INVENTORY | sf.FEET, ic.ARMOR, ac.BOOTS,
    [ cr(st.INT.id, 6), cr(st.DEX.id, 4) ], [ ci(st.DEF.id, 5, 10), ci(st.MDEF.id, 5, 10) ],
    false
)

ItemTable.CHAINMAIL = _(0x05a0, 'Chainmail', sf.INVENTORY | sf.BODY, ic.ARMOR, ac.BODY_ARMOR,
    [ cr(st.STR.id, 8), cr(st.DEX.id, 4) ], [ ci(st.DEF.id, 15, 30) ],
    false
)
ItemTable.ROBE = _(0x05c0, 'Robe', sf.INVENTORY | sf.BODY, ic.ARMOR, ac.BODY_ARMOR,
    [ cr(st.VIT.id, 12), cr(st.INT.id, 8) ], [ ci(st.MDEF.id, 5, 10), ci(st.MDEF.id, 5, 15) ],
    false
)

ItemTable.SMALL_SHIELD = _(0x0600, 'Small Shield', sf.INVENTORY | sf.ARM, ic.ARMOR, ac.SHIELD,
    [ cr(st.DEX.id, 2), cr(st.STR.id, 4) ], [ ci(st.BLOCK.id, 5, 10), ci(st.DEF.id, 5, 10) ],
    false
)
ItemTable.APPRENTICE_BOOK = _(0x0700, "Apprentice's Spell Book", sf.INVENTORY | sf.ARM, ic.ARMOR, ac.SPELLBOOK,
    [ cr(st.INT.id, 4), cr(st.VIT.id, 4) ], [ ci(st.BASE_MATK.id, 3, 5), ci(st.BLOCK.id, 3, 5) ],
    false
)
ItemTable.QUIVER = _(0x0800, 'Quiver', sf.INVENTORY | sf.ARM, ic.ARMOR, ac.QUIVER,
    [ cr(st.DEX.id, 5), cr(st.STR.id, 4) ], [ ci(st.BASE_ATK.id, 3, 5), ci(st.ACCURACY.id, 20, 50) ],
    false
)

// Weapons
ItemTable.DAGGER = _(0x1000, 'Dagger', sf.INVENTORY | sf.ARM, ic.WEAPON, wc.MELEE_1H,
    [ cr(st.DEX.id, 4), cr(st.STR.id, 4) ], [ ci(st.BASE_ATK.id, 1, 2), ci(st.BASE_MATK.id, 2, 3) ],
    false
)
ItemTable.RAPIER = _(0x1080, 'Rapier', sf.INVENTORY | sf.ARM, ic.WEAPON, wc.MELEE_1H,
    [ cr(st.DEX.id, 4), cr(st.STR.id, 6) ], [ ci(st.BASE_ATK.id, 3, 5) ],
    false
)
ItemTable.POLEARM = _(0x1100, 'Polearm', sf.INVENTORY | sf.ARM, ic.WEAPON, wc.MELEE_2H,
    [ cr(st.DEX.id, 4), cr(st.STR.id, 6) ], [ ci(st.BASE_ATK.id, 6, 11) ],
    false
)
ItemTable.BOW = _(0x1200, 'Bow', sf.INVENTORY | sf.ARM, ic.WEAPON, wc.RANGED,
    [ cr(st.DEX.id, 6), cr(st.STR.id, 4) ], [ ci(st.BASE_ATK.id, 3, 4), ci(st.REACTION.id, 2, 5) ],
    false
)
ItemTable.CROSSBOW = _(0x1280, 'Crossbow', sf.INVENTORY | sf.ARM, ic.WEAPON, wc.RANGED,
    [ cr(st.DEX.id, 6), cr(st.STR.id, 4) ], [ ci(st.BASE_ATK.id, 3, 5) ],
    false
)
ItemTable.WAND = _(0x1300, 'Wand', sf.INVENTORY | sf.ARM, ic.WEAPON, wc.CASTING_1H,
    [ cr(st.INT.id, 6), cr(st.STR.id, 2) ], [ ci(st.BASE_MATK.id, 3, 5) ],
    false
)
ItemTable.STAFF = _(0x1380, 'Staff', sf.INVENTORY | sf.ARM, ic.WEAPON, wc.CASTING_2H,
    [ cr(st.INT.id, 4), cr(st.STR.id, 6) ], [ ci(st.BASE_ATK.id, 2, 4), ci(st.BASE_MATK.id, 4, 7) ],
    false
)

// Jewellery
ItemTable.RING = _(0x2000, 'Ring', sf.INVENTORY | sf.FINGER, ic.JEWEL, jc.RING,
    [ cr(st.DEX.id, 4), cr(st.STR.id, 4) ], [ ],
    false
)
ItemTable.NECKLACE = _(0x2100, 'Necklace', sf.INVENTORY | sf.NECK, ic.JEWEL, jc.NECKLACE,
    [ cr(st.DEX.id, 4), cr(st.STR.id, 4) ], [ ],
    false
)
ItemTable.CHARM = _(0x2300, 'Small Charm', sf.INVENTORY, ic.JEWEL, jc.CHARM,
    [ cr(st.DEX.id, 4), cr(st.STR.id, 4) ], [ ],
    false
)

module.exports = { ItemTable }
