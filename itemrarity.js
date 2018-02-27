function createEntry(id, name) {
    return {
        id,
        name
    }
}

const ItemRarity = { }
ItemRarity.INFERIOR = createEntry(0x00, 'Inferior')
ItemRarity.COMMON = createEntry(0x01, 'Common')
ItemRarity.MAGIC = createEntry(0x02, 'Magic')
ItemRarity.ENCHANTED = createEntry(0x03, 'Enchanted')
ItemRarity.EPIC = createEntry(0x04, 'Epic')
ItemRarity.UNIQUE = createEntry(0x05, 'Unique')

module.exports = { ItemRarity }
