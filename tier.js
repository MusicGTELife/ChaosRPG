function createEntry(id, name, ilvlMin, ilvlMax, statCount) {
    return {
        id,
        name,
        ilvl_min: ilvlMin,
        ilvl_max: ilvlMax,
        stat_count: statCount
    }
}

const Tier = {}
Tier.TIER1 = createEntry(0x01, "Tier 1", 1, 11, 0)
Tier.TIER2 = createEntry(0x02, "Tier 2", 12, 22, 1)
Tier.TIER3 = createEntry(0x03, "Tier 3", 23, 33, 2)
Tier.TIER4 = createEntry(0x04, "Tier 4", 34, 44, 3)
Tier.TIER5 = createEntry(0x05, "Tier 5", 45, 55, 4)
Tier.TIER6 = createEntry(0x06, "Tier 6", 56, 66, 5)

module.exports = { Tier }
