const { SecureRNG, SecureRNGContext } = require('../rng')
const { StatUtil } = require('./stats')

const { Tier } = require('../tier')

const { ItemClass, WeaponClass, ArmorClass } = require('../itemclass')
const { ItemModTable, ItemModClass } = require('../itemmod')
const { ItemTable } = require('../itemtable')
const { ItemRarity } = require('../itemrarity')

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
        let magic = SecureRNG.getRandomInt(itemRngCtx, 0, entries.length - 1)
        let choice = entries[magic]

        return choice
    }

    static getName(code) {
        let entry = ItemUtil.getItemTableEntry(code)
        if (!entry)
            return 'invalid'

        return entry.name
    }

    static getItemRarityEntry(rarity) {
        return Object.values(ItemRarity).find(e => e.id === rarity)
    }

    static getRarityName(rarity) {
        let entry = ItemUtil.getItemRarityEntry(rarity)
        if (entry)
            return entry.name

        return ItemRarity.INFERIOR.name
    }

    static createWeaponDescriptor() {
        return {
            'can_duel_wield': false,
            'is_2h': false,
            'is_ranged': false
        }
    }

    static createArmorDescriptor() {
        return {
        }
    }

    static createJewelDescriptor() {
        return {
            'is_charm': false
        }
    }

    static createBaseDescriptor() {
        return {
            'id': 0,
            'ilvl': 0,
            'owner': 0,
            'code': 0,
            'item_class': 0,
            'item_sub_class': 0,
            'tier': 0,
            'rarity': 0,
            'descriptor': { },
            'stats': [ ]
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

    static getAdjustedStat(value, tier, rarity) {
        return Math.round(value *
            (1 + ((rarity - 1) * 0.25) + ((tier - 1) * 0.25)))
    }

    static rollItemStat(itemRngCtx, min, max) {
        let magic = min
        if (min !== max)
            magic = SecureRNG.getRandomInt(itemRngCtx, min, max)

        return magic
    }

    static rollItemMods(itemRngCtx, item, tier, rarity, modCount) {
        if (!item)
            return false

        if (modCount <= 0)
            return false

        const itemMods = Object.keys(ItemModTable).filter(i => i.mod_class !== ItemModClass.IMPLICIT)
        const shuffled = SecureRNG.shuffleSequence(itemRngCtx, itemMods)
        // console.log('shuffled', shuffled)

        const stats = [ ...Array(modCount) ]
        stats.map((_, i) => {
            const mod = ItemModTable[shuffled[i]]
            // console.log(`mod ${JSON.stringify(mod)}`)

            Object.values(mod.stat_descriptor).map(desc => {
                // console.log(`stat desc ${JSON.stringify(desc)}`)

                let increased = { 'min': desc.min_value, 'max': desc.max_value }
                increased.min = ItemUtil.getAdjustedStat(desc.min_value, tier, rarity)
                increased.max = ItemUtil.getAdjustedStat(desc.max_value, tier, rarity)

                const magic = ItemUtil.rollItemStat(itemRngCtx, increased.min, increased.max)

                console.log('stat', tier, rarity, magic)

                const stat = StatUtil.createDescriptor(desc.id, magic)
                // console.log(`adding stat ${JSON.stringify(stat)}`)
                item.stats.push(stat)
            })
        })

        return true
    }

    static generate(itemRngCtx, code, itemClass, itemSubClass, tier, rarity) {
        const tableEntry = ItemUtil.getItemTableEntry(code)
        if (!tableEntry) {
            console.log('unable to get item table entry')
            process.exit(1)

            return null
        }

        if (!(itemRngCtx instanceof SecureRNGContext))
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
        tableEntry.implicit_stats.map(m => {
            let min = ItemUtil.getAdjustedStat(m.min, tier, rarity)
            let max = ItemUtil.getAdjustedStat(m.max, tier, rarity)

            let magic = ItemUtil.rollItemStat(itemRngCtx, min, max)
            let stat = StatUtil.createDescriptor(m.id, magic)

            item.stats.push(stat)
            console.log('added implicit stat magic m increased tier rarity', stat.id, magic, m, min, max, tier, rarity)
        })

        if (tableEntry.is_starter_item)
            return item

        const count = tierEntry.stat_counts[2] // FIXME once tiers are worked out
        if (count > 0) {
            if (!ItemUtil.rollItemMods(itemRngCtx, item, tier, rarity, count)) {
                console.log('failed to roll item mods')
                process.exit(1)

                return null
            }
        }

        return item
    }

    static setOwner(item, ownerId) {
        item.owner = ownerId
    }

    static isWeapon(item) {
        if (!item)
            return false

        const itemEntry = ItemUtil.getItemTableEntry(item.code)
        if (!itemEntry) {
            console.log('no item table entry')
            process.exit(1)

            return false
        }

        return itemEntry.item_class === ItemClass.WEAPON
    }

    static isRanged(item) {
        if (!item)
            return false

        const itemEntry = ItemUtil.getItemTableEntry(item.code)
        if (!itemEntry) {
            console.log('no item table entry')
            process.exit(1)

            return false
        }

        return ItemUtil.isWeapon(item) &&
                itemEntry.item_sub_class === WeaponClass.RANGED
    }

    static isMelee(item) {
        if (!item)
            return false

        const itemEntry = ItemUtil.getItemTableEntry(item.code)
        if (!itemEntry) {
            console.log('no item table entry')
            process.exit(1)

            return false
        }

        return ItemUtil.isWeapon(item) &&
                (itemEntry.item_sub_class === WeaponClass.MELEE_1H ||
                itemEntry.item_sub_class === WeaponClass.MELEE_2H)
    }

    static isCasting(item) {
        if (!item)
            return false

        const itemEntry = ItemUtil.getItemTableEntry(item.code)
        if (!itemEntry) {
            console.log('no item table entry')
            process.exit(1)

            return false
        }

        return ItemUtil.isWeapon(item) &&
                (itemEntry.item_sub_class === WeaponClass.CASTING_1H ||
                itemEntry.item_sub_class === WeaponClass.CASTING_2H)
    }

    static isTwoHanded(item) {
        if (!item)
            return false

        const itemEntry = ItemUtil.getItemTableEntry(item.code)
        if (!itemEntry) {
            console.log('no item table entry')
            process.exit(1)

            return false
        }

        return ItemUtil.isWeapon(item) &&
                (itemEntry.item_sub_class === WeaponClass.MELEE_2H ||
                itemEntry.item_sub_class === WeaponClass.CASTING_2H)
    }

    static isShieldClass(item) {
        if (!item)
            return false

        const itemEntry = ItemUtil.getItemTableEntry(item.code)
        if (!itemEntry) {
            console.log('no item table entry')
            process.exit(1)

            return false
        }

        return itemEntry.item_class === ItemClass.ARMOR &&
                (itemEntry.item_sub_class === ArmorClass.SHIELD ||
                itemEntry.item_sub_class === ArmorClass.SPELLBOOK ||
                itemEntry.item_sub_class === ArmorClass.QUIVER)
    }

    static isWeaponOrShield(item) {
        if (!item)
            return false

        const itemEntry = ItemUtil.getItemTableEntry(item.code)
        if (!itemEntry) {
            console.log('no item table entry')
            process.exit(1)

            return false
        }

        return ItemUtil.isWeapon(item) || ItemUtil.isShieldClass(item)
    }

    static isMelee1HCompatible(item) {
        if (!item) {
            // A null item signifies an empty slot and hence compatibility
            return true
        }

        const itemEntry = ItemUtil.getItemTableEntry(item.code)
        if (!itemEntry) {
            console.log('no item entry')
            process.exit(1)

            return false
        }

        if (!ItemUtil.isWeaponOrShield(item))
            return false

        if (ItemUtil.isTwoHanded(item))
            return false

        if (ItemUtil.isMelee(item))
            return true

        if (itemEntry.item_class === ItemClass.ARMOR &&
                itemEntry.item_sub_class === ArmorClass.SHIELD)
            return true

        return false
    }

    static isMelee2HCompatible(item) {
        if (!item) {
            // A null item signifies an empty slot and hence compatibility
            return true
        }

        return false
    }

    static isCasting1HCompatible(item) {
        if (!item) {
            // A null item signifies an empty slot and hence compatibility
            return true
        }

        const itemEntry = ItemUtil.getItemTableEntry(item.code)
        if (!itemEntry) {
            console.log('no item entry')
            process.exit(1)

            return false
        }

        if (!ItemUtil.isWeaponOrShield(item))
            return false

        if (ItemUtil.isTwoHanded(item))
            return false

        if (ItemUtil.isCasting(item))
            return true

        if (itemEntry.item_class === ItemClass.ARMOR &&
                (itemEntry.item_sub_class === ArmorClass.SHIELD ||
                itemEntry.item_sub_class === ArmorClass.SPELLBOOK))
            return true

        return false
    }

    static isCasting2HCompatible(item) {
        if (!item) {
            // A null item signifies an empty slot and hence compatibility
            return true
        }

        return false
    }

    static isRangedCompatible(item) {
        if (!item) {
            // A null item signifies an empty slot and hence compatibility
            return true
        }

        const itemEntry = ItemUtil.getItemTableEntry(item.code)
        if (!itemEntry) {
            console.log('no item entry')
            process.exit(1)

            return false
        }

        if (!ItemUtil.isWeaponOrShield(item))
            return false

        if (ItemUtil.isTwoHanded(item))
            return false

        if (ItemUtil.isRanged(item))
            return false

        if (itemEntry.item_class === ItemClass.ARMOR &&
                itemEntry.item_sub_class === ArmorClass.QUIVER)
            return true

        return false
    }
}

module.exports = { ItemUtil }
