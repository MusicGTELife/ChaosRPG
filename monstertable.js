const { Tier } = require('./tier')

function createMonsterTableEntry(id, level, name, tier) {
    return {
        id,
        level,
        name,
        tier
    }
}

const MonsterTable = { }
const _ = createMonsterTableEntry

MonsterTable.GOBLIN = _ (0x0001, 'Goblin')
MonsterTable.SKELETON = _(0x0002, 'Skeleton')
MonsterTable.GIANT = _(0x0003, 'Giant')

module.exports = { MonsterTable }
