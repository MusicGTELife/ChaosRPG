const { UnitUtil } = require('./unit')
const { ItemUtil } = require('./item')
const { StatUtil } = require('./stats')

const { SecureRNG } = require('../rng')
const { StatTable, StatFlag } = require('../stattable')
const { UnitType } = require('../unit')

// const { MonsterClass } = require('../monsterclass')
const { MonsterRarity } = require('../monsterrarity')
const { MonsterTable } = require('../monstertable')

const { ItemRarity } = require('../itemrarity')
const { ItemClass, ArmorClass, WeaponClass, WeaponFlags } = require('../itemclass')
const { Tier } = require('../tier')

class MonsterUtil extends UnitUtil {
    static getMonsterTableEntry(code) {
        return Object.values(MonsterTable).find(e => e.code === code)
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

        let weapons = ItemUtil.getItemClassEntries([ ItemClass.WEAPON ])

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

    static getExperienceReward(monster) {
        if (!monster)
            return 0

        if (monster.type !== UnitType.MONSTER.id)
            return 0

        const entry = MonsterUtil.getMonsterTableEntry(monster.descriptor.code)
        let exp = entry.base_experience
        if (monster.level > 1)
            exp = Math.pow(exp * (monster.level - 1), 1.16)

        return Math.floor(exp)
    }

    getSecondaryWeaponChoice(monsterRngCtx, itemRngCtx, monsterCode, primaryChoice) {
        const entry = MonsterUtil.getMonsterTableEntry(monsterCode)
        let choices = MonsterUtil.getMonsterWeaponChoices(entry.code, false)
        let choice = null

        const isRanged = primaryChoice.item_class === ItemClass.WEAPON && primaryChoice.item_sub_class === WeaponClass.RANGED
        const weaponAvailable = choices.length !== 0 && !isRanged

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

            choice = this.game.item.getRandomItemTableEntry(itemRngCtx, choices)
            console.log('monster is dual-wielding', primaryChoice, choices, choice)
        } else {
            // generate a shield, quiver or a spell book for the second hand
            let choiceTypes = []

            if (primaryChoice.item_sub_class === WeaponClass.MELEE_1H)
                choiceTypes.push(ArmorClass.SHIELD)
            else if (primaryChoice.item_sub_class === WeaponClass.CASTING_1H)
                choiceTypes.push(ArmorClass.SPELLBOOK)
            else if (primaryChoice.item_sub_class === WeaponClass.RANGED)
                choiceTypes.push(ArmorClass.QUIVER)

            choices = ItemUtil.getItemSubClassEntries(ItemClass.ARMOR, choiceTypes)
            choice = this.game.item.getRandomItemTableEntry(itemRngCtx, choices)
            console.log('monster gets shield type', choices, choice)
        }

        if (!choice) {
            console.log('unable to get item choice generating monster')
            process.exit(1)

            return null
        }

        return choice
    }

    static monsterRarityToItemRarity(monsterRarity) {
        const itemRarity = ({
            [MonsterRarity.MAGIC.id]: ItemRarity.MAGIC.id,
            [MonsterRarity.RARE.id]: ItemRarity.ENCHANTED.id,
            [MonsterRarity.UNIQUE.id]: ItemRarity.EPIC.id,
            [MonsterRarity.BOSS.id]: ItemRarity.UNIQUE.id,
            [MonsterRarity.SUPERBOSS.id]: ItemRarity.UNIQUE.id
        })[monsterRarity] || ItemRarity.COMMON.id

        return itemRarity
    }

    // Monster generation is fun, we can't have simple idiomatic code all of
    // the time; this is one bad ass fothermucker
    generate(monsterRngCtx, itemRngCtx, code, level, rarity) {
        const tierEntry = Object.values(Tier).find(t => t.level_min <= level && t.level_max >= level)
        if (!tierEntry)
            return null

        let unit = MonsterUtil.create(code, level, tierEntry.id, rarity)
        if (!unit) {
            console.log(`failed to create monster ${code}`)

            return null
        }

        // Update monster stats based on tier and rarity
        unit.stats.map(e => {
            let statEntry = StatUtil.getStatTableEntry(e.id)
            if ((statEntry.flags & StatFlag.BASE) !== 0) {
                if (statEntry.id !== StatTable.BASE_ATK.id && statEntry.id !== StatTable.BASE_MATK.id) {
                    let statBonus = e.value + e.value *
                        (Math.pow(level, 1.11) *
                        (1 + tierEntry.id * 0.25) *
                        (1 + rarity * 0.25)) / 10

                    statBonus = Math.round(statBonus)
                    StatUtil.setStat(unit.stats, e.id, statBonus)
                }
            }
        })

        let items = this.generateMonsterItems(monsterRngCtx, itemRngCtx, code, tierEntry, rarity)
        if (!items) {
            console.log('failed to generate monster items')
            process.exit(1)

            return null
        }

        // okay the monster and items are generated, pass them back back
        // to the caller for saving in the database
        return { unit, items }
    }

