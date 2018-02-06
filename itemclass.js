const ItemClass = { }
ItemClass.ARMOR =               0x01
ItemClass.WEAPON =              0x02
ItemClass.JEWEL =               0x03

const ArmorClass = { }
ArmorClass.HELMET =             0x01
ArmorClass.GLOVES =             0x02
ArmorClass.BOOTS =              0x03
ArmorClass.BODY_ARMOR =         0x04
ArmorClass.SHIELD =             0x05
ArmorClass.SPELLBOOK =          0x06
ArmorClass.QUIVER =             0x07

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

const WeaponFlags = { }
WeaponFlags.MELEE_1H =          0x01
WeaponFlags.MELEE_2H =          0x01 << 1
WeaponFlags.CASTING_1H =        0x01 << 2
WeaponFlags.CASTING_2H =        0x01 << 3
WeaponFlags.RANGED =            0x01 << 4
WeaponFlags.CAN_DUAL_WIELD =    0x01 << 5
WeaponFlags.MELEE_ANY =         0x01 << 6
WeaponFlags.CASTING_ANY =       0x01 << 7
WeaponFlags.ANY_2H =            WeaponFlags.MELEE_2H | WeaponFlags.CASTING_2H

const JewelFlags = { }
JewelFlags.CHARM =              0x01

module.exports = {
    ItemClass, ArmorClass, WeaponClass, JewelClass, WeaponFlags, JewelFlags
}
