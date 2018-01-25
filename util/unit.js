const { UnitType } = require('../unit')
const { Player } = require('../player')
const { Monster } = require('../monster')

class UnitUtil {
    constructor(game) {
        this.game = game
    }

    static applyOverrides(stats, overrides) {
        overrides.map(stat => {
            let base = stats.find(base => base.id === stat.id)
            if (base) {
                console.log(`applying override ${base.id} ${base.value} => ${stat.value}`)
                base.value = stat.value
            }
        })
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
}

module.exports = { UnitUtil }
