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

    getAllItemStats(items) {
        let stats = []
        Object.values(items).map(v => { stats.push(...v.stats) })
        return stats
    }

    // FIXME decide
    async equipItem(unit, items, item, slot) {
        let found = items.find((i) => i.id === item.id)
        if (found) {
            console.log(`item ${item.id} is already equipped`);
            return false
        }

        let equipment = unit.equipment
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
        console.log(`${JSON.stringify(item)}`)

        let found = items.find((i) => i.id === item.id)
        if (!found) {
            console.log(`item ${JSON.stringify(items)} is not equipped`)
            return false
        }

        let idx = player.equipment.findIndex(i => i === item.id)
        if (idx === -1)
            return false

        console.log(`unequiping idx ${idx}`)

        player.equipment[idx] = 0
        item.is_equipped = false

        console.log(`unequip eq ${JSON.stringify(player.equipment)} inv ${JSON.stringify(player.inventory)}`)

        await item.save()
        await player.save()

        this.computeBaseStats(player)

        return true
    }

    async getEquippedItems(unit) {
        if (unit) {
            let items = await this.game.gameDb.getUnitItems(unit.id)
            //console.log(`getEquippedItems ${JSON.stringify(items)}`)

            Object.values(items).map(v => { return v.is_equipped })
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

        let stats = unit.stats
        let baseStats = unit.stats.map((e) => e.flags === StatFlag.BASE)
        let unitStats = unit.stats.map((e) => e.flags === StatFlag.PLAYER)

        let baseStatCalc = {
            int: StatUtil.getStat(unit.stats, StatTable.INT.id),
            str: StatUtil.getStat(unit.stats, StatTable.STR.id),
            dex: StatUtil.getStat(unit.stats, StatTable.DEX.id),
            vit: StatUtil.getStat(unit.stats, StatTable.VIT.id)
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

        console.log(`baseStatCalc ${JSON.stringify(baseStatCalc)} }`)
        console.log(`itemStatCalc ${JSON.stringify(itemStatCalc)} }`)
        console.log(`unitStatCalc ${JSON.stringify(unitStatCalc)} }`)

        await unit.save()
    }
}

module.exports = { UnitUtil }
