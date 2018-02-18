const { SecureRNG, SecureRNGContext, getRandomShuffle } = require('../rng') // FIXME getrandomshuffle
const { StatUtil } = require('./stats')

const { StatTable } = require('../stattable')

const { Tier } = require('../tier')

const { ItemClass, WeaponClass, WeaponFlags } = require('../itemclass')
const { ItemMod, ItemModTable } = require('../itemmod')
const { ItemTable } = require('../itemtable')

class ItemUtil {
    constructor(game) {
        this.game = game
    }

    // TODO FIXME move item table helpers to their own module
    static getItemTableEntry(code) {
        return Object.values(ItemTable).find(e => e.code === code)
    }

    // itemClasses an array of allowed item class ids
    static getItemClassEntries(itemClasses) {
        return Object.values(ItemTable).filter(i =>
            itemClasses.find(ic => ic === i.item_class) !== undefined
        )
    }

    // itemClass an item class id
    // itemSubClasses an array of allowed sub class ids
    static getItemSubClassEntries(itemClass, itemSubClasses) {
        return Object.values(ItemTable).filter(i =>
            i.item_class === itemClass &&
                itemSubClasses.find(isc => i.item_sub_class === isc) !== undefined
        )
    }

    // entries an array of item table entries already read from the item tables
    getRandomItemTableEntry(entries) {
        if (entries.length === 0)
            return null

        if (entries.length === 1)
            return entries[0]

        let itemRngCtx = this.game.secureRng.getContext('item')
        let magic = SecureRNG.getRandomInt(itemRngCtx, 0, entries.length-1)
        let choice = entries[magic]

        return choice
    }

    static getName(code) {
        let entry = ItemUtil.getItemTableEntry(code)
        if (!entry)
            return 'invalid'

        return entry.name
    }

    static createWeaponDescriptor() {
        return {
            can_duel_wield: false,
            is_2h: false,
            is_ranged: false
        }
    }

    static createArmorDescriptor() {
        return {
        }
    }

    static createJewelDescriptor() {
        return {
            is_charm: false
        }
    }

    static createBaseDescriptor() {
        return {
            id: 0,
            ilvl: 0,
            owner: 0,
            code: 0,
            item_class: 0,
            item_sub_class: 0,
            tier: 0,
            rarity: 0,
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

    static generate(itemRngCtx, code, itemClass, itemSubClass, tier, rarity) {
        const tableEntry = ItemUtil.getItemTableEntry(code)
        if (!tableEntry) {
            console.log('unable to get item table entry')
            process.exit(1)
            return null
        }

        if (!tableEntry.is_starter_item && !(itemRngCtx instanceof SecureRNGContext))
            throw new TypeError('invalid RNG context')

        const item = ItemUtil.createDescriptor(itemClass)
        if (!item) {
            console.log(`unable to create item descriptor for item_class ${itemClass}`)
            process.exit(1)
            return null
        }

        const tierEntry = Object.values(Tier).find(t => t.id === tier)
        if (!tierEntry) {
            console.log('unable to get item tier entry')
            process.exit(1)
            return null
        }

        item.code = code

        // TODO remove these and just lookup the info in the ItemTable
        item.item_class = itemClass
        item.item_sub_class = itemSubClass
        item.storage_flag = tableEntry.storage_flag

        item.tier = tier
        item.rarity = rarity

        if (tableEntry.item_class === ItemClass.WEAPON) {
            if (tableEntry.item_sub_class === WeaponClass.RANGED)
                item.descriptor.is_ranged = true
            if (tableEntry.item_sub_class === WeaponClass.CASTING_2H ||
                    tableEntry.item_sub_class === WeaponClass.MELEE_2H)
                item.descriptor.is_2h = true
            if (tableEntry.item_sub_class === WeaponClass.MELEE_1H)
                item.descriptor.can_duel_wield = true
        }

        // Add implicit mods on items
        // FIXME|TODO shields, quivers, spellbooks
        tableEntry.implicit_stats.map(m => {
            //let value = SecureRNG.getRandomInt(itemRngCtx, desc.min_value, desc.max_value)
            let stat = StatUtil.createDescriptor(m.id, m.value)
            //console.log(`adding stat ${JSON.stringify(stat)}`)
            item.stats.push(stat)
            console.log('added implicit mod', stat)
        })

        if (tableEntry.is_starter_item) {
            return item
        }

        const count = tierEntry.stat_counts[2] // FIXME once tiers are worked out
        if (count > 0) {
            let itemMods = Object.keys(ItemModTable).filter(i => i.mod_class !== ItemModClass.IMPLICIT)
            const shuffled = SecureRNG.shuffleSequence(itemRngCtx, itemMods)
            console.log('shuffled', shuffled)

            let stats = [...Array(count)]
            stats.map((_,i) => {
                let mod = ItemModTable[shuffled[i]]
                //console.log(`mod ${JSON.stringify(mod)}`)

                Object.values(mod.stat_descriptor).map(desc => {
                    //console.log(`stat desc ${JSON.stringify(desc)}`)
                    let value = SecureRNG.getRandomInt(itemRngCtx, desc.min_value, desc.max_value)
                    let stat = StatUtil.createDescriptor(desc.id, value)
                    //console.log(`adding stat ${JSON.stringify(stat)}`)
                    item.stats.push(stat)
                })
            })
        }

        return item
    }

    static setOwner(item, ownerId) {
        item.owner = ownerId
    }
}

module.exports = { ItemUtil }
