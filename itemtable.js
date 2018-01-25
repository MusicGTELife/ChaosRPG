const { ItemClass, ArmorClass, WeaponClass, JewelClass } = require('./itemclass')
const { Material, MaterialFlags } = require('./material')

/*
ItemClass.ARMOR =               0x01
ItemClass.WEAPON =              0x02
ItemClass.JEWELLERY =           0x03

ArmorClass.HELMET =             0x01
ArmorClass.GLOVES =             0x02
ArmorClass.BOOTS =              0x03
ArmorClass.SHIELD =             0x04
ArmorClass.BODY_ARMOR =         0x05

WeaponClass.MELEE_1H =          0x01
WeaponClass.MELEE_2H =          0x02
WeaponClass.CASTING_1H =        0x03
WeaponClass.CASTING_2H =        0x04
WeaponClass.RANGED =            0x05

JewelleryClass.RING =           0x01
JewelleryClass.NECKLACE =       0x02
JewelleryClass.BRACELET =       0x03
JewelleryClass.CHARM =          0x04
*/

function createEntry(code, itemClass, itemSubClass, name) {
    return {
        code,
        item_class: itemClass,
        item_sub_class: itemSubClass,
        name
    }
}

const ItemTable = { }
const _ = createEntry

// Armor
ItemTable.GREAT_HELM = _(0x0001, ItemClass.ARMOR, ArmorClass.HELMET, "Great Helmet")
ItemTable.MASK = _(0x0002, ItemClass.ARMOR, ArmorClass.HELMET, "Mask")

module.exports = { ItemTable }
