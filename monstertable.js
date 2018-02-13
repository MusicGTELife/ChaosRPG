const {
    MonsterClass,
    UndeadClass, BeastClass, HumanoidClass, EtherealClass, DemonClass
} = require('./monsterclass')

const { Tier } = require('./tier')
const { StatTable } = require('./stattable')
const { WeaponFlags } = require('./itemclass')

function createMonsterTableEntry(code, name, monsterClass, monsterSubClass, weaponFlags, stats) {
    return {
        code,
        name,
        monster_class: monsterClass,
        monster_sub_class: monsterSubClass,
        weaponFlags,
        stats
    }
}

const MonsterTable = { }
const _ = createMonsterTableEntry
const MC = MonsterClass
const ST = StatTable
const WF = WeaponFlags

MonsterTable.GOBLIN = _(
    0x0001, 'Goblin', MC.BEAST, BeastClass.MAMMAL, WF.MELEE_1H, [
    { id: ST.DEX.id, value: 3 },
    { id: ST.INT.id, value: 1 },
    { id: ST.STR.id, value: 3 },
    { id: ST.VIT.id, value: 2 },
    { id: StatTable.BASE_MATK.id, value: 0 },
    { id: StatTable.BASE_ATK.id, value: 1 }
])

MonsterTable.SKELETON_WARRIOR = _(
    0x0100, 'Skeleton Warrior', MC.UNDEAD, UndeadClass.SKELETON, WF.ANY_MELEE, [
    { id: ST.DEX.id, value: 4 },
    { id: ST.INT.id, value: 2 },
    { id: ST.STR.id, value: 4 },
    { id: ST.VIT.id, value: 3 },
    { id: StatTable.BASE_MATK.id, value: 0 },
    { id: StatTable.BASE_ATK.id, value: 2 }
])
MonsterTable.SKELETON_ARCHER = _(
    0x0101, 'Skeleton Archer', MC.UNDEAD, UndeadClass.SKELETON, WF.RANGED, [
    { id: ST.DEX.id, value: 4 },
    { id: ST.INT.id, value: 2 },
    { id: ST.STR.id, value: 4 },
    { id: ST.VIT.id, value: 3 },
    { id: StatTable.BASE_MATK.id, value: 0 },
    { id: StatTable.BASE_ATK.id, value: 2 }
])
MonsterTable.SKELETON_MAGE = _(
    0x0102, 'Skeleton Mage', MC.UNDEAD, UndeadClass.SKELETON, WF.CASTING_1H, [
    { id: ST.DEX.id, value: 2 },
    { id: ST.INT.id, value: 5 },
    { id: ST.STR.id, value: 2 },
    { id: ST.VIT.id, value: 4 },
    { id: StatTable.BASE_MATK.id, value: 2 },
    { id: StatTable.BASE_ATK.id, value: 0 }
])
MonsterTable.GIANT = _(
    0x0200, 'Giant', MC.HUMANOID, HumanoidClass.DARKSWORN, WF.MELEE_2H, [
    { id: ST.DEX.id, value: 3 },
    { id: ST.INT.id, value: 2 },
    { id: ST.STR.id, value: 4 },
    { id: ST.VIT.id, value: 4 },
    { id: StatTable.BASE_MATK.id, value: 0 },
    { id: StatTable.BASE_ATK.id, value: 3 }
])

module.exports = { MonsterTable }
