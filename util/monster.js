const { UnitUtil } = require('./unit')
const { ItemUtil } = require('./item')
const { StatUtil } = require('./stats')

const { SecureRNG } = require('../rng')
const { StatTable, StatFlag } = require('../stattable')
const { UnitType } = require('../unit')

const { MonsterClass } = require('../monsterclass')
const { MonsterRarity } = require('../monsterrarity')
const { MonsterTable } = require('../monstertable')

const { ItemRarity } = require('../itemrarity')
const { ItemTable } = require('../itemtable')
const { ItemClass, ArmorClass, WeaponClass, JewelClass, WeaponFlags } = require('../itemclass')
const { Tier } = require('../tier')

class MonsterUtil extends UnitUtil {
    static getMonsterTableEntry(code) {
        let entry = Object.values(MonsterTable).find(e => e.code === code)
        return entry
    }

    static isValidType(code) {
        return MonsterUtil.getMonsterTableEntry(code) !== undefined
    }

    static create(code, level, tier, rarity) {
        if (!MonsterUtil.isValidType(code))
            return null

        let entry = MonsterUtil.getMonsterTableEntry(code)
        if (!entry)
            return null

        let monster = UnitUtil.create(UnitType.MONSTER.id, level, entry.name)
        if (!monster)
            return null

        monster.descriptor.tier = tier
        monster.descriptor.rarity = rarity
        monster.descriptor.code = code

        let stats = MonsterUtil.createBaseStats(code)
        if (!stats)
            return null

        monster.stats = MonsterUtil.createBaseStats(code)

        return monster
    }

    static createBaseStats(code) {
        let entry = MonsterUtil.getMonsterTableEntry(code)
        if (!entry)
            return null

        let stats = UnitUtil.createBaseStats(UnitType.MONSTER.id)
        if (!stats)
            return null

        StatUtil.applyOverrides(stats, entry.stats)

        return stats
    }

