const { StatResolver } = require('./statresolver')
const { StatTable } = require('./stattable')

function createEntry(id, inputs, outputs, name, operation, value) {
    return {
        id,
        inputs,
        outputs,
        name,
        operation,
        value
    }
}

const StatModifier = { }
const _ = createEntry

StatModifier.ALL_ATTR =
    _(0x0001,
    [ StatTable.ALL_ATTR.id ],
    [ StatTable.STR.id, StatTable.DEX.id, StatTable.INT.id, StatTable.VIT.id ],
    "All attributes", StatResolver.add, 1)

StatModifier.HP_PER_VIT =
    _(0x0010, [ StatTable.VIT.id ], [ StatTable.HP.id ],
    "Hit points per", StatResolver.add, 4)

StatModifier.ATK_PER_STR =
    _(0x0030, [ StatTable.STR.id ], [ StatTable.ATK.id ],
    "Attack rating per", StatResolver.add, 2)
StatModifier.DEF_PER_DEX =
    _(0x0031, [ StatTable.DEX.id ], [ StatTable.DEF.id ],
    "Defense per", StatResolver.add, 2)

StatModifier.MATK_PER_INT =
    _(0x0040, [ StatTable.INT.id ], [ StatTable.MATK.id ],
    "Magic attack per", StatResolver.add, 2)
StatModifier.MDEF_PER_VIT =
    _(0x0041, [ StatTable.VIT.id ], [ StatTable.MDEF.id ],
    "Magic defence per", StatResolver.add, 2)

StatModifier.ACCURACY =
    _(0x0060, [ StatTable.DEX.id, StatTable.STR.id ], [ StatTable.ACCURACY.id ],
    "Accuracy", StatResolver.mult, 1.01)

StatModifier.REACTION =
    _(0x0061, [ StatTable.DEX.id, StatTable.VIT.id ], [ StatTable.REACTION.id ],
    "Reaction", StatResolver.add, 1)

/*
StatModifier.BASE_ATK =
    _(0x0080, [ StatTable.ATK.id ], [ StatTable.BASE_ATK.id ],
    "Base attack", StatResolver.add, 1.01)
StatModifier.BASE_MATK =
    _(0x0081, [ StatTable.MATK.id ], [ StatTable.BASE_MATK.id ],
    "Base magic attack", StatResolver.mult, 1.01)
*/

module.exports = { StatModifier }