    generateMonsterItems(monsterRngCtx, itemRngCtx, code, tierEntry, rarity) {
        // FIXME move to datatable
        let monsterItems = ({
            [MonsterRarity.COMMON.id]: { 'min': 2, 'max': 3 },
            [MonsterRarity.MAGIC.id]: { 'min': 3, 'max': 4 },
            [MonsterRarity.RARE.id]: { 'min': 4, 'max': 5 },
            [MonsterRarity.UNIQUE.id]: { 'min': 5, 'max': 6 },
            [MonsterRarity.BOSS.id]: { 'min': 6, 'max': 7 },
            [MonsterRarity.SUPERBOSS.id]: { 'min': 7, 'max': 8 }
        })[rarity] || null
        if (!monsterItems)
            return null

        const count = SecureRNG.getRandomInt(monsterRngCtx, monsterItems.min, monsterItems.max)
        let remaining = count

        console.log(`generating ${count} monster items`)

        // FIXME|TODO decide if a monster can equip an item regardless of
        // meeting the items stat requirements, or alternatively implement code
        // to provide additional requirement filters, currently, they are
        // filtered but low monster can spawn without enough stats, perhaps
        // a fallback starter item could be used in that case

        // TODO|FIXME account for newly added monster types ie. check against
        // WeaponFlags.*_UNARMED
        let items = []

        // First, generate a primary weapon
        let choices = MonsterUtil.getMonsterWeaponChoices(code, true)
        if (!choices) {
            console.log('unable to get primary weapon choices', code)

            return null
        }

        let choice = this.game.item.getRandomItemTableEntry(itemRngCtx, choices)
        if (!choice) {
            console.log('unable to get primary weapon choice entry', code)

            return null
        }

        const primaryChoice = choice

        let itemTier = tierEntry.id
        if (itemTier > Tier.TIER1.id)
            itemTier = SecureRNG.getRandomInt(itemRngCtx, Tier.TIER1.id, itemTier)

        let itemRarity = MonsterUtil.monsterRarityToItemRarity(rarity)
        if (itemRarity > ItemRarity.COMMON.id)
            itemRarity = SecureRNG.getRandomInt(monsterRngCtx, ItemRarity.COMMON.id, itemRarity)

        let item = ItemUtil.generate(itemRngCtx,
            choice.code, choice.item_class, choice.item_sub_class, itemTier, itemRarity
        )
        if (!item) {
            console.log('unable to generate item for monster')
            process.exit(1)

            return null
        }
        items.push(item)
        remaining--

        const isTwoHanded =
            (primaryChoice.item_class === ItemClass.WEAPON && primaryChoice.item_sub_class === WeaponClass.MELEE_2H) ||
            (primaryChoice.item_class === ItemClass.WEAPON && primaryChoice.item_sub_class === WeaponClass.CASTING_2H)

        // Additional items are randomly chosen from the remaining item types
        // FIXME, generate random array of indices into the combined remaining
        // choices array or shuffle the array to prevent multiple choices of the
        // same item subclass from being selected
        let secondarySelected = false
        for (let i = 0; i < remaining; i++) {
            if (!secondarySelected && !isTwoHanded) {
                // generate a second weapon if the monster can dual wield and the
                // primary weapon is not two-handed or, generate a shield, quiver or
                // spellbook for casters based upon the first items type

                choice = this.getSecondaryWeaponChoice(monsterRngCtx, itemRngCtx, code, primaryChoice)
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
                if (!choices) {
                    console.log('unable to get armor choices')

                    return null
                }
                choices = choices.concat(ItemUtil.getItemClassEntries([ ItemClass.JEWEL ]))
                choice = this.game.item.getRandomItemTableEntry(itemRngCtx, choices)
                if (!choice) {
                    console.log('unable to get armor choice')

                    return null
                }
            }

            itemTier = tierEntry.id
            if (itemTier > Tier.TIER1.id)
                itemTier = SecureRNG.getRandomInt(itemRngCtx, Tier.TIER1.id, itemTier)

            itemRarity = MonsterUtil.monsterRarityToItemRarity(rarity)
            if (itemRarity > ItemRarity.COMMON.id)
                itemRarity = SecureRNG.getRandomInt(monsterRngCtx, ItemRarity.COMMON.id, itemRarity)

            item = ItemUtil.generate(itemRngCtx, choice.code,
                choice.item_class, choice.item_sub_class, itemTier, itemRarity
            )
            if (!item) {
                console.log('failed generating item for monster', choice)
                process.exit(1)

                return null
            }
            items.push(item)

            // console.log('additional', i, choice)
        }

        // console.log('items', items)

        return items
    }
}

module.exports = { MonsterUtil }
