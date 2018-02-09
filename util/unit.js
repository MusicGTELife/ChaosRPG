const { StatUtil } = require('./stats')
const { StorageUtil } = require('./storage')
const { ItemUtil } = require('./item')

const { Storage } = require('../storage')
const { StatModifier } = require('../statmodifier')
const { StatTable, StatFlag } = require('../stattable')
const { UnitType } = require('../unit')
const { Player } = require('../player')
const { Monster } = require('../monster')
const { ItemTable } = require('../itemtable')

class UnitUtil {
    constructor(game) {
        this.game = game
    }

    static isValidType(type) {
        let valid = ({
            [UnitType.PLAYER.id]: true,
            [UnitType.MONSTER.id]: true
        })[type] || false
        return valid
    }

    static create(type) {
        if (!UnitUtil.isValidType(type))
            return null

        let descriptor = ({
            [UnitType.PLAYER.id]: Player.descriptor,
            [UnitType.MONSTER.id]: Monster.descriptor
        })[type]

        //console.log(`create ${JSON.stringify(descriptor)}`)

        return {
            id: 0,
            type,
            name: '',
            stats: UnitUtil.createBaseStats(type),
            storage: StorageUtil.createStorage(type),
            descriptor
        }
    }

    static createBaseStats(type) {
        if (!UnitUtil.isValidType(type))
            return null

        let stats = Object.values(StatTable).filter(e => {
            if (type === UnitType.PLAYER.id && (e.flags & StatFlag.PLAYER) !== 0)
                return { id: e.id, value: 0 }
            else if (type === UnitType.MONSTER.id && (e.flags & StatFlag.MONSTER) !== 0)
                return { id: e.id, value: 0 }
            else if ((e.flags & StatFlag.BASE) !== 0 || (e.flags & StatFlag.UNIT) !== 0)
                return { id: e.id, value: 0 }
        }).map(e => ({ id: e.id, value: 0}))

        return stats
    }

    getAllItemStats(items) {
        if (!items)
            return []

        let stats = []
        items.map(v => {
            stats = stats.concat(...v.stats)
        })

        return stats
    }

    verifyUnitStorage(unit, equippedItems) {
        const valid = unit.storage.every(n => {
            let invalidStorage = n.buffer.every(s => {
                if (s === 0)
                    return true

                if (s < 0)
                    return false

                if (n.id === Storage.INVENTORY.id && equippedItems &&
                        !equippedItems.find(i => i.id === s))
                    return false

                return true
            }) !== true

            return !invalidStorage
        })

        //console.log(unit.storage)
        return valid
    }

    static itemRequirementsAreMet(unit, item) {
        if (!unit || !item)
            return false

        const entry = ItemUtil.getItemTableEntry(item.code)
        if (!entry)
            return false

        console.log(entry.requirements)

        const met = entry.requirements.every(i => {
            const unitStat = StatUtil.getStat(unit.stats, i.id)
            if (unitStat >= i.value)
                return true

            return false
        })

        console.log('met', met)
        return met
    }

    equipItem(unit, items, item, node, slot) {
        if (!unit || !item)
            return false

        if (!StorageUtil.canEquipItemTypeInSlot(unit.storage, node, slot, item.code))
            return false

        //console.log('can equip type in slot')

        if (!StorageUtil.canEquipInSlot(unit.storage, node, slot))
            return false

        //console.log('can equip in slot')

        // Special case to allow monsters to equip items regardless of the items
        // stat requirements
        if (unit.type === UnitType.PLAYER.id && !UnitUtil.itemRequirementsAreMet(unit, item))
            return false

        if (!StorageUtil.setSlot(unit.storage, node, slot, item.id)) {
            console.log('failed setting item slot')
            return false
        }

        return true
    }

