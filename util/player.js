const { UnitUtil } = require('./unit')
const { StatUtil } = require('./stats')

const { UnitType } = require('../unit')
const { PlayerType } = require('../player')

const { StatTable, StatFlag } = require('../stattable')
const { StatModifier } = require('../statmodifier')

class PlayerUtil extends UnitUtil {
    static getPlayerTypeString(id) {
        return Object.keys(PlayerType).map((k) => k.id === id ? type.name : 'unknown')
    }

    static createBaseStats(type) {
        let stats = ({
            [PlayerType.MAGE.id]: MageBase.stats,
            [PlayerType.WARRIOR.id]: WarriorBase.stats,
            [PlayerType.ROGUE.id]: RogueBase.stats,
            [PlayerType.RANGER.id]: RangerBase.stats,
            [PlayerType.CLERIC.id]: ClericBase.stats
        })[type] || []

        return stats
    }

    async getEquipment(player) {
        if (player)
            return await player.get('equipment')

        console.log('no player')
        return null
    }

    async getInventory(player) {
        if (player)
            return await player.get('inventory')

        console.log('no player')
        return null
    }


    async getBaseStats(player) {
        if (player)
            return await player.get('stats')

        console.log('no player')
        return null
    }

    async equipItem(player, items, item, slot) {
        let found = items.find((i) => i.id === item.id)
        if (found) {
            console.log(`item ${item.id} is already equipped`);
            return false
        }

        let equipment = player.get('equipment')
        if (equipment[slot] !== 0) {
            console.log('cannot move item to occupied slot')
            return false
        }

        equipment[slot] = item.id
        inventory[item.id] = 0
        item.is_equipped = true
        await item.save()

        computeBaseStats(player)
        await player.save()

        return true
    }

    async unequipItem(player, items, item, slot) {
        let itemObj = item.get()
        let playerObj = player.get()

        console.log(`${JSON.stringify(itemObj)}`)

        let found = items.find((i) => i.get('id') === itemObj.id)
        if (!found) {
            console.log(`item ${JSON.stringify(items)} is not equipped`)
            return false
        }

        let idx = playerObj.equipment.findIndex(i => i === itemObj.id)
        if (idx === -1)
            return false

        console.log(`unequiping idx ${idx}`)

        playerObj.equipment[idx] = 0
        playerObj.inventory[slot] = itemObj.id
        itemObj.is_equipped = false

        console.log(`unequip eq ${JSON.stringify(playerObj.equipment)} inv ${JSON.stringify(playerObj.inventory)}`)

        await item.set(itemObj)
        await player.set(playerObj)

        await item.save()
        await player.save()

        this.computeBaseStats(player)

        return true
    }

    async dropItem(player, items, itemId) {

    }

    async pickupItem(player, itemId) {

    }

    // called when a player levels, [un]equips an item, picks or drops an item
    async computeBaseStats(player) {
        let items = await this.getEquippedItems(player)
        let itemStats = Stats.getReducedStats(await this.getAllItemStats(items))

        let stats = await this.getBaseStats(player)
        let baseStats = stats.map((e) => e.flags === StatFlag.BASE)
        let unitStats = stats.map((e) => e.flags === StatFlag.UNIT)

        let baseStatCalc = {
            int: Stats.getStat(stats, StatTable.INT.id),
            str: Stats.getStat(stats, StatTable.STR.id),
            dex: Stats.getStat(stats, StatTable.DEX.id),
            vit: Stats.getStat(stats, StatTable.VIT.id)
        }

        let itemStatCalc = {
            int: Stats.getStat(itemStats, StatTable.INT.id),
            str: Stats.getStat(itemStats, StatTable.STR.id),
            dex: Stats.getStat(itemStats, StatTable.DEX.id),
            vit: Stats.getStat(itemStats, StatTable.VIT.id)
        }

        let unitStatCalc = {
            exp: Stats.getStat(unitStats, StatTable.UNIT_EXP.id),
            hp: Stats.getStat(unitStats, StatTable.UNIT_HP.id),
            hp_max: Stats.getStat(unitStats, StatTable.UNIT_HP_MAX.id),
            mp: Stats.getStat(unitStats, StatTable.UNIT_MP.id),
            mp_max: Stats.getStat(unitStats, StatTable.UNIT_MP_MAX.id)
        }

        let currHp = unitStatCalc.hp
        let currHpMax = unitStatCalc.hp_max
        let currHpPercent = currHpMax === 0 ? 0 : currHp/currHpMax

        let hpMax = Stats.resolveStat(StatModifier.HP_PER_VIT.id, baseStatCalc.vit+itemStatCalc.vit)

        console.log(`curr { hp: ${currHp}, hp_max: ${currHpMax}, p: ${currHpPercent}, r: ${hpMax} }`)

        Stats.setStat(stats, StatTable.UNIT_HP_MAX.id, hpMax)
        await player.set('stats', stats)
        await player.save()

        console.log(`baseStatCalc ${JSON.stringify(baseStatCalc)} }`)
        console.log(`itemStatCalc ${JSON.stringify(itemStatCalc)} }`)
        console.log(`unitStatCalc ${JSON.stringify(unitStatCalc)} }`)

        console.log(`stats ${JSON.stringify(stats)} }`)
    }

    getAllItemStats(items) {
        let stats = []
        Object.values(items).map(v => { stats.push(...v.get('stats')) })
        return stats
    }

    async getEquippedItems(player) {
        if (player) {
            let items = await this.game.gameDb.getPlayerEquipment(player)
            //console.log(`getEquippedItems ${JSON.stringify(items)}`)

            Object.values(items).map(v => { return v.get('is_equipped') })
            //console.log(`getEquippedItems ${JSON.stringify(items)}`)
            return items
        }

        return []
    }

    async getPlayerEquipment(player) {
        if (!player)
            return null

        let items = await Item.where('id').in(player.get('equipment'))
            .where('owner', player.get('id')).find()
        //console.log(`getplayeritems found ${JSON.stringify(items)}`)
        return items
    }

    async getPlayerInventory(player) {
        if (!player)
            return null

        let items = await Item.where('id').in(player.get('inventory'))
            .where('owner', player.get('id')).find()
        //console.log(`getplayeritems found ${JSON.stringify(items)}`)
        return items
    }
}

module.exports = { PlayerUtil }
