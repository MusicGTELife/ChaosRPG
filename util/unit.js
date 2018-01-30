const { StatUtil } = require('./stats')
const { StorageUtil } = require('./storage')

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
            storage: StorageUtil.createStorage(type),
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

        return stats
    }

    getAllItemStats(items) {
        let stats = []
        if (items !== [])
            Object.values(items).map(v => { stats.push(...v.stats) })
        return stats
    }

    // FIXME decide
    async equipItem(unit, items, item, node, slot) {
        let found = items.find((i) => i.id === item.id)
        if (found) {
            console.log(`item ${item.id} is already equipped`);
            return false
        }

        if (!StorageUtil.canEquipInSlot(unit.storage, node, slot))
            return false

        unit.storage[slot] = item.id
        inventory[item.id] = 0
        item.is_equipped = true
        await item.save()

        await this.computeBaseStats(player)
        await player.save()

        return true
    }

    async unequipItem(player, items, item, node, slot) {
        let found = items.find((i) => i.id === item.id)
        if (!found) {
            console.log(`item ${item.id} is not equipped`)
            return false
        }

        let idx = player.storage.findIndex(i => i === item.id)
        if (idx === -1)
            return false

        console.log(`unequiping idx ${idx}`)

        //player.equipment[idx] = 0
        item.is_equipped = false

        console.log(`unequip eq ${JSON.stringify(player.storage)} inv ${JSON.stringify(player.inventory)}`)

        //await item.save()
        //    .then(async () => await player.save())
        //    .then(async () => await this.computeBaseStats(player))

        return true
    }

    async getEquippedItems(unit) {
        if (unit) {
            let items = await this.game.gameDb.getUnitItems(unit.id)
            items = Object.values(items).filter(v => v.is_equipped === true)
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
    async computeBaseStats(unit, items) {
        if (!unit || !items)
            return

        let itemStats = await this.getAllItemStats(items)
        itemStats = StatUtil.getReducedStats(itemStats)

        let baseStats = unit.stats.filter(e => {
            let entry = StatUtil.getStatTableEntry(e.id)
            return entry && entry.flags & StatFlag.BASE
        })
        let unitStats = unit.stats.filter(e => {
            let entry = StatUtil.getStatTableEntry(e.id)
            return entry && entry.flags & StatFlag.UNIT
        })
        let playerStats = unit.stats.filter(e => {
            let entry = StatUtil.getStatTableEntry(e.id)
            return entry && entry.flags & StatFlag.PLAYER
        })


        let allAttr = null
        Object.values(StatModifier).map(e => {
            //console.log(e)
            e.resolver(e.id, e.inputs, e.outputs, baseStats, itemStats, e.value)
        })

/*
        allAttr = StatUtil.resolveStat(
            StatModifier.ALL_ATTR.id, StatModifier.ALL_ATTR.stat_id,
            StatUtil.getStat(baseStats, StatTable.STR.id),
            StatUtil.getStat(baseStats, StatTable.DEX.id),
            StatUtil.getStat(baseStats, StatTable.INT.id),
            StatUtil.getStat(baseStats, StatTable.VIT.id),
            StatUtil.getStat(baseStats, StatTable.ALL_ATTR.id) +
                StatUtil.getStat(itemStats, StatTable.ALL_ATTR.id)
        )

        let hpMax = StatUtil.resolveStat(
            StatModifier.HP_PER_VIT.id, StatModifier.HP_PER_VIT.stat_id,
            StatUtil.getStat(baseStats, StatTable.VIT.id) +
                StatUtil.getStat(itemStats, StatTable.VIT.id)
        )
*/
        let currHp = StatUtil.getStat(unitStats, StatTable.UNIT_HP.id)
        let currHpMax = StatUtil.getStat(unitStats, StatTable.UNIT_HP_MAX.id)
        let currHpPercent = currHpMax === 0 ? 0 : currHp/currHpMax

       //if (!StatUtil.setStat(unit.stats, StatTable.UNIT_HP_MAX.id, hpMax))
       //     return false

        console.log(`hp: ${currHp} hp_max: ${currHpMax} all_attr: ${JSON.stringify(allAttr)}`)

        //unit.markModified('stats')
        await unit.save()

        return unit.stats
    }
}

module.exports = { UnitUtil }
