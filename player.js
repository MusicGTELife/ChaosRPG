const { UnitType, UnitBase } = require('./unit')

const { Stats } = require('./stats')
const { StatTable, StatFlag } = require('./stattable')
const { StatModifier } = require('./statmodifier')

class PlayerType { }
PlayerType.MAGE = { id: 0x01, name: "Mage" }
PlayerType.WARRIOR = { id: 0x02, name: "Warrior" }
PlayerType.ROGUE = { id: 0x03, name: "Rogue" }
PlayerType.RANGER = { id: 0x04, name: "Ranger" }
PlayerType.CLERIC = { id:  0x05, name: "Cleric" }

const basePoints = 20
const pointsPerLevel = 4

class PlayerBase {
    static applyOverrides(overrides) {
        overrides.map(stat => {
            let base = PlayerBase.stats.find(base => base.id === stat.id)
            if (base) {
                console.log(`applying override ${base.id} ${base.value} => ${stat.value}`)
                base.value = stat.value
            }
        })
    }
}

PlayerBase.stats = [
    { id: StatTable.UNIT_EXP.id, value: 0 },
    { id: StatTable.UNIT_HP.id, value: 0 },
    { id: StatTable.UNIT_MP.id, value: 0 },
    { id: StatTable.UNIT_HP_MAX.id, value: 0 },
    { id: StatTable.UNIT_MP_MAX.id, value: 0 },

    { id: StatTable.DEX.id, value: 0 },
    { id: StatTable.INT.id, value: 0 },
    { id: StatTable.STR.id, value: 0 },
    { id: StatTable.VIT.id, value: 0 },

    { id: StatTable.ATK.id, value: 0 },
    { id: StatTable.DEF.id, value: 0 },
    { id: StatTable.MATK.id, value: 0 },
    { id: StatTable.MDEF.id, value: 0 }
]

class MageBase extends PlayerBase { }
MageBase.applyOverrides([
    { id: StatTable.DEX.id, value: 2 },
    { id: StatTable.INT.id, value: 8 },
    { id: StatTable.STR.id, value: 2 },
    { id: StatTable.VIT.id, value: 8 },
])

class WarriorBase extends PlayerBase { }
WarriorBase.stats = [
    { id: StatTable.DEX.id, value: 4 },
    { id: StatTable.INT.id, value: 2 },
    { id: StatTable.STR.id, value: 10 },
    { id: StatTable.VIT.id, value: 4 }
]

class RogueBase extends PlayerBase { }
RogueBase.stats = [
    { id: StatTable.DEX.id, value: 8 },
    { id: StatTable.INT.id, value: 8 },
    { id: StatTable.STR.id, value: 2 },
    { id: StatTable.VIT.id, value: 2 }
]

class RangerBase extends PlayerBase { }
RangerBase.stats = [
    { id: StatTable.DEX.id, value: 8 },
    { id: StatTable.INT.id, value: 4 },
    { id: StatTable.STR.id, value: 4 },
    { id: StatTable.VIT.id, value: 4 }
]

class ClericBase extends PlayerBase { }
ClericBase.stats = [
    { id: StatTable.DEX.id, value: 2 },
    { id: StatTable.INT.id, value: 6 },
    { id: StatTable.STR.id, value: 2 },
    { id: StatTable.VIT.id, value: 10 }
]

class Player {
    constructor(game) {
        this.game = game
    }

    static getPlayerTypeString(id) {
        Object.keys(PlayerType).map((k) => {
            if (k.id === id)
                return type.name
        })
        return "unknown"
    }

    static createDescriptor(type, id) {
        let stats = ({
            [PlayerType.MAGE.id]: MageBase.stats,
            [PlayerType.WARRIOR.id]: WarriorBase.stats,
            [PlayerType.ROGUE.id]: RogueBase.stats,
            [PlayerType.RANGER.id]: RangerBase.stats,
            [PlayerType.CLERIC.id]: ClericBase.stats
        })[type] || []

        return {
            id,
            level: 1,
            state: 0,
            type: type,
            inventory: [ 0, 0, 0, 0, 0, 0 ],
            equipment: [ 0, 0, 0, 0, 0, 0 ],
            stats
        }
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

module.exports = { Player, PlayerType }
