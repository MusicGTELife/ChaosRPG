const { UnitUtil } = require('./unit')
const { ItemUtil } = require('./item')
const { StatUtil } = require('./stats')

const { SecureRNG } = require('../rng')
const { StatTable, StatFlag } = require('../stattable')
const { UnitType } = require('../unit')

const { MonsterClass } = require('../monsterclass')
const { MonsterRarity } = require('../monsterrarity')
const { MonsterTable } = require('../monstertable')

const { ItemTable } = require('../itemtable')
const { ItemClass, ArmorClass, WeaponClass, JewelClass, WeaponFlags } = require('../itemclass')

class MonsterUtil extends UnitUtil {
    static getMonsterTableEntry(code) {
        let entry = Object.values(MonsterTable).find(e => e.code === code)
        return entry
    }

    static isValidType(code) {
        return MonsterUtil.getMonsterTableEntry(code) !== undefined
    }

    static create(code, tier, rarity) {
        if (!MonsterUtil.isValidType(code))
            return null

        let entry = MonsterUtil.getMonsterTableEntry(code)
        if (!entry)
            return null

        let monster = UnitUtil.create(UnitType.MONSTER.id)
        monster.name = entry.name
        monster.descriptor.tier = tier
        monster.descriptor.rarity = rarity
        monster.descriptor.code = code
        monster.stats = MonsterUtil.createBaseStats(code)

        return monster
    }

    static createBaseStats(code) {
        let entry = MonsterUtil.getMonsterTableEntry(code)
        let stats = UnitUtil.createBaseStats(UnitType.MONSTER.id)
        StatUtil.applyOverrides(stats, entry.stats)

        return stats
    }

    static getMonsterWeaponChoices(code, isPrimary) {
        const monsterTableEntry = MonsterUtil.getMonsterTableEntry(code)
        const weaponFlags = monsterTableEntry.weaponFlags

        if (!isPrimary && (weaponFlags & WeaponFlags.CAN_DUAL_WIELD) !== 0)
            return []

        let weapons = ItemUtil.getItemClassEntries([ItemClass.WEAPON])

        let choices = weapons.filter(i => {
            if (i.item_sub_class === WeaponClass.MELEE_1H) {
                if ((weaponFlags & WeaponFlags.MELEE_1H) !== 0 ||
                        (weaponFlags & WeaponFlags.MELEE_ANY) !== 0)
                    return true
            } else if (i.item_sub_class === WeaponClass.MELEE_2H) {
                if ((weaponFlags & WeaponFlags.MELEE_2H) !== 0 ||
                        (weaponFlags & WeaponFlags.MELEE_ANY) !== 0)
                    return true
            } else if (i.item_sub_class === WeaponClass.CASTING_1H) {
                if ((weaponFlags & WeaponFlags.CASTING_1H) !== 0 ||
                        (weaponFlags & WeaponFlags.CASTING_ANY) !== 0)
                    return true
            } else if (i.item_sub_class === WeaponClass.CASTING_2H) {
                if ((weaponFlags & WeaponFlags.CASTING_1H) !== 0 ||
                        (weaponFlags & WeaponFlags.CASTING_ANY) !== 0)
                    return true
            } else if (i.item_sub_class === WeaponClass.RANGED) {
                if ((weaponFlags & WeaponFlags.RANGED) !== 0)
                    return true
            }

            return false
        })

        //console.log(choices)
        return choices
    }