    static getMonsterRarityEntry(id) {
        return Object.values(MonsterRarity).find(r => r.id === id)
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
                        (weaponFlags & WeaponFlags.ANY_MELEE) !== 0)
                    return true
            } else if (i.item_sub_class === WeaponClass.MELEE_2H) {
                if ((weaponFlags & WeaponFlags.MELEE_2H) !== 0 ||
                        (weaponFlags & WeaponFlags.ANY_MELEE) !== 0)
                    return true
            } else if (i.item_sub_class === WeaponClass.CASTING_1H) {
                if ((weaponFlags & WeaponFlags.CASTING_1H) !== 0 ||
                        (weaponFlags & WeaponFlags.ANY_CASTING) !== 0)
                    return true
            } else if (i.item_sub_class === WeaponClass.CASTING_2H) {
                if ((weaponFlags & WeaponFlags.CASTING_2H) !== 0 ||
                        (weaponFlags & WeaponFlags.ANY_CASTING) !== 0)
                    return true
            } else if (i.item_sub_class === WeaponClass.RANGED) {
                if ((weaponFlags & WeaponFlags.RANGED) !== 0)
                    return true
            }

            return false
        })

        return choices
    }

    static getExperienceReward(monster, player) {
        if (!monster || !player)
            return 0

        if (monster.type !== UnitType.MONSTER.id)
            return 0

        if (player.type !== UnitType.PLAYER.id)
            return 0

        const entry = MonsterUtil.getMonsterTableEntry(monster.descriptor.code)
        let exp = entry.base_experience
        if (monster.level > 1)
            exp = Math.pow(exp*(monster.level-1), 1.125)

/*
        const diff = Math.abs(monster.level-player.level)
        if (diff > 2) {
            exp *= 1/(diff-1)
        }
*/
        return Math.floor(exp)
    }

    getSecondaryWeaponChoice(monsterRngCtx, monsterCode, primaryChoice) {
        let choice = null
        let choices = MonsterUtil.getMonsterWeaponChoices(monsterCode, false)
        const weaponAvailable = choices.length !== 0

        const isPrimaryTwoHanded =
            (primaryChoice.item_class === ItemClass.WEAPON && primaryChoice.item_sub_class === WeaponClass.MELEE_2H) ||
            (primaryChoice.item_class === ItemClass.WEAPON && primaryChoice.item_sub_class === WeaponClass.CASTING_2H)

        const isRanged = primaryChoice.item_class === ItemClass.WEAPON && primaryChoice.item_sub_class === WeaponClass.RANGED

        if (isPrimaryTwoHanded)
            console.log('primary two handed')

        // okay, the unit is able to dual wield, give a 1/4 chance of
        // selecting a secondary weapon
        // FIXME add the chance of dual wielding to a data table
        let magic = 0
        if (weaponAvailable)
            magic = SecureRNG.getRandomInt(monsterRngCtx, 0, 3)

        if (weaponAvailable && magic === 3) {
            // generate weapon
            choices = choices.filter(c => {
                return c.item_class === ItemClass.WEAPON &&
                    c.item_sub_class !== WeaponClass.RANGED &&
                    c.item_sub_class !== WeaponClass.MELEE_2H &&
                    c.item_sub_class !== WeaponClass.CASTING_2H
            })

            choice = this.game.item.getRandomItemTableEntry(choices)
            console.log('monster is dual-wielding', item, choices, choice)
        } else {
            // generate a shield, quiver or a spell book for the second hand
            let entry = ItemUtil.getItemTableEntry(item.code)
            let choiceTypes = []

            if (entry.item_sub_class === WeaponClass.MELEE_1H) {
                choiceTypes.push(ArmorClass.SHIELD)
            } else if (entry.item_sub_class === WeaponClass.MELEE_2H) {
            } else if (entry.item_sub_class === WeaponClass.CASTING_1H) {
                choiceTypes.push(ArmorClass.SHIELD)
                choiceTypes.push(ArmorClass.SPELLBOOK)
            } else if (entry.item_sub_class === WeaponClass.CASTING_2H) {
            } else if (entry.item_sub_class === WeaponClass.RANGED) {
                choiceTypes.push(ArmorClass.QUIVER)
            }

            choices = ItemUtil.getItemSubClassEntries(ItemClass.ARMOR, choiceTypes)
            choice = this.game.item.getRandomItemTableEntry(choices)
            console.log('monster gets shield type', item, choices, choice)
        }

        if (!choice) {
            console.log('unable to get item choice generating monster')
            process.exit(1)
            return null
        }

        return choice
    }

    // Monster generation is fun, we can't have simple idiomatic code all of
    // the time; this is one bad ass fothermucker
    generate(monsterRngCtx, code, level, tier, rarity) {
        let unit = MonsterUtil.create(code, level, tier, rarity)
        if (!unit) {
            console.log(`failed to create monster ${code}`)
            return null
        }

        const tierEntry = Object.values(Tier).find(t => t.id === tier)
        if (!tierEntry)
            return null

        // Update monster stats based on tier and rarity, for now just scale
        // the values
        unit.stats.map(e => {
            let statEntry = StatUtil.getStatTableEntry(e.id)
            if ((statEntry.flags & StatFlag.BASE) !== 0) {
                let statBonus = e.value *
                    (Math.pow(level, 1.125) *
                    (1+tierEntry.stat_counts[0]*0.25) *
                    (1+rarity*0.25)) / 10

                if (statEntry.id === StatTable.BASE_ATK.id || statEntry.id === StatTable.BASE_MATK.id)
                    statBonus /= 2

                StatUtil.setStat(unit.stats, e.id, Math.round(e.value+statBonus))
            }
        })

        // FIXME move to datatable
        let monsterItems = ({
            [MonsterRarity.COMMON.id]: { min: 1, max: 2},
            [MonsterRarity.MAGIC.id]: { min: 2, max: 3},
            [MonsterRarity.RARE.id]: { min: 3, max: 4},
            [MonsterRarity.UNIQUE.id]: { min: 4, max: 5},
            [MonsterRarity.BOSS.id]: { min: 5, max: 7},
            [MonsterRarity.SUPERBOSS.id]: { min: 6, max: 8},
        })[rarity] || null
        if (!monsterItems)
            return null

        const count = SecureRNG.getRandomInt(monsterRngCtx, monsterItems.min, monsterItems.max)
        let remaining = count

        console.log(`generating ${count} monster items`)

        const monsterTableEntry = MonsterUtil.getMonsterTableEntry(code)
        const weaponFlags = monsterTableEntry.weaponFlags

        // FIXME|TODO decide if a monster can equip an item regardless of
        // meeting the items stat requirements, or alternatively implement code
        // to provide additional requirement filters, currently, they are
        // filtered but low monster can spawn without enough stats, perhaps
        // a fallback starter item could be used in that case

        let itemRngCtx = this.game.secureRng.getContext('item')
        let items = []

        // TODO|FIXME account for newly added monster types ie. check against
        // WeaponFlags.*_UNARMED

        // First, generate a primary weapon
        let choices = MonsterUtil.getMonsterWeaponChoices(code, true)
        let choice = this.game.item.getRandomItemTableEntry(choices)
        let primaryChoice = choice

        let item = ItemUtil.generate(itemRngCtx,
            choice.code, choice.item_class, choice.item_sub_class, tier, ItemRarity.COMMON.id
        )
        if (!item) {
            console.log('unable to generate item for monster')
            process.exit(1)
            return null
        }
        items.push(item)
        remaining--

        // Additional items are randomly chosen from the remaining item types
        // FIXME, generate random array of indices into the combined remaining
        // choices array or shuffle the array to prevent multiple choices of the
        // same item subclass from being selected
        let secondarySelected = false
        for (let i = 0; i < remaining; i++) {

            let magic = SecureRNG.getRandomInt(monsterRngCtx, 0, remaining)
            if (magic === remaining && !secondarySelected) {
                // generate a second weapon if the monster can dual wield and the
                // primary weapon is not two-handed or, generate a shield, quiver or
                // spellbook for casters based upon the first items type

                choice = this.getSecondaryWeaponChoice(monsterRngCtx, code, primaryChoice)
                if (!choice) {
                    console.log('unable to get item choice generating monster')
                    process.exit(1)
                    return null
                }
                secondarySelected = true
            } else {
                // remaining armor choices
                choices = ItemUtil.getItemSubClassEntries(ItemClass.ARMOR, [
                    ArmorClass.BOOTS, ArmorClass.GLOVES,
                    ArmorClass.HELMET, ArmorClass.BODY_ARMOR
                ])
                choices = choices.concat(ItemUtil.getItemClassEntries([ItemClass.JEWEL]))
                choice = this.game.item.getRandomItemTableEntry(choices)
            }

            item = ItemUtil.generate(itemRngCtx, choice.code,
                choice.item_class, choice.item_sub_class, tier, ItemRarity.COMMON.id
            )
            if (!item) {
                console.log('failed generating item for monster', choice)
                process.exit(1)
                return null
            }
            items.push(item)

            //console.log('additional', i, choice)
        }

        //console.log('items', items)

        // okay the monster and items are generated, pass them back back
        // to the caller for saving in the database
        return { unit, items }
    }
}

module.exports = { MonsterUtil }
