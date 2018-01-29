const RNG = require('../rng')
const { StatUtil } = require('./stats')

const { StatTable } = require('../stattable')

const { Tier, TierStatCount } = require('../tier')

const { ItemMod, ItemModTable } = require('../itemmod')
const { ItemClass } = require('../itemclass')
const { ItemTable } = require('../itemtable')

class ItemUtil {
    static getName(code) {
        let name = 'unknown'
        Object.values(ItemTable).map((e) => {
            if (e.code === code) {
                console.log(code, e.name)
                name = e.name
            }
        })

        return name
    }

    static createWeaponDescriptor() {
        let weapon = {
            weapon_class: 0,
            can_duel_wield: false,
            is_2h: false,
            is_ranged: false,
        }

        return weapon
    }

    static createArmorDescriptor() {
        let armor = {
            armor_class: 0,
        }

        return armor
    }

    static createJewelDescriptor() {
        let jewel = {
            jewel_class: 0
        }

        return jewel
    }

    static createBaseDescriptor() {
        return {
            id: 0,
            ilvl: 0,
            is_equipped: false,
            owner: 0,
            code: 0,
            item_class: 0,
            tier: 0,
            descriptor: { },
            stats: [ ]
        }
    }

    static createDescriptor(itemClass) {
        let item = ItemUtil.createBaseDescriptor()

        let descriptor = ({
            [ItemClass.ARMOR]: ItemUtil.createArmorDescriptor(),
            [ItemClass.WEAPON]: ItemUtil.createWeaponDescriptor(),
            [ItemClass.JEWEL]: ItemUtil.createJewelDescriptor()
        })[itemClass] || null

        if (!descriptor)
            return null

        item.descriptor = descriptor

        return item
    }

    static generate(code, itemClass, tier, rarity) {
        let item = ItemUtil.createDescriptor(itemClass)
        item.code = code
        item.tier = tier
        item.rarity = rarity

        let count = TierStatCount[tier]+4
        if (count > 0) {
            let shuffled = RNG.getRandomShuffle(Object.keys(ItemModTable))

            let stats = [...Array(count)]
            stats.map((_,i) => {
                let mod = ItemModTable[shuffled[i]]
                //console.log(`mod ${JSON.stringify(entry)}`)

                Object.values(mod.stat_descriptor).map((desc) => {
                    //console.log(`stat desc ${JSON.stringify(desc)}`)
                    let value = RNG.getRandomInt(desc.min_value, desc.max_value)
                    let stat = StatUtil.createDescriptor(desc.id, value)
                    //console.log(`${JSON.stringify(stat)}`)
                    item.stats.push(stat)
                })
            })
        }

        return item
    }

    static generateStats() {

    }
}

module.exports = { ItemUtil }
