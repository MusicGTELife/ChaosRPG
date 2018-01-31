const { UnitUtil } = require('./unit')
const { StatUtil } = require('./stats')

const { UnitType } = require('../unit')
const { PlayerType, Player, Mage, Warrior, Rogue, Ranger, Cleric } = require('../player')

class PlayerUtil extends UnitUtil {
    static getPlayerTypeString(id) {
        return Object.keys(PlayerType).map((k) => k.id === id ? type.name : 'unknown')
    }

    static create(type) {
        let player = UnitUtil.create(UnitType.PLAYER.id)
        player.descriptor.type = type
        player.stats = PlayerUtil.createBaseStats(type)

        return player
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
        let overrides = ({
            [PlayerType.MAGE.id]: Mage.stats,
            [PlayerType.WARRIOR.id]: Warrior.stats,
            [PlayerType.ROGUE.id]: Rogue.stats,
            [PlayerType.RANGER.id]: Ranger.stats,
            [PlayerType.CLERIC.id]: Cleric.stats
        })[type] || []

        let stats = UnitUtil.createBaseStats(UnitType.PLAYER.id)
        StatUtil.applyOverrides(stats, overrides)

        return stats
    }
}

module.exports = { PlayerUtil }
