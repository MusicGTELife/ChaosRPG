const { UnitUtil } = require('./unit')
const { StatUtil } = require('./stats')
const { ItemUtil } = require('./item')

const { getExperienceForLevel } = require('../experience')

const { StatTable } = require('../stattable')
const { UnitType } = require('../unit')
const { PlayerType, Player, Mage, Warrior, Rogue, Ranger, Cleric, statPointsPerLevel } = require('../player')
const { ItemClass } = require('../itemclass')
const { ItemRarity } = require('../itemrarity')
const { Tier } = require('../tier')
const { ItemTable } = require('../itemtable')

class PlayerUtil extends UnitUtil {
    static getPlayerTypeString(id) {
        return Object.keys(PlayerType).map((k) => k.id === id ? type.name : 'unknown')
    }

    static create(type, level, account) {
        if (!PlayerUtil.isValidType(type))
            return null

        let unit = UnitUtil.create(UnitType.PLAYER.id, level, '')
        if (!unit)
            return null

        unit.descriptor.type = type
        unit.descriptor.account = account
        unit.stats = PlayerUtil.createBaseStats(type)

        let weaponEntry = ({
            [PlayerType.MAGE.id]: ItemTable.CRACKED_WAND,
            [PlayerType.WARRIOR.id]: ItemTable.CRACKED_SWORD,
            [PlayerType.ROGUE.id]: ItemTable.CRACKED_DAGGER,
            [PlayerType.RANGER.id]: ItemTable.CRACKED_BOW,
            [PlayerType.CLERIC.id]: ItemTable.CRACKED_STAFF
        })[type]

        let items = []
        let item = ItemUtil.generate(null, weaponEntry.code, ItemClass.WEAPON, Tier.TIER0.id, ItemRarity.COMMON.id)
        if (!item)
            return null

        items.push(item)
        //console.log(items)

        return { unit, items }
    }

    static isValidType(type) {
        let valid = ({
            [PlayerType.MAGE.id]: true,
            [PlayerType.WARRIOR.id]: true,
            [PlayerType.ROGUE.id]: true,
            [PlayerType.RANGER.id]: true,
            [PlayerType.CLERIC.id]: true
        })[type] || false
        return valid
    }

    static createBaseStats(type) {
        if (!PlayerUtil.isValidType(type))
            return null

        let overrides = ({
            [PlayerType.MAGE.id]: Mage.stats,
            [PlayerType.WARRIOR.id]: Warrior.stats,
            [PlayerType.ROGUE.id]: Rogue.stats,
            [PlayerType.RANGER.id]: Ranger.stats,
            [PlayerType.CLERIC.id]: Cleric.stats
        })[type]

        let stats = UnitUtil.createBaseStats(UnitType.PLAYER.id)
        StatUtil.applyOverrides(stats, overrides)

        return stats
    }

    static getExperience(unit) {
        if (!unit)
            return 0

        return StatUtil.getStat(unit.stats, StatTable.UNIT_EXP.id).value
    }

    // Utilities to apply stat changes
    static async applyStatPoint(unit, statId) {
        if (!unit)
            return false

        let validStat = ({
            [StatTable.STR.id]: true,
            [StatTable.DEX.id]: true,
            [StatTable.INT.id]: true,
            [StatTable.VIT.id]: true,
        })[statId] || false
        if (!validStat)
            return false

        if (unit.descriptor.stat_points_remaining <= 0)
            return false

        unit.descriptor.stat_points_remaining--

        const current = StatUtil.getStat(unit.stats, statId)
        StatUtil.setStat(unit.stats, statId, current.value+1)

        return true
    }

    static async applyLevelGain(unit) {
        if (!unit)
            return null

        if (unit.level >= 100)
            return unit

        unit.level++
        unit.descriptor.stat_points_remaining += statPointsPerLevel

        unit.markModified('descriptor')
        await unit.save()

        return unit
    }

    static async applyExperience(unit, amount) {
        if (!unit)
            return null

        if (amount <= 0)
            return null

        const nextLevel = getExperienceForLevel(unit.level+1)
        let xp = StatUtil.getStat(unit.stats, StatTable.UNIT_EXP.id)

        // cap xp value off at the beginning of the next level if they advanced
        if (xp.value + amount > nextLevel)
            xp.value = nextLevel
        else
            xp.value += amount

        StatUtil.setStat(unit.stats, StatTable.UNIT_EXP.id, xp.value)

        unit.markModified('stats')
        await unit.save()
        return unit
    }
}

module.exports = { PlayerUtil }
