const { UnitUtil } = require('./unit')
const { StatUtil } = require('./stats')
const { ItemUtil } = require('./item')

const { UnitType } = require('../unit')
const { PlayerType, Player, Mage, Warrior, Rogue, Ranger, Cleric } = require('../player')
const { ItemClass } = require('../itemclass')
const { ItemRarity } = require('../itemrarity')
const { Tier } = require('../tier')
const { ItemTable } = require('../itemtable')

class PlayerUtil extends UnitUtil {
    static getPlayerTypeString(id) {
        return Object.keys(PlayerType).map((k) => k.id === id ? type.name : 'unknown')
    }

    static create(type, account) {
        if (!PlayerUtil.isValidType(type))
            return null

        let player = UnitUtil.create(UnitType.PLAYER.id, '')
        player.descriptor.type = type
        player.descriptor.account = account
        player.stats = PlayerUtil.createBaseStats(type)

        let weaponEntry = ({
            [PlayerType.MAGE.id]: ItemTable.CRACKED_WAND,
            [PlayerType.WARRIOR.id]: ItemTable.CRACKED_SWORD,
            [PlayerType.ROGUE.id]: ItemTable.CRACKED_DAGGER,
            [PlayerType.RANGER.id]: ItemTable.CRACKED_BOW,
            [PlayerType.CLERIC.id]: ItemTable.CRACKED_STAFF
        })[type]

        let weapon = ItemUtil.generate(null, weaponEntry.code, ItemClass.WEAPON, Tier.TIER0.id, ItemRarity.COMMON.id)
        console.log(weapon)

        return { player, weapon }
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
}

module.exports = { PlayerUtil }
