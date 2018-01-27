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
        player.type = type
        player.stats = PlayerUtil.createBaseStats(type)

        return player
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

    async getInventory(player) {
        if (unit)
            return await player.get('descriptor.inventory')

        console.log('no unit')
        return null
    }

    async getInventoryItems(unit) {
        if (!unit)
            return null

        let items = await this.game.gameDb.getUnitItems(unit.get('id'))

        //let items = await Item.where('id').in()
        //    .where('owner', unit.get('id')).find()
        //console.log(`getplayeritems found ${JSON.stringify(items)}`)
        return items
    }

    async dropItem(player, items, itemId) {

    }

    async pickupItem(player, itemId) {

    }
}

module.exports = { PlayerUtil }
