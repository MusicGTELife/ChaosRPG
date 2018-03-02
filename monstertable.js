const { MonsterClass } = require('./monsterclass')

const { Tier } = require('./tier')
const { StatTable } = require('./stattable')
const { WeaponFlags } = require('./itemclass')

function createMonsterTableEntry(code, name, monsterClass, monsterTier, weaponFlags, baseExperience, stats) {
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
const t = Tier

// BEASTS

MonsterTable.GOBLIN = _(
    0x0001, 'Goblin', mc.BEAST, { 'min': t.TIER1.id, 'max': t.TIER2.id }, wf.MELEE_1H, 50, [
        { 'id': st.DEX.id, 'value': 6 },
        { 'id': st.INT.id, 'value': 2 },
        { 'id': st.STR.id, 'value': 6 },
        { 'id': st.VIT.id, 'value': 6 },
        { 'id': st.BASE_MATK.id, 'value': 0 },
        { 'id': st.BASE_ATK.id, 'value': 3 },
        { 'id': st.ACCURACY.id, 'value': 50 }
    ])

MonsterTable.SPIDERLING = _(
    0x0002, 'Spiderling', mc.BEAST, { 'min': t.TIER1.id, 'max': t.TIER1.id }, wf.MELEE_1H, 40, [
        { 'id': st.DEX.id, 'value': 6 },
        { 'id': st.INT.id, 'value': 2 },
        { 'id': st.STR.id, 'value': 4 },
        { 'id': st.VIT.id, 'value': 6 },
        { 'id': st.BASE_MATK.id, 'value': 0 },
        { 'id': st.BASE_ATK.id, 'value': 3 },
        { 'id': st.ACCURACY.id, 'value': 50 }
    ])

MonsterTable.SPIDER = _(
    0x0003, 'Spider', mc.BEAST, { 'min': t.TIER1.id, 'max': t.TIER3.id }, wf.MELEE_1H, 60, [
        { 'id': st.DEX.id, 'value': 8 },
        { 'id': st.INT.id, 'value': 2 },
        { 'id': st.STR.id, 'value': 4 },
        { 'id': st.VIT.id, 'value': 8 },
        { 'id': st.BASE_MATK.id, 'value': 0 },
        { 'id': st.BASE_ATK.id, 'value': 4 },
        { 'id': st.ACCURACY.id, 'value': 100 }
    ])

MonsterTable.SCORPION = _(
    0x0004, 'Scorpion', mc.BEAST, { 'min': t.TIER1.id, 'max': t.TIER4.id }, wf.MELEE_1H, 60, [
        { 'id': st.DEX.id, 'value': 8 },
        { 'id': st.INT.id, 'value': 2 },
        { 'id': st.STR.id, 'value': 6 },
        { 'id': st.VIT.id, 'value': 6 },
        { 'id': st.BASE_MATK.id, 'value': 2 },
        { 'id': st.BASE_ATK.id, 'value': 2 },
        { 'id': st.ACCURACY.id, 'value': 100 }
    ])

MonsterTable.GNOLL = _(
    0x0005, 'Gnoll', mc.BEAST, { 'min': t.TIER2.id, 'max': t.TIER4.id }, wf.ANY_MELEE | wf.CAN_DUAL_WIELD, 65, [
        { 'id': st.DEX.id, 'value': 6 },
        { 'id': st.INT.id, 'value': 2 },
        { 'id': st.STR.id, 'value': 6 },
        { 'id': st.VIT.id, 'value': 8 },
        { 'id': st.BASE_MATK.id, 'value': 0 },
        { 'id': st.BASE_ATK.id, 'value': 3 },
        { 'id': st.ACCURACY.id, 'value': 100 }
    ])

MonsterTable.SLIME = _(
    0x0006, 'Slime', mc.BEAST, { 'min': t.TIER1.id, 'max': t.TIER1.id }, wf.MELEE_1H, 25, [
        { 'id': st.DEX.id, 'value': 4 },
        { 'id': st.INT.id, 'value': 2 },
        { 'id': st.STR.id, 'value': 4 },
        { 'id': st.VIT.id, 'value': 5 },
        { 'id': st.BASE_MATK.id, 'value': 0 },
        { 'id': st.BASE_ATK.id, 'value': 2 },
        { 'id': st.ACCURACY.id, 'value': 10 }
    ])

MonsterTable.CARRION_CROW = _(
    0x0007, 'Carrion Crow', mc.BEAST, { 'min': t.TIER1.id, 'max': t.TIER3.id }, wf.MELEE_1H, 25, [
        { 'id': st.DEX.id, 'value': 6 },
        { 'id': st.INT.id, 'value': 5 },
        { 'id': st.STR.id, 'value': 3 },
        { 'id': st.VIT.id, 'value': 3 },
        { 'id': st.BASE_MATK.id, 'value': 0 },
        { 'id': st.BASE_ATK.id, 'value': 2 },
        { 'id': st.ACCURACY.id, 'value': 60 }
        // { 'id': st.LEECH_ATK.id, 'value': 10 }
    ])

MonsterTable.VAMPIRE_BAT = _(
    0x0008, 'Vampire Bat', mc.BEAST, { 'min': t.TIER2.id, 'max': t.TIER5.id }, wf.MELEE_1H, 30, [
        { 'id': st.DEX.id, 'value': 8 },
        { 'id': st.INT.id, 'value': 5 },
        { 'id': st.STR.id, 'value': 4 },
        { 'id': st.VIT.id, 'value': 5 },
        { 'id': st.BASE_MATK.id, 'value': 1 },
        { 'id': st.BASE_ATK.id, 'value': 1 },
        { 'id': st.ACCURACY.id, 'value': 60 }
        // { 'id': st.LEECH_MATK.id, 'value': 15 }
    ])

MonsterTable.HARPY = _(
    0x0009, 'Harpy', mc.BEAST, { 'min': t.TIER2.id, 'max': t.TIER6.id }, wf.RANGED, 60, [
        { 'id': st.DEX.id, 'value': 8 },
        { 'id': st.INT.id, 'value': 2 },
        { 'id': st.STR.id, 'value': 7 },
        { 'id': st.VIT.id, 'value': 5 },
        { 'id': st.BASE_MATK.id, 'value': 2 },
        { 'id': st.BASE_ATK.id, 'value': 3 },
        { 'id': st.ACCURACY.id, 'value': 100 }
    ])

MonsterTable.RAT = _(
    0x0010, 'Rat', mc.BEAST, { 'min': t.TIER1.id, 'max': t.TIER1.id }, wf.MELEE_1H, 60, [
        { 'id': st.DEX.id, 'value': 7 },
        { 'id': st.INT.id, 'value': 3 },
        { 'id': st.STR.id, 'value': 3 },
        { 'id': st.VIT.id, 'value': 5 },
        { 'id': st.BASE_MATK.id, 'value': 0 },
        { 'id': st.BASE_ATK.id, 'value': 3 },
        { 'id': st.ACCURACY.id, 'value': 60 }
    ])

MonsterTable.MAMMOTH = _(
    0x0080, 'Mammoth', mc.BEAST, { 'min': t.TIER3.id, 'max': t.TIER7.id }, wf.MELEE_2H, 60, [
        { 'id': st.DEX.id, 'value': 2 },
        { 'id': st.INT.id, 'value': 2 },
        { 'id': st.STR.id, 'value': 10 },
        { 'id': st.VIT.id, 'value': 10 },
        { 'id': st.BASE_MATK.id, 'value': 2 },
        { 'id': st.BASE_ATK.id, 'value': 2 },
        { 'id': st.ACCURACY.id, 'value': 100 }
    ])

MonsterTable.BASILISK = _(
    0x0090, 'Basilisk', mc.HUMANOID, { 'min': t.TIER3.id, 'max': t.TIER9.id }, wf.ANY_MELEE | wf.CAN_DUAL_WIELD, 100, [
        { 'id': st.DEX.id, 'value': 8 },
        { 'id': st.INT.id, 'value': 8 },
        { 'id': st.STR.id, 'value': 10 },
        { 'id': st.VIT.id, 'value': 10 },
        { 'id': st.BASE_MATK.id, 'value': 3 },
        { 'id': st.BASE_ATK.id, 'value': 5 },
        { 'id': st.ACCURACY.id, 'value': 100 }
    ])

MonsterTable.WYVERN = _(
    0x0091, 'Wyvern', mc.HUMANOID, { 'min': t.TIER4.id, 'max': t.TIER9.id }, wf.RANGED, 100, [
        { 'id': st.DEX.id, 'value': 10 },
        { 'id': st.INT.id, 'value': 10 },
        { 'id': st.STR.id, 'value': 8 },
        { 'id': st.VIT.id, 'value': 8 },
        { 'id': st.BASE_MATK.id, 'value': 2 },
        { 'id': st.BASE_ATK.id, 'value': 6 },
        { 'id': st.ACCURACY.id, 'value': 100 }
    ])

//  UNDEAD

MonsterTable.SKELETON_WARRIOR = _(
    0x0100, 'Skeleton Warrior', mc.UNDEAD, { 'min': t.TIER1.id, 'max': t.TIER6.id }, wf.ANY_MELEE | wf.CAN_DUAL_WIELD, 75, [
        { 'id': st.DEX.id, 'value': 4 },
        { 'id': st.INT.id, 'value': 2 },
        { 'id': st.STR.id, 'value': 8 },
        { 'id': st.VIT.id, 'value': 8 },
        { 'id': st.BASE_MATK.id, 'value': 0 },
        { 'id': st.BASE_ATK.id, 'value': 4 },
        { 'id': st.ACCURACY.id, 'value': 100 }
    ])

MonsterTable.SKELETON_ARCHER = _(
    0x0101, 'Skeleton Archer', mc.UNDEAD, { 'min': t.TIER1.id, 'max': t.TIER6.id }, wf.RANGED, 75, [
        { 'id': st.DEX.id, 'value': 8 },
        { 'id': st.INT.id, 'value': 2 },
        { 'id': st.STR.id, 'value': 4 },
        { 'id': st.VIT.id, 'value': 8 },
        { 'id': st.BASE_MATK.id, 'value': 0 },
        { 'id': st.BASE_ATK.id, 'value': 4 },
        { 'id': st.ACCURACY.id, 'value': 100 }
    ])

MonsterTable.SKELETON_MAGE = _(
    0x0102, 'Skeleton Mage', mc.UNDEAD, { 'min': t.TIER1.id, 'max': t.TIER6.id }, wf.ANY_CASTING, 75, [
        { 'id': st.DEX.id, 'value': 2 },
        { 'id': st.INT.id, 'value': 8 },
        { 'id': st.STR.id, 'value': 4 },
        { 'id': st.VIT.id, 'value': 8 },
        { 'id': st.BASE_MATK.id, 'value': 4 },
        { 'id': st.BASE_ATK.id, 'value': 0 },
        { 'id': st.ACCURACY.id, 'value': 100 }
    ])

MonsterTable.CRAWLING_TORSO = _(
    0x0109, 'Crawling Torso', mc.UNDEAD, { 'min': t.TIER1.id, 'max': t.TIER6.id }, wf.ANY_MELEE | wf.CAN_DUAL_WIELD, 40, [
        { 'id': st.DEX.id, 'value': 3 },
        { 'id': st.INT.id, 'value': 2 },
        { 'id': st.STR.id, 'value': 5 },
        { 'id': st.VIT.id, 'value': 5 },
        { 'id': st.BASE_MATK.id, 'value': 0 },
        { 'id': st.BASE_ATK.id, 'value': 3 },
        { 'id': st.ACCURACY.id, 'value': 50 }
    ])

MonsterTable.ZOMBIE = _(
    0x0110, 'Zombie', mc.UNDEAD, { 'min': t.TIER1.id, 'max': t.TIER5.id }, wf.ANY_MELEE, 80, [
        { 'id': st.DEX.id, 'value': 6 },
        { 'id': st.INT.id, 'value': 2 },
        { 'id': st.STR.id, 'value': 8 },
        { 'id': st.VIT.id, 'value': 8 },
        { 'id': st.BASE_MATK.id, 'value': 1 },
        { 'id': st.BASE_ATK.id, 'value': 3 },
        { 'id': st.ACCURACY.id, 'value': 80 }
    ])

// HUMANOID

MonsterTable.BANDIT = _(
    0x0200, 'Bandit', mc.HUMANOID, { 'min': t.TIER1.id, 'max': t.TIER3.id }, wf.ANY_MELEE | wf.CAN_DUAL_WIELD, 80, [
        { 'id': st.DEX.id, 'value': 10 },
        { 'id': st.INT.id, 'value': 3 },
        { 'id': st.STR.id, 'value': 7 },
        { 'id': st.VIT.id, 'value': 4 },
        { 'id': st.BASE_MATK.id, 'value': 0 },
        { 'id': st.BASE_ATK.id, 'value': 4 },
        { 'id': st.ACCURACY.id, 'value': 100 }
    ])

MonsterTable.WILDMAN = _(
    0x0201, 'Wildman', mc.HUMANOID, { 'min': t.TIER1.id, 'max': t.TIER3.id }, wf.ANY_MELEE, 70, [
        { 'id': st.DEX.id, 'value': 2 },
        { 'id': st.INT.id, 'value': 2 },
        { 'id': st.STR.id, 'value': 8 },
        { 'id': st.VIT.id, 'value': 8 },
        { 'id': st.BASE_MATK.id, 'value': 0 },
        { 'id': st.BASE_ATK.id, 'value': 4 },
        { 'id': st.ACCURACY.id, 'value': 80 }
    ])

MonsterTable.BLACKGUARD = _(
    0x0210, 'Blackguard', mc.HUMANOID, { 'min': t.TIER2.id, 'max': t.TIER7.id }, wf.ANY_MELEE | wf.CAN_DUAL_WIELD, 90, [
        { 'id': st.DEX.id, 'value': 6 },
        { 'id': st.INT.id, 'value': 2 },
        { 'id': st.STR.id, 'value': 8 },
        { 'id': st.VIT.id, 'value': 8 },
        { 'id': st.BASE_MATK.id, 'value': 0 },
        { 'id': st.BASE_ATK.id, 'value': 4 },
        { 'id': st.ACCURACY.id, 'value': 100 }
    ])

MonsterTable.DEVOTED_ONE = _(
    0x0211, 'Devoted One', mc.HUMANOID, { 'min': t.TIER2.id, 'max': t.TIER7.id }, wf.CASTING_1H | wf.CAN_DUAL_WIELD, 90, [
        { 'id': st.DEX.id, 'value': 8 },
        { 'id': st.INT.id, 'value': 9 },
        { 'id': st.STR.id, 'value': 4 },
        { 'id': st.VIT.id, 'value': 3 },
        { 'id': st.BASE_MATK.id, 'value': 5 },
        { 'id': st.BASE_ATK.id, 'value': 0 },
        { 'id': st.ACCURACY.id, 'value': 100 }
    ])

MonsterTable.DARKSWORN_FOOTMAN = _(
    0x0230, 'Darksworn Footman', mc.HUMANOID, { 'min': t.TIER2.id, 'max': t.TIER7.id }, wf.ANY_MELEE, 90, [
        { 'id': st.DEX.id, 'value': 8 },
        { 'id': st.INT.id, 'value': 9 },
        { 'id': st.STR.id, 'value': 4 },
        { 'id': st.VIT.id, 'value': 3 },
        { 'id': st.BASE_MATK.id, 'value': 0 },
        { 'id': st.BASE_ATK.id, 'value': 3 },
        { 'id': st.ACCURACY.id, 'value': 100 }
    ])

MonsterTable.DARKSWORN_PRIEST = _(
    0x0231, 'Darksworn Priest', mc.HUMANOID, { 'min': t.TIER2.id, 'max': t.TIER7.id }, wf.ANY_CASTING, 90, [
        { 'id': st.DEX.id, 'value': 7 },
        { 'id': st.INT.id, 'value': 8 },
        { 'id': st.STR.id, 'value': 4 },
        { 'id': st.VIT.id, 'value': 5 },
        { 'id': st.BASE_MATK.id, 'value': 3 },
        { 'id': st.BASE_ATK.id, 'value': 0 },
        { 'id': st.ACCURACY.id, 'value': 100 }
    ])

MonsterTable.WITCH = _(
    0x0280, 'Witch', mc.HUMANOID, { 'min': t.TIER1.id, 'max': t.TIER3.id }, wf.ANY_CASTING, 90, [
        { 'id': st.DEX.id, 'value': 4 },
        { 'id': st.INT.id, 'value': 9 },
        { 'id': st.STR.id, 'value': 4 },
        { 'id': st.VIT.id, 'value': 7 },
        { 'id': st.BASE_MATK.id, 'value': 4 },
        { 'id': st.BASE_ATK.id, 'value': 0 },
        { 'id': st.ACCURACY.id, 'value': 100 }
    ])

MonsterTable.WIZARD = _(
    0x0281, 'Wizard', mc.HUMANOID, { 'min': t.TIER3.id, 'max': t.TIER8.id }, wf.ANY_CASTING | wf.CAN_DUAL_WIELD, 100, [
        { 'id': st.DEX.id, 'value': 3 },
        { 'id': st.INT.id, 'value': 10 },
        { 'id': st.STR.id, 'value': 5 },
        { 'id': st.VIT.id, 'value': 6 },
        { 'id': st.BASE_MATK.id, 'value': 5 },
        { 'id': st.BASE_ATK.id, 'value': 0 },
        { 'id': st.ACCURACY.id, 'value': 100 }
    ])

MonsterTable.GIANT = _(
    0x0290, 'Giant', mc.HUMANOID, { 'min': t.TIER1.id, 'max': t.TIER8.id }, wf.MELEE_2H | wf.CAN_DUAL_WIELD, 100, [
        { 'id': st.DEX.id, 'value': 6 },
        { 'id': st.INT.id, 'value': 2 },
        { 'id': st.STR.id, 'value': 8 },
        { 'id': st.VIT.id, 'value': 9 },
        { 'id': st.BASE_MATK.id, 'value': 0 },
        { 'id': st.BASE_ATK.id, 'value': 5 },
        { 'id': st.ACCURACY.id, 'value': 100 }
    ])

MonsterTable.BRUTE = _(
    0x0291, 'Brute', mc.HUMANOID, { 'min': t.TIER2.id, 'max': t.TIER3.id }, wf.MELEE_2H | wf.CAN_DUAL_WIELD, 100, [
        { 'id': st.DEX.id, 'value': 5 },
        { 'id': st.INT.id, 'value': 1 },
        { 'id': st.STR.id, 'value': 9 },
        { 'id': st.VIT.id, 'value': 9 },
        { 'id': st.BASE_MATK.id, 'value': 0 },
        { 'id': st.BASE_ATK.id, 'value': 6 },
        { 'id': st.ACCURACY.id, 'value': 100 }
    ])

// ETHEREAL

MonsterTable.SPRITE = _(
    0x0300, 'Sprite', mc.ETHEREAL, { 'min': t.TIER1.id, 'max': t.TIER2.id }, wf.ANY_CASTING, 50, [
        { 'id': st.DEX.id, 'value': 7 },
        { 'id': st.INT.id, 'value': 9 },
        { 'id': st.STR.id, 'value': 4 },
        { 'id': st.VIT.id, 'value': 4 },
        { 'id': st.BASE_MATK.id, 'value': 3 },
        { 'id': st.BASE_ATK.id, 'value': 0 },
        { 'id': st.ACCURACY.id, 'value': 70 }
    ])

MonsterTable.APPARITION = _(
    0x0301, 'Apparition', mc.ETHEREAL, { 'min': t.TIER1.id, 'max': t.TIER1.id }, wf.ANY_CASTING, 60, [
        { 'id': st.DEX.id, 'value': 5 },
        { 'id': st.INT.id, 'value': 4 },
        { 'id': st.STR.id, 'value': 6 },
        { 'id': st.VIT.id, 'value': 6 },
        { 'id': st.BASE_MATK.id, 'value': 2 },
        { 'id': st.BASE_ATK.id, 'value': 1 },
        { 'id': st.ACCURACY.id, 'value': 60 }
    ])

MonsterTable.GHOST = _(
    0x0302, 'Ghost', mc.ETHEREAL, { 'min': t.TIER1.id, 'max': t.TIER3.id }, wf.ANY_CASTING, 90, [
        { 'id': st.DEX.id, 'value': 5 },
        { 'id': st.INT.id, 'value': 4 },
        { 'id': st.STR.id, 'value': 8 },
        { 'id': st.VIT.id, 'value': 7 },
        { 'id': st.BASE_MATK.id, 'value': 1 },
        { 'id': st.BASE_ATK.id, 'value': 3 },
        { 'id': st.ACCURACY.id, 'value': 100 }
    ])

MonsterTable.BANSHEE = _(
    0x0303, 'Banshee', mc.ETHEREAL, { 'min': t.TIER2.id, 'max': t.TIER5.id }, wf.ANY_CASTING, 100, [
        { 'id': st.DEX.id, 'value': 5 },
        { 'id': st.INT.id, 'value': 5 },
        { 'id': st.STR.id, 'value': 6 },
        { 'id': st.VIT.id, 'value': 8 },
        { 'id': st.BASE_MATK.id, 'value': 2 },
        { 'id': st.BASE_ATK.id, 'value': 3 },
        { 'id': st.ACCURACY.id, 'value': 100 }
    ])

MonsterTable.WRAITH = _(
    0x0304, 'Wraith', mc.ETHEREAL, { 'min': t.TIER3.id, 'max': t.TIER8.id }, wf.CASTING_1H, 100, [
        { 'id': st.DEX.id, 'value': 5 },
        { 'id': st.INT.id, 'value': 5 },
        { 'id': st.STR.id, 'value': 6 },
        { 'id': st.VIT.id, 'value': 8 },
        { 'id': st.BASE_MATK.id, 'value': 2 },
        { 'id': st.BASE_ATK.id, 'value': 3 },
        { 'id': st.ACCURACY.id, 'value': 100 }
    ])

// DEMON

MonsterTable.IMP = _(
    0x0400, 'Imp', mc.DEMON, { 'min': t.TIER1.id, 'max': t.TIER5.id }, wf.CASTING_1H, 90, [
        { 'id': st.DEX.id, 'value': 8 },
        { 'id': st.INT.id, 'value': 5 },
        { 'id': st.STR.id, 'value': 5 },
        { 'id': st.VIT.id, 'value': 6 },
        { 'id': st.BASE_MATK.id, 'value': 3 },
        { 'id': st.BASE_ATK.id, 'value': 1 },
        { 'id': st.ACCURACY.id, 'value': 100 }
    ])

MonsterTable.LASHER = _(
    0x0401, 'Lasher', mc.DEMON, { 'min': t.TIER1.id, 'max': t.TIER5.id }, wf.MELEE_1H, 90, [
        { 'id': st.DEX.id, 'value': 7 },
        { 'id': st.INT.id, 'value': 4 },
        { 'id': st.STR.id, 'value': 8 },
        { 'id': st.VIT.id, 'value': 5 },
        { 'id': st.BASE_MATK.id, 'value': 0 },
        { 'id': st.BASE_ATK.id, 'value': 3 },
        { 'id': st.ACCURACY.id, 'value': 100 }
    ])

MonsterTable.MISCREATION = _(
    0x0402, 'Miscreation', mc.DEMON, { 'min': t.TIER1.id, 'max': t.TIER2.id }, wf.MELEE_1H, 80, [
        { 'id': st.DEX.id, 'value': 2 },
        { 'id': st.INT.id, 'value': 5 },
        { 'id': st.STR.id, 'value': 7 },
        { 'id': st.VIT.id, 'value': 5 },
        { 'id': st.BASE_MATK.id, 'value': 1 },
        { 'id': st.BASE_ATK.id, 'value': 2 },
        { 'id': st.ACCURACY.id, 'value': 80 }
    ])

MonsterTable.SUCCUBUS = _(
    0x0403, 'Succubus', mc.DEMON, { 'min': t.TIER2.id, 'max': t.TIER7.id }, wf.CASTING_1H | wf.CAN_DUAL_WIELD, 100, [
        { 'id': st.DEX.id, 'value': 5 },
        { 'id': st.INT.id, 'value': 7 },
        { 'id': st.STR.id, 'value': 5 },
        { 'id': st.VIT.id, 'value': 7 },
        { 'id': st.BASE_MATK.id, 'value': 2 },
        { 'id': st.BASE_ATK.id, 'value': 2 },
        { 'id': st.ACCURACY.id, 'value': 100 }
    ])

MonsterTable.TORMENTOR = _(
    0x0404, 'Tormentor', mc.DEMON, { 'min': t.TIER2.id, 'max': t.TIER7.id }, wf.MELEE_1H | wf.CAN_DUAL_WIELD, 100, [
        { 'id': st.DEX.id, 'value': 5 },
        { 'id': st.INT.id, 'value': 4 },
        { 'id': st.STR.id, 'value': 7 },
        { 'id': st.VIT.id, 'value': 7 },
        { 'id': st.BASE_MATK.id, 'value': 3 },
        { 'id': st.BASE_ATK.id, 'value': 2 },
        { 'id': st.ACCURACY.id, 'value': 100 }
    ])

MonsterTable.ARCHFIEND = _(
    0x0405, 'Archfiend', mc.DEMON, { 'min': t.TIER3.id, 'max': t.TIER9.id }, wf.ANY_MELEE | wf.CAN_DUAL_WIELD, 100, [
        { 'id': st.DEX.id, 'value': 6 },
        { 'id': st.INT.id, 'value': 4 },
        { 'id': st.STR.id, 'value': 8 },
        { 'id': st.VIT.id, 'value': 8 },
        { 'id': st.BASE_MATK.id, 'value': 3 },
        { 'id': st.BASE_ATK.id, 'value': 3 },
        { 'id': st.ACCURACY.id, 'value': 100 }
    ])

module.exports = { MonsterTable }
