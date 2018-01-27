const StatFlag = {}
StatFlag.BASE =         0x01
StatFlag.UNIT =         0x01 << 1
StatFlag.PLAYER =       0x01 << 2
StatFlag.MONSTER =      0x01 << 3

function createStatTableEntry(id, flags, nameShort, nameLong, minValue, maxValue) {
    return {
        id,
        flags,
        name_short: nameShort,
        name_long: nameLong,
        min_value: minValue,
        max_value: maxValue
    }
}

const StatTable = { }
const _ = createStatTableEntry

StatTable.DEX = _(0x0001, StatFlag.BASE, "Dex", "Dexterity", 0, 4096)
StatTable.INT = _(0x0002, StatFlag.BASE, "Int", "Intelligence", 0, 4096)
StatTable.STR = _(0x0003, StatFlag.BASE, "Str", "Strength", 0, 4096)
StatTable.VIT = _(0x0004, StatFlag.BASE, "Vit", "Vitality", 0, 4096)

StatTable.HP = _(0x0100, StatFlag.BASE, "HP", "Hit Points", 0, 65536)
StatTable.MP = _(0x0110, StatFlag.BASE, "MP", "Mana Points", 0, 65536)
StatTable.ATK = _(0x0112, StatFlag.BASE, "Atk", "Attack Rating", 0, 65536)
StatTable.MATK = _(0x0113, StatFlag.BASE, "MAtk", "Magic attack Rating", 0, 65536)
StatTable.DEF = _(0x0114, StatFlag.BASE, "Def", "Defense", 0, 65536)
StatTable.MDEF = _(0x0115, StatFlag.BASE, "MDef", "Magic defense", 0, 65536)

StatTable.BLOCK = _(0x0120, StatFlag.BASE, "CtB", "Chance to block", 1, 75)
StatTable.EVADE = _(0x0121, StatFlag.BASE, "CtE", "Chance to evade", 1, 75)

StatTable.ALL_ATTR = _(0x0300, StatFlag.BASE, "AllAttr", "All attributes", 1, 32)

// Unit specific stats
StatTable.UNIT_HP = _(0x8001, StatFlag.UNIT, "UnitHP", "Unit Hit Points", 0, 65536)
StatTable.UNIT_MP = _(0x8002, StatFlag.UNIT, "UnitMP", "Unit Mana Points", 0, 65536)
StatTable.UNIT_HP_MAX = _(0x8003, StatFlag.UNIT, "UnitHPMax", "Unit Max hit points", 0, 65536)
StatTable.UNIT_MP_MAX = _(0x8004, StatFlag.UNIT, "UnitMPMax", "Unit Mana Points", 0, 65536)

// Player specific stats
StatTable.UNIT_EXP = _(0x8000, StatFlag.PLAYER, "PlayerExp", "Player Experience", 0, Number.MAX_SAFE_INTEGER)

// Monster specific stats

module.exports = { StatTable, StatFlag }
