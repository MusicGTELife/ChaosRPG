const { StatUtil } = require('./stats')

const { StatModifier } = require('../statmodifier')
const { StatTable, StatFlag } = require('../stattable')
const { UnitType } = require('../unit')
const { Player } = require('../player')
const { Monster } = require('../monster')

class UnitUtil {
    constructor(game) {
        this.game = game
    }

    static create(type) {
        let descriptor = ({
            [UnitType.PLAYER.id]: Player.descriptor,
            [UnitType.MONSTER.id]: Monster.descriptor
        })[type] || { }

        console.log(`create ${JSON.stringify(descriptor)}`)

        return {
            id: 0,
            type: type,
            stats: UnitUtil.createBaseStats(type),
            equipment: [ 0, 0, 0, 0, 0, 0],
            descriptor
        }
    }

    static createBaseStats(type) {
        let stats = Object.values(StatTable).map((e) => {
            if (type == UnitType.PLAYER.id && (e.flags & StatFlag.PLAYER))
                return { id: e.id, value: 0 }
            else if (type == UnitType.MONSTER.id && (e.flags & StatFlag.MONSTER))
                return { id: e.id, value: 0 }
            else if ((e.flags & StatFlag.BASE) || (e.flags & StatFlag.UNIT))
                return { id: e.id, value: 0 }
        })

        console.log(`${JSON.stringify(stats)}`)

        return stats
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

    getAllItemStats(items) {
        let stats = []
        Object.values(items).map(v => { stats.push(...v.get('stats')) })
        return stats
    }

    // FIXME decide
    async equipItem(unit, items, item, slot) {
        let found = items.find((i) => i.id === item.id)
        if (found) {
            console.log(`item ${item.id} is already equipped`);
            return false
        }

        let equipment = unit.get('equipment')
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
        itemObj.is_equipped = false

        console.log(`unequip eq ${JSON.stringify(playerObj.equipment)} inv ${JSON.stringify(playerObj.inventory)}`)

        await item.set(itemObj)
        await player.set(playerObj)

        await item.save()
        await player.save()

        this.computeBaseStats(player)

        return true
    }

    async getEquippedItems(unit) {
        if (unit) {
            let items = await this.game.gameDb.getUnitItems(unit.get('id'))
            //console.log(`getEquippedItems ${JSON.stringify(items)}`)

            Object.values(items).map(v => { return v.get('is_equipped') })
            //console.log(`getEquippedItems ${JSON.stringify(items)}`)
            return items
        }

        return []
    }

    // called when:
    // - a unit is generated
    // - item placed or on removed from a units equipment slot
    // - a player unit levels
    //
    // FIXME make as generic as possible
    async computeBaseStats(unit) {
        let items = await this.getEquippedItems(unit)
        let itemStats = await this.getAllItemStats(items)
        itemStats = StatUtil.getReducedStats(itemStats)

        let stats = await this.getStats(unit)

        let baseStats = stats.map((e) => e.flags === StatFlag.BASE)
        let unitStats = stats.map((e) => e.flags === StatFlag.PLAYER)

        let baseStatCalc = {
            int: StatUtil.getStat(stats, StatTable.INT.id),
            str: StatUtil.getStat(stats, StatTable.STR.id),
            dex: StatUtil.getStat(stats, StatTable.DEX.id),
            vit: StatUtil.getStat(stats, StatTable.VIT.id)
        }

        let itemStatCalc = {
            int: StatUtil.getStat(itemStats, StatTable.INT.id),
            str: StatUtil.getStat(itemStats, StatTable.STR.id),
            dex: StatUtil.getStat(itemStats, StatTable.DEX.id),
            vit: StatUtil.getStat(itemStats, StatTable.VIT.id)
        }

        let unitStatCalc = {
            exp: StatUtil.getStat(unitStats, StatTable.UNIT_EXP.id),
            hp: StatUtil.getStat(unitStats, StatTable.UNIT_HP.id),
            hp_max: StatUtil.getStat(unitStats, StatTable.UNIT_HP_MAX.id),
            mp: StatUtil.getStat(unitStats, StatTable.UNIT_MP.id),
            mp_max: StatUtil.getStat(unitStats, StatTable.UNIT_MP_MAX.id)
        }

        let currHp = unitStatCalc.hp
        let currHpMax = unitStatCalc.hp_max
        let currHpPercent = currHpMax === 0 ? 0 : currHp/currHpMax

        let hpMax = StatUtil.resolveStat(StatModifier.HP_PER_VIT.id, baseStatCalc.vit+itemStatCalc.vit)

        console.log(`curr { hp: ${currHp}, hp_max: ${currHpMax}, p: ${currHpPercent}, r: ${hpMax} }`)

        StatUtil.setStat(stats, StatTable.UNIT_HP_MAX.id, hpMax)
        await unit.set('stats', stats)

        console.log(`baseStatCalc ${JSON.stringify(baseStatCalc)} }`)
        console.log(`itemStatCalc ${JSON.stringify(itemStatCalc)} }`)
        console.log(`unitStatCalc ${JSON.stringify(unitStatCalc)} }`)

        console.log(`stats ${JSON.stringify(stats)} }`)
    }
}

module.exports = { UnitUtil }
