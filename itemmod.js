const { Table } = require('./tableutil')
const { StatTable } = require('./stattable')

const ItemModClass = { }

ItemModClass.MINOR = { 'id': 0x01, 'name': 'Minor' }
ItemModClass.MAJOR = { 'id': 0x02, 'name': 'Major' }
ItemModClass.IMPLICIT = { 'id': 0xff, 'name': 'Implicit' }

function createItemModTableEntry(id, name, modClass, stats) {
    return { id, name, 'mod_class': modClass, 'stat_descriptor': stats }
}

const ItemModTable = Table.create(createItemModTableEntry)
const _ = ItemModTable.createEntry

ItemModTable.INT = _(
    0x0001, 'intelligence', ItemModClass.MINOR.id,
    [ { 'id': StatTable.INT.id, 'min_value': 1, 'max_value': 5 } ]
)
ItemModTable.DEX = _(
    0x0002, 'dexterity', ItemModClass.MINOR.id,
    [ { 'id': StatTable.DEX.id, 'min_value': 1, 'max_value': 5 } ]
)
ItemModTable.STR = _(
    0x0003, 'strength', ItemModClass.MINOR.id,
    [ { 'id': StatTable.STR.id, 'min_value': 1, 'max_value': 5 } ]
)
ItemModTable.VIT = _(
    0x0004, 'vitality', ItemModClass.MINOR.id,
    [ { 'id': StatTable.VIT.id, 'min_value': 1, 'max_value': 5 } ]
)

ItemModTable.ALL_ATTR = _(
    0x0010, 'All Attr', ItemModClass.MINOR.id,
    [ { 'id': StatTable.ALL_ATTR.id, 'min_value': 1, 'max_value': 3 } ]
)

ItemModTable.ATK = _(
    0x0100, 'attack', ItemModClass.MINOR.id,
    [ { 'id': StatTable.ATK.id, 'min_value': 1, 'max_value': 10 } ]
)
ItemModTable.MATK = _(
    0x0101, 'force', ItemModClass.MINOR.id,
    [ { 'id': StatTable.MATK.id, 'min_value': 1, 'max_value': 10 } ]
)
ItemModTable.DEF = _(
    0x0102, 'defense', ItemModClass.MINOR.id,
    [ { 'id': StatTable.DEF.id, 'min_value': 1, 'max_value': 10 } ]
)
ItemModTable.MDEF = _(
    0x0103, 'resistance', ItemModClass.MINOR.id,
    [ { 'id': StatTable.MDEF.id, 'min_value': 1, 'max_value': 10 } ]
)

ItemModTable.HP = _(
    0x0110, 'hit points', ItemModClass.MINOR.id,
    [ { 'id': StatTable.HP.id, 'min_value': 1, 'max_value': 10 } ]
)

ItemModTable.ACCURACY = _(
    0x0120, 'accuracy', ItemModClass.MINOR.id,
    [ { 'id': StatTable.ACCURACY.id, 'min_value': 10, 'max_value': 50 } ]
)

ItemModTable.REACTION = _(
    0x0121, 'reaction', ItemModClass.MINOR.id,
    [ { 'id': StatTable.REACTION.id, 'min_value': 1, 'max_value': 10 } ]
)

module.exports = { ItemModClass, ItemModTable }
