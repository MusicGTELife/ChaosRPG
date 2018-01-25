const StatResolver = { }

StatResolver.add = (a, b) => a+b
StatResolver.sub = (a, b) => a-b
StatResolver.mult = (a, b) => a*b
StatResolver.addPercent = (a, b) => a+a*b
StatResolver.subPercent = (a, b) => a-a*b

StatResolver.resolve = (mod, ...args) => {
    return mod.resolver(mod.value, ...args)
}

function createEntry(id, nameShort, nameLong, resolver, value) {
    return {
        id,
        name_short: nameShort,
        name_long: nameLong,
        resolver,
        value
    }
}

const StatModifier = { }
const _ = createEntry

StatModifier.ATK_PER_STR =
    _(0x0110, "AtkPerStr", "Attack rating per strength", StatResolver.mult, 2)
StatModifier.DEF_PER_DEX =
    _(0x0111, "DefPerDex", "Defense per dexterity", StatResolver.mult, 2)
StatModifier.HP_PER_VIT =
    _(0x0112, "HPPerVit", "Hit points per vitality ", StatResolver.mult, 2)
StatModifier.MP_PER_INT =
    _(0x0113, "MPPerInt", "Mana points per intelligence", StatResolver.mult, 2)

module.exports = { StatResolver, StatModifier }
