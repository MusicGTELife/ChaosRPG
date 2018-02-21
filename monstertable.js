const {
    MonsterClass,
    UndeadClass, BeastClass, HumanoidClass, EtherealClass, DemonClass
} = require('./monsterclass')

const { Tier } = require('./tier')
const { StatTable } = require('./stattable')
const { WeaponFlags } = require('./itemclass')

function createMonsterTableEntry(code, name, monsterClass, weaponFlags, baseExperience, stats) {
    return {
        code,
        name,
        monster_class: monsterClass,
        weaponFlags,
        base_experience: baseExperience,
        stats
    }
}

const MonsterTable = { }
const _ = createMonsterTableEntry
const MC = MonsterClass
const ST = StatTable
const WF = WeaponFlags

MonsterTable.GOBLIN = _(
    0x0001, 'Goblin', MC.BEAST, WF.MELEE_1H, 50, [
    { id: ST.DEX.id, value: 4 },
    { id: ST.INT.id, value: 2 },
    { id: ST.STR.id, value: 3 },
    { id: ST.VIT.id, value: 6 },
    { id: StatTable.BASE_MATK.id, value: 0 },
    { id: StatTable.BASE_ATK.id, value: 2 }
])

MonsterTable.SKELETON_WARRIOR = _(
    0x0100, 'Skeleton Warrior', MC.UNDEAD, WF.ANY_MELEE|WF.CAN_DUAL_WIELD, 75, [
    { id: ST.DEX.id, value: 3 },
    { id: ST.INT.id, value: 2 },
    { id: ST.STR.id, value: 4 },
    { id: ST.VIT.id, value: 7 },
    { id: StatTable.BASE_MATK.id, value: 0 },
    { id: StatTable.BASE_ATK.id, value: 2 }
])
MonsterTable.SKELETON_ARCHER = _(
    0x0101, 'Skeleton Archer', MC.UNDEAD, WF.RANGED, 75, [
    { id: ST.DEX.id, value: 5 },
    { id: ST.INT.id, value: 1 },
    { id: ST.STR.id, value: 3 },
    { id: ST.VIT.id, value: 7 },
    { id: StatTable.BASE_MATK.id, value: 0 },
    { id: StatTable.BASE_ATK.id, value: 2 }
])
MonsterTable.SKELETON_MAGE = _(
    0x0102, 'Skeleton Mage', MC.UNDEAD, WF.ANY_CASTING, 75, [
    { id: ST.DEX.id, value: 2 },
    { id: ST.INT.id, value: 6 },
    { id: ST.STR.id, value: 2 },
    { id: ST.VIT.id, value: 6 },
    { id: StatTable.BASE_MATK.id, value: 2 },
    { id: StatTable.BASE_ATK.id, value: 0 }
])
MonsterTable.ZOMBIE = _(
    0x0110, 'Zombie', MC.UNDEAD, WF.ANY_MELEE, 80, [
    { id: ST.DEX.id, value: 4 },
    { id: ST.INT.id, value: 2 },
    { id: ST.STR.id, value: 5 },
    { id: ST.VIT.id, value: 7 },
    { id: StatTable.BASE_MATK.id, value: 0 },
    { id: StatTable.BASE_ATK.id, value: 3 }
])

MonsterTable.GUARD = _(
    0x0200, 'Guard', MC.HUMANOID, WF.ANY_MELEE|WF.CAN_DUAL_WIELD, 90, [
    { id: ST.DEX.id, value: 4 },
    { id: ST.INT.id, value: 2 },
    { id: ST.STR.id, value: 5 },
    { id: ST.VIT.id, value: 7 },
    { id: StatTable.BASE_MATK.id, value: 0 },
    { id: StatTable.BASE_ATK.id, value: 3 }
])

MonsterTable.WITCH = _(
    0x0280, 'Witch', MC.HUMANOID, WF.ANY_CASTING, 90, [
    { id: ST.DEX.id, value: 3 },
    { id: ST.INT.id, value: 6 },
    { id: ST.STR.id, value: 2 },
    { id: ST.VIT.id, value: 7 },
    { id: StatTable.BASE_MATK.id, value: 3 },
    { id: StatTable.BASE_ATK.id, value: 0 }
])

MonsterTable.GIANT = _(
    0x0300, 'Giant', MC.HUMANOID, WF.MELEE_2H|WF.CAN_DUAL_WIELD, 100, [
    { id: ST.DEX.id, value: 4 },
    { id: ST.INT.id, value: 2 },
    { id: ST.STR.id, value: 5 },
    { id: ST.VIT.id, value: 9 },
    { id: StatTable.BASE_MATK.id, value: 0 },
    { id: StatTable.BASE_ATK.id, value: 4 }
])

module.exports = { MonsterTable }
