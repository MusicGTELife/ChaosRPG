const { MonsterClass } = require('./monsterclass')

// const { Tier } = require('./tier')
const { StatTable } = require('./stattable')
const { WeaponFlags } = require('./itemclass')

function createMonsterTableEntry(code, name, monsterClass, weaponFlags, baseExperience, stats) {
    return {
        code,
        name,
        'monster_class': monsterClass,
        weaponFlags,
        'base_experience': baseExperience,
        stats
    }
}

const MonsterTable = { }
const _ = createMonsterTableEntry
const mc = MonsterClass
const st = StatTable
const wf = WeaponFlags

MonsterTable.GOBLIN = _(
    0x0001, 'Goblin', mc.BEAST, wf.MELEE_1H, 50, [
        { 'id': st.DEX.id, 'value': 6 },
        { 'id': st.INT.id, 'value': 2 },
        { 'id': st.STR.id, 'value': 6 },
        { 'id': st.VIT.id, 'value': 6 },
        { 'id': st.BASE_MATK.id, 'value': 0 },
        { 'id': st.BASE_ATK.id, 'value': 3 },
        { 'id': st.ACCURACY.id, 'value': 100 }
    ])

MonsterTable.SPIDERLING = _(
    0x0002, 'Spiderling', mc.BEAST, wf.MELEE_1H, 40, [
        { 'id': st.DEX.id, 'value': 6 },
        { 'id': st.INT.id, 'value': 2 },
        { 'id': st.STR.id, 'value': 4 },
        { 'id': st.VIT.id, 'value': 6 },
        { 'id': st.BASE_MATK.id, 'value': 0 },
        { 'id': st.BASE_ATK.id, 'value': 3 },
        { 'id': st.ACCURACY.id, 'value': 100 }
    ])
MonsterTable.SPIDER = _(
    0x0003, 'Spider', mc.BEAST, wf.MELEE_1H, 60, [
        { 'id': st.DEX.id, 'value': 8 },
        { 'id': st.INT.id, 'value': 2 },
        { 'id': st.STR.id, 'value': 4 },
        { 'id': st.VIT.id, 'value': 8 },
        { 'id': st.BASE_MATK.id, 'value': 0 },
        { 'id': st.BASE_ATK.id, 'value': 4 },
        { 'id': st.ACCURACY.id, 'value': 100 }
    ])

MonsterTable.SCORPION = _(
    0x0004, 'Scorpion', mc.BEAST, wf.MELEE_1H, 60, [
        { 'id': st.DEX.id, 'value': 8 },
        { 'id': st.INT.id, 'value': 2 },
        { 'id': st.STR.id, 'value': 6 },
        { 'id': st.VIT.id, 'value': 6 },
        { 'id': st.BASE_MATK.id, 'value': 2 },
        { 'id': st.BASE_ATK.id, 'value': 2 },
        { 'id': st.ACCURACY.id, 'value': 100 }
    ])

MonsterTable.SKELETON_WARRIOR = _(
    0x0100, 'Skeleton Warrior', mc.UNDEAD, wf.ANY_MELEE | wf.CAN_DUAL_WIELD, 75, [
        { 'id': st.DEX.id, 'value': 4 },
        { 'id': st.INT.id, 'value': 2 },
        { 'id': st.STR.id, 'value': 8 },
        { 'id': st.VIT.id, 'value': 8 },
        { 'id': st.BASE_MATK.id, 'value': 0 },
        { 'id': st.BASE_ATK.id, 'value': 4 },
        { 'id': st.ACCURACY.id, 'value': 100 }
    ])
MonsterTable.SKELETON_ARCHER = _(
    0x0101, 'Skeleton Archer', mc.UNDEAD, wf.RANGED, 75, [
        { 'id': st.DEX.id, 'value': 8 },
        { 'id': st.INT.id, 'value': 2 },
        { 'id': st.STR.id, 'value': 4 },
        { 'id': st.VIT.id, 'value': 8 },
        { 'id': st.BASE_MATK.id, 'value': 0 },
        { 'id': st.BASE_ATK.id, 'value': 4 },
        { 'id': st.ACCURACY.id, 'value': 100 }
    ])
MonsterTable.SKELETON_MAGE = _(
    0x0102, 'Skeleton Mage', mc.UNDEAD, wf.ANY_CASTING, 75, [
        { 'id': st.DEX.id, 'value': 2 },
        { 'id': st.INT.id, 'value': 8 },
        { 'id': st.STR.id, 'value': 4 },
        { 'id': st.VIT.id, 'value': 8 },
        { 'id': st.BASE_MATK.id, 'value': 4 },
        { 'id': st.BASE_ATK.id, 'value': 0 },
        { 'id': st.ACCURACY.id, 'value': 100 }
    ])
MonsterTable.ZOMBIE = _(
    0x0110, 'Zombie', mc.UNDEAD, wf.ANY_MELEE, 80, [
        { 'id': st.DEX.id, 'value': 6 },
        { 'id': st.INT.id, 'value': 2 },
        { 'id': st.STR.id, 'value': 8 },
        { 'id': st.VIT.id, 'value': 8 },
        { 'id': st.BASE_MATK.id, 'value': 1 },
        { 'id': st.BASE_ATK.id, 'value': 3 },
        { 'id': st.ACCURACY.id, 'value': 100 }
    ])

MonsterTable.GUARD = _(
    0x0200, 'Guard', mc.HUMANOID, wf.ANY_MELEE | wf.CAN_DUAL_WIELD, 90, [
        { 'id': st.DEX.id, 'value': 6 },
        { 'id': st.INT.id, 'value': 2 },
        { 'id': st.STR.id, 'value': 8 },
        { 'id': st.VIT.id, 'value': 8 },
        { 'id': st.BASE_MATK.id, 'value': 0 },
        { 'id': st.BASE_ATK.id, 'value': 4 },
        { 'id': st.ACCURACY.id, 'value': 100 }
    ])

MonsterTable.WITCH = _(
    0x0280, 'Witch', mc.HUMANOID, wf.ANY_CASTING, 90, [
        { 'id': st.DEX.id, 'value': 4 },
        { 'id': st.INT.id, 'value': 9 },
        { 'id': st.STR.id, 'value': 4 },
        { 'id': st.VIT.id, 'value': 7 },
        { 'id': st.BASE_MATK.id, 'value': 4 },
        { 'id': st.BASE_ATK.id, 'value': 0 },
        { 'id': st.ACCURACY.id, 'value': 100 }
    ])

MonsterTable.GIANT = _(
    0x0300, 'Giant', mc.HUMANOID, wf.MELEE_2H | wf.CAN_DUAL_WIELD, 100, [
        { 'id': st.DEX.id, 'value': 6 },
        { 'id': st.INT.id, 'value': 2 },
        { 'id': st.STR.id, 'value': 8 },
        { 'id': st.VIT.id, 'value': 9 },
        { 'id': st.BASE_MATK.id, 'value': 0 },
        { 'id': st.BASE_ATK.id, 'value': 5 },
        { 'id': st.ACCURACY.id, 'value': 100 }
    ])

module.exports = { MonsterTable }
