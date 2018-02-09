const { Tier } = require('./tier')
const { StatTable } = require('./stattable')
const { WeaponFlags } = require('./itemclass')

function createMonsterTableEntry(code, name, weaponFlags, stats) {
    return {
        code,
        name,
        weaponFlags,
        stats
    }
}

const MonsterTable = { }
const _ = createMonsterTableEntry
const ST = StatTable
const WF = WeaponFlags

MonsterTable.GOBLIN = _(0x0001, 'Goblin', WF.MELEE_1H, [
    { id: ST.DEX.id, value: 2 },
    { id: ST.INT.id, value: 1 },
    { id: ST.STR.id, value: 2 },
    { id: ST.VIT.id, value: 2 }
])
MonsterTable.SKELETON_WARRIOR = _(0x0100, 'Skeleton Warrior', WF.MELEE_ANY, [
    { id: ST.DEX.id, value: 4 },
    { id: ST.INT.id, value: 2 },
    { id: ST.STR.id, value: 4 },
    { id: ST.VIT.id, value: 3 }
])
MonsterTable.SKELETON_ARCHER = _(0x0101, 'Skeleton Archer', WF.RANGED, [
    { id: ST.DEX.id, value: 4 },
    { id: ST.INT.id, value: 2 },
    { id: ST.STR.id, value: 4 },
    { id: ST.VIT.id, value: 3 }
])
MonsterTable.SKELETON_MAGE = _(0x0102, 'Skeleton Mage', WF.CASTING_1H, [
    { id: ST.DEX.id, value: 2 },
    { id: ST.INT.id, value: 5 },
    { id: ST.STR.id, value: 2 },
    { id: ST.VIT.id, value: 4 }
])
MonsterTable.GIANT = _(0x0200, 'Giant', WF.MELEE_2H, [
    { id: ST.DEX.id, value: 3 },
    { id: ST.INT.id, value: 2 },
    { id: ST.STR.id, value: 5 },
    { id: ST.VIT.id, value: 5 }
])

module.exports = { MonsterTable }
