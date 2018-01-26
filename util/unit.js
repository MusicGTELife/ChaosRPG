const { UnitType } = require('../unit')
const { Player } = require('../player')
const { Monster } = require('../monster')

class UnitUtil {
    constructor(game) {
        this.game = game
    }

/*
    static createStatsDescriptor(type, id) {
        let stats = ({
            [PlayerType.MAGE.id]: MageBase.stats,
            [PlayerType.WARRIOR.id]: WarriorBase.stats,
            [PlayerType.ROGUE.id]: RogueBase.stats,
            [PlayerType.RANGER.id]: RangerBase.stats,
            [PlayerType.CLERIC.id]: ClericBase.stats
        })[type] || []

        return {
            stats
        }
    }
*/

    static createBaseDescriptor(type) {
        let descriptor = ({
            [UnitType.PLAYER.id]: Player,
            [UnitType.MONSTER.id]: Monster
        })[type] || { }

        console.log(`${JSON.stringify(descriptor)}`)

        return {
            id: 0,
            type: 0,
            stats: [],
            inventory: [],
            equipment: [],
            descriptor
        }
    }

    async getStats(unit) {
        if (unit)
            return await unit.get('stats')

        console.log('no unit')
        return null
    }

    async getEquipment(unit) {
        if (unit)
            return await unit.get('equipment')

        console.log('no unit')
        return null
    }

    async getInventory(unit) {
        if (unit)
            return await unit.get('inventory')

        console.log('no unit')
        return null
    }
}

module.exports = { UnitUtil }
