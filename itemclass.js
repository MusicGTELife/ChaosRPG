const ItemClass = { }
ItemClass.ARMOR =               0x01
ItemClass.WEAPON =              0x02
ItemClass.JEWELLERY =           0x03

const ArmorClass = { }
ArmorClass.HELMET =             0x01
ArmorClass.GLOVES =             0x02
ArmorClass.BOOTS =              0x03
ArmorClass.SHIELD =             0x04
ArmorClass.BODY_ARMOR =         0x05

const WeaponClass = { }
WeaponClass.MELEE_1H =          0x01
WeaponClass.MELEE_2H =          0x02
WeaponClass.CASTING_1H =        0x03
WeaponClass.CASTING_2H =        0x04
WeaponClass.RANGED =            0x05

const JewelClass = { }
JewelClass.RING =               0x01
JewelClass.NECKLACE =           0x02
JewelClass.BRACELET =           0x03
JewelClass.CHARM =              0x04

module.exports = { ItemClass, ArmorClass, WeaponClass, JewelClass }
