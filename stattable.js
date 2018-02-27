const StatFlag = {}
StatFlag.BASE =         0x01
StatFlag.UNIT =         0x01 << 1
StatFlag.PLAYER =       0x01 << 2
StatFlag.MONSTER =      0x01 << 3

function createStatTableEntry(id, flags, nameShort, nameLong, minValue, maxValue) {
    return {
        id,
        flags,
        'name_short': nameShort,
        'name_long': nameLong,
        'min_value': minValue,
        'max_value': maxValue
    }
}

const StatTable = { }
const _ = createStatTableEntry

StatTable.DEX = _(0x0001, StatFlag.BASE, 'Dex', 'Dexterity', 0, 4096)
StatTable.INT = _(0x0002, StatFlag.BASE, 'Int', 'Intelligence', 0, 4096)
StatTable.STR = _(0x0003, StatFlag.BASE, 'Str', 'Strength', 0, 4096)
StatTable.VIT = _(0x0004, StatFlag.BASE, 'Vit', 'Vitality', 0, 4096)

StatTable.ALL_ATTR = _(0x0080, StatFlag.BASE, 'AllAttr', 'All attributes', 1, 32)

StatTable.BLOCK = _(0x0100, StatFlag.BASE, 'CtB', 'Chance to block', 1, 75)
StatTable.BASE_ATK = _(0x0110, StatFlag.BASE, 'BaseAtk', 'Base attack', 0, 65536)
StatTable.BASE_MATK = _(0x0111, StatFlag.BASE, 'BaseMAtk', 'Base magic attack', 0, 65536)
StatTable.ACCURACY = _(0x0120, StatFlag.BASE, 'Acc', 'Accuracy', 0, 4096)
StatTable.REACTION = _(0x0121, StatFlag.BASE, 'React', 'Reaction', 0, 4096)

StatTable.HP = _(0x0200, StatFlag.BASE, 'HP', 'Hit points', 0, 65536)
StatTable.ATK = _(0x0212, StatFlag.BASE, 'Atk', 'Attack rating', 0, 65536)
StatTable.MATK = _(0x0213, StatFlag.BASE, 'MAtk', 'Magic attack rating', 0, 65536)
StatTable.DEF = _(0x0214, StatFlag.BASE, 'Def', 'Defense', 0, 65536)
StatTable.MDEF = _(0x0215, StatFlag.BASE, 'MDef', 'Magic defense', 0, 65536)

// Unit specific stats
StatTable.UNIT_STR = _(0x8000, StatFlag.UNIT, 'UnitStr', 'Strength', 0, 4096)
StatTable.UNIT_DEX = _(0x8001, StatFlag.UNIT, 'UnitDex', 'Dexterity', 0, 4096)
StatTable.UNIT_INT = _(0x8002, StatFlag.UNIT, 'UnitInt', 'Intelligence', 0, 4096)
StatTable.UNIT_VIT = _(0x8003, StatFlag.UNIT, 'UnitVit', 'Vitality', 0, 4096)

StatTable.UNIT_BASE_ATK = _(0x8030, StatFlag.UNIT, 'UnitBaseAtk', 'Unit base attack', 0, 65536)
StatTable.UNIT_BASE_MATK = _(0x8031, StatFlag.UNIT, 'UnitBaseMAtk', 'Unit base magic attack', 0, 65536)
StatTable.UNIT_ACCURACY = _(0x8040, StatFlag.UNIT, 'UnitAcc', 'Unit accuracy', 0, 4096)
StatTable.UNIT_REACTION = _(0x8041, StatFlag.UNIT, 'UnitReact', 'Unit reaction', 0, 4096)
StatTable.UNIT_BLOCK = _(0x8042, StatFlag.UNIT, 'UnitBlock', 'Unit chance to block', 0, 65536)

StatTable.UNIT_HP = _(0x8100, StatFlag.UNIT, 'UnitHP', 'Unit hit Points', 0, 65536)
StatTable.UNIT_HP_MAX = _(0x8101, StatFlag.UNIT, 'UnitHPMax', 'Unit max hit points', 0, 65536)
StatTable.UNIT_ATK = _(0x8110, StatFlag.UNIT, 'UnitAtk', 'Unit attack rating', 0, 65536)
StatTable.UNIT_MATK = _(0x8111, StatFlag.UNIT, 'UnitMAtk', 'Unit magic attack rating', 0, 65536)
StatTable.UNIT_DEF = _(0x8112, StatFlag.UNIT, 'UnitDef', 'Unit defense', 0, 65536)
StatTable.UNIT_MDEF = _(0x8113, StatFlag.UNIT, 'UnitMDef', 'Unit magic defense', 0, 65536)

// Player specific stats
StatTable.UNIT_EXP = _(0x9000, StatFlag.PLAYER, 'PlayerExp', 'Player experience', 0, Number.MAX_SAFE_INTEGER)

// Monster specific stats

module.exports = { StatTable, StatFlag }
