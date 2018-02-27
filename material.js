const Flag = { }
Flag.ARMOR =            0x01
Flag.WEAPON =           0x01 << 1
Flag.JEWEL =            0x01 << 2

function createEntry(id, name, flag) {
    return {
        id,
        name,
        flag
    }
}

const MaterialClass = { }
const _ = createEntry

MaterialClass.CLOTH = _(0x01, 'Cloth', Flag.ARMOR)
MaterialClass.LEATHER = _(0x02, 'Leather', Flag.ARMOR)
MaterialClass.CRYSTAL = _(0x03, 'Crystal', Flag.WEAPON | Flag.JEWEL)
MaterialClass.METAL = _(0x04, 'Metal', Flag.ARMOR | Flag.WEAPON | Flag.JEWEL)
MaterialClass.ETHEREAL = _(0x05, 'Ethereal', Flag.ARMOR | Flag.WEAPON | Flag.JEWEL)

module.exports = { 'MaterialFlag': Flag, MaterialClass }