    unequipItem(player, items, item, nodeId, slotId) {
        if (!unit || !items || !item)
            return false

        const found = items.find(i => i.id === item.id)
        if (!found) {
            console.log(`item ${item.id} is not equipped`)
            return false
        }

        console.log('can unequip item')

        if (!StorageUtil.setSlot(storage, node, slot, 0)) {
            console.log('failed setting item slot')
            return false
        }

        console.log(`unequip eq ${JSON.stringify(player.storage)}`)

        return true
    }

    equipItemByType(unit, items, item) {
        if (!unit)
            return false

        if (!item)
            return false

        // FIXME sanity checks to ensure unit is owner

        //console.log('equipItemByType', ItemUtil.getName(item.code))

        let slotTypes = StorageUtil.getValidSlotsForItem(unit.storage, item)
            .filter(st => StorageUtil.canEquipInSlot(unit.storage, st.id, st.slot))

        //console.log('slottypes', slotTypes)

        // Pick the first location in the filtered slot list, if the item
        // can be placed in both the equipment and the inventory, the equipment
        // node will be selected. In either case the first available slot will
        // be selected


        let entry = slotTypes.find(st => st.id === Storage.EQUIPMENT.id)
        if (!entry) {
            entry = slotTypes.find(st => st.id === Storage.INVENTORY.id)
        }

        if (!entry) {
            console.log('no slot entry found', item)
            process.exit(1)
            return false
        }

        // The unit is able to store the item according to the items type
        // and storage flags, time to call the real equipItem

        //console.log('equipItemByType found slot', entry)

        return this.equipItem(unit, items, item, entry.id, entry.slot)
    }

    async getEquippedItems(unit) {
        if (unit) {
            let items = await this.game.gameDb.getUnitItems(unit.id)
            //console.log(`getEquippedItems ${JSON.stringify(items)}`)

            return items
        }

        process.exit(1)
        return null
    }

    // called when:
    // - a unit is generated
    // - item placed or on removed from a units equipment slot
    // - a player unit levels
    async computeBaseStats(unit, items) {
        if (!unit)
            return null

        let valid = this.verifyUnitStorage(unit, items)
        if (!valid) {
            console.log('unit storage is invalid')
            return null
        }

        let itemStats = await this.getAllItemStats(items)
        itemStats = StatUtil.getReducedStats(itemStats)

        // filter stat types in seperate lists
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

        let stats = itemStats.concat(baseStats)
        stats = StatUtil.getReducedStats(stats)
        console.log(StatUtil.getStat(stats, StatTable.DEX.id))

        // process each base stat which needs to be resolved by a formula
        let resolvedStats = StatUtil.resolve(stats, StatUtil.getModifiers())

        // recalculate unit special stats based on resolved base stats
        let currHp = StatUtil.getStat(unitStats, StatTable.UNIT_HP.id)
        let currHpMax = StatUtil.getStat(unitStats, StatTable.UNIT_HP_MAX.id)

        let currHpPercent = currHpMax === 0 ? 0 : currHp/currHpMax

        let resolvedHp = StatUtil.getStat(resolvedStats, StatTable.HP.id)

        // the unit has died or is newly created, set full life
        if (currHp.value === 0) {
            if (!StatUtil.setStat(unit.stats, StatTable.UNIT_HP_MAX.id, resolvedHp.value))
                throw new Error('Unable to set stat')
            if (!StatUtil.setStat(unit.stats, StatTable.UNIT_HP.id, resolvedHp.value))
                throw new Error('Unable to set stat')
        }

        if (currHpMax.value < resolvedHp.value) {
            if (!StatUtil.setStat(unit.stats, StatTable.UNIT_HP_MAX.id, resolvedHp.value))
                throw new Error('Unable to set stat')
        }

        currHp = StatUtil.getStat(unitStats, StatTable.UNIT_HP.id)
        currHpMax = StatUtil.getStat(unitStats, StatTable.UNIT_HP_MAX.id)

        console.log(`${unit.name}currHp:` +
            `${currHp.value} currHpMax: ${currHpMax.value}`)

        // save else where once things settle a bit
        await unit.save()

        return unit.stats
    }
}

module.exports = { UnitUtil }