    // Monster generation is fun, we can't have simple idiomatic code all of
    // the time; this is one bad ass fothermucker
    generate(monsterRngCtx, code, tier, rarity) {
        let monster = MonsterUtil.create(code, tier, rarity)
        if (!monster) {
            console.log(`failed to create monster ${code}`)
            return null
        }

        // Update monster stats based on tier and rarity, for now just scale
        // the values
        monster.stats.map(e => {
            let statEntry = StatUtil.getStatTableEntry(e.id)
            if ((statEntry.flags & StatFlag.BASE) !== 0) {
                StatUtil.setStat(monster.stats, e.id, e.value*(tier+rarity))
            }
        })

        // FIXME move to datatable
        let monsterItems = ({
            [MonsterRarity.COMMON.id]: { min: 1, max: 2},
            [MonsterRarity.MAGIC.id]: { min: 2, max: 3},
            [MonsterRarity.RARE.id]: { min: 3, max: 4},
            [MonsterRarity.UNIQUE.id]: { min: 4, max: 5},
            [MonsterRarity.BOSS.id]: { min: 5, max: 6},
            [MonsterRarity.SUPERBOSS.id]: { min: 6, max: 8},
        })[rarity] || { min: 0, max: 0 }

        let count = SecureRNG.getRandomInt(monsterRngCtx, monsterItems.min, monsterItems.max)

        console.log(`generating ${count} monster items`)

        const monsterTableEntry = MonsterUtil.getMonsterTableEntry(code)
        const weaponFlags = monsterTableEntry.weaponFlags

        // FIXME|TODO decide if a monster can equip an item regardless of
        // meeting the items stat requirements, or alternatively implement code
        // to provide additional requirement filters

        let itemRngCtx = this.game.secureRng.getContext('item')
        let items = []

        // TODO|FIXME account for newly added monster types ie. check against
        // WeaponFlags.*_UNARMED

        // First, generate a primary weapon
        let choices = MonsterUtil.getMonsterWeaponChoices(code, true)
        let choice = this.game.item.getRandomItemTableEntry(choices)
        const isPrimaryTwoHanded =
            (choice.item_class === ItemClass.WEAPON && choice.item_sub_class === WeaponClass.MELEE_2H) ||
            (choice.item_class === ItemClass.WEAPON && choice.item_sub_class === WeaponClass.CASTING_2H)

        if (isPrimaryTwoHanded)
            console.log('primary two handed')

        let item = ItemUtil.generate(itemRngCtx,
            choice.code, choice.item_class, choice.item_sub_class, tier, rarity
        )

        if (!item) {
            console.log('unable to generate item for monster')
            process.exit(1)
            return null
        }

        items.push(item)

        count--

        // Second, generate a shield, quiver or spellbook for casters, or a
        // second weapon if the monster can dual wield and the primary weapon
        // is not two-handed
        if (count && !isPrimaryTwoHanded) {
            choices = MonsterUtil.getMonsterWeaponChoices(code, false)
            let weaponAvailable = choices.length !== 0
            let magic = 0
            if (weaponAvailable) {
                // okay, the unit is able to dual wield, give a 1/4 chance of
                // selecting a secondary weapon
                // FIXME add the chance of dual wielding to a data table
                magic = SecureRNG.getRandomInt(monsterRngCtx, 0, 3)
            }

            if (weaponAvailable && magic === 3) {
                // generate weapon
                choice = this.game.item.getRandomItemTableEntry(choices)
            } else {
                // generate a shield, quiver or a spell book for the second hand
                choices = ItemUtil.getItemSubClassEntries(ItemClass.ARMOR,
                    [ ArmorClass.SHIELD, ArmorClass.SPELLBOOK, ArmorClass.QUIVER ])
                choice = this.game.item.getRandomItemTableEntry(choices)
                if (!choice)
                    process.exit(1)
            }

            item = ItemUtil.generate(itemRngCtx, choice.code,
                choice.item_class, choice.item_sub_class, tier, rarity
            )
            if (item)
                items.push(item)
            count--
        }

        // Additional items are randomly chosen from the remaining item types
        // FIXME, generate random array of indices into the combined remaining
        // choices array or shuffle the array to prevent multiple choices of the
        // same item subclass from being selected
        for (let i = 0; i < count; i++) {
            // remaining armor choices
            choices = ItemUtil.getItemSubClassEntries(ItemClass.ARMOR, [
                ArmorClass.BOOTS, ArmorClass.GLOVES,
                ArmorClass.HELMET, ArmorClass.BODY_ARMOR
            ])
            choices = choices.concat(ItemUtil.getItemClassEntries([ItemClass.JEWEL]))
            choice = this.game.item.getRandomItemTableEntry(choices)

            item = ItemUtil.generate(itemRngCtx, choice.code,
                choice.item_class, choice.item_sub_class, tier, rarity
            )
            if (item)
                items.push(item)

            //console.log('additional', i, choice)
        }

        //console.log('items', items)

        // okay the monster and items are generated, pass them back back
        // to the caller for saving in the database
        return { monster, items }
    }
}

module.exports = { MonsterUtil }
