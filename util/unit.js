const { StatUtil } = require('./stats')
const { StorageUtil } = require('./storage')
const { ItemUtil } = require('./item')

const { Storage } = require('../storage')
const { StatModifier } = require('../statmodifier')
const { StatTable, StatFlag } = require('../stattable')
const { UnitType } = require('../unit')
const { Player } = require('../player')
const { Monster } = require('../monster')

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

        console.log(`create ${JSON.stringify(descriptor)}`)

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
        items.map(v => { stats.push(...v.stats) })

        return stats
    }

    verifyUnitStorage(unit, equippedItems) {
        const valid = unit.storage.every(n => {
            let invalidStorage = n.buffer.every(s => {
                if (s === 0)
                    return true

                if (s < 0)
                    return false

                if (n.id === Storage.EQUIPMENT.id && equippedItems &&
                        !equippedItems.find(i => i.id === s))
                    return false

                return true
            }) !== true

            let invalidEquipment = false
            if (n.id === Storage.EQUIPMENT.id && equippedItems) {
                invalidEquipment = equippedItems.every(i => {
                    let found = n.buffer.find(s => s === i.id)
                    return found !== undefined
                }) !== true
            }

            if (invalidStorage || invalidEquipment)
                console.log('storage invalid', invalidStorage, 'equipment invalid', invalidEquipment)

            return !invalidStorage && !invalidEquipment
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

    async equipItem(unit, item, node, slot) {
        if (!unit || !item)
            return false

        const items = await this.game.unit.getEquippedItems(unit)
        if (items) {
            let found = items.find(i => i.id === item.id)
            if (found) {
                console.log(`item ${item.id} is already equipped`);
                return false
            }
        }

        if (!StorageUtil.canEquipItemTypeInSlot(unit.storage, node, slot, item.code))
            return false

        if (!StorageUtil.canEquipInSlot(unit.storage, node, slot))
            return false

        // Special case to allow monsters to equip items regardless of the items
        // stat requirements
        if (unit.type === UnitType.PLAYER.id && !UnitUtil.itemRequirementsAreMet(unit, item))
            return false

        console.log('can equip item')

        if (!StorageUtil.setSlot(unit.storage, node, slot, item.id)) {
            console.log('failed setting item slot')
            return false
        }

        item.is_equipped = true

        await item.save()

        unit.markModified('storage') // due to mongoose bug
        await unit.save()

        return true
    }

    async unequipItem(player, item, node, slot) {
        if (!unit || !items || !item)
            return false

        const items = await this.game.player.getEquippedItems(unit)
        if (!items)
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

        //player.equipment[idx] = 0
        item.is_equipped = false

        console.log(`unequip eq ${JSON.stringify(player.storage)}`)

        return true
    }

    async equipItem(unit, item) {
        if (!unit)
            return false

        if (!item)
            return false

        let slotTypes = StorageUtil.getValidEquipmentSlotsForItem(unit.storage, item)

        //console.log('equipItem out', slotTypes)

        return true
    }

    async getEquippedItems(unit) {
        if (unit) {
            let items = await this.game.gameDb.getUnitItems(unit.id)
            if (items)
                items = items.filter(v => v.is_equipped === true)
            //console.log(`getEquippedItems ${JSON.stringify(items)}`)

            return items
        }

        return null
    }

    // called when:
    // - a unit is generated
    // - item placed or on removed from a units equipment slot
    // - a player unit levels
    async computeBaseStats(unit, items) {
        if (!unit)
            return

        let valid = this.verifyUnitStorage(unit, items)
        console.log(`unit storage is ${valid}`)

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

        // process each base stat which needs to be resolved by a formula
        let resolvedStats = StatUtil.resolve(baseStats.concat(unitStats), StatUtil.getModifiers())

        // recalculate unit special stats based on resolved base stats
        let currHp = StatUtil.getStat(unitStats, StatTable.UNIT_HP.id)
        let currHpMax = StatUtil.getStat(unitStats, StatTable.UNIT_HP_MAX.id)

        let currHpPercent = currHpMax === 0 ? 0 : currHp/currHpMax

        let resolvedHp = StatUtil.getStat(resolvedStats, StatTable.HP.id)
        console.log(`${unit.name} rHP: ${resolvedHp} currHp: ${currHp} currHpMax: ${currHpMax} all_attr: ${JSON.stringify(resolvedStats)}`)

        if (resolvedHp > currHpMax) {
            console.log(`rHP ${resolvedHp} currHpMax ${currHpMax}`)
            if (!StatUtil.setStat(unit.stats, StatTable.UNIT_HP_MAX.id, resolvedHp))
                throw 'Unable to set stat'
        }

        // save else where once things settle a bit
        //await unit.save()

        return unit.stats
    }
}

module.exports = { UnitUtil }
