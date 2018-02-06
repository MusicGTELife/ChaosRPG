function createTierEntry(id, name, ilvlMin, ilvlMax, statCounts) {
    return {
        id,
        name,
        ilvl_min: ilvlMin,
        ilvl_max: ilvlMax,
        stat_counts: statCounts
    }
}

const Tier = {}
Tier.TIER1 = createTierEntry(0x01, "Tier 1", 1, 11, [ 0, 0, 0 ])
Tier.TIER2 = createTierEntry(0x02, "Tier 2", 12, 22, [ 0, 0, 1 ])
Tier.TIER3 = createTierEntry(0x03, "Tier 3", 23, 33, [ 0, 0, 2 ])
Tier.TIER4 = createTierEntry(0x04, "Tier 4", 34, 44, [ 0, 0, 3 ])
Tier.TIER5 = createTierEntry(0x05, "Tier 5", 45, 55, [ 0, 0, 4 ])
Tier.TIER6 = createTierEntry(0x06, "Tier 6", 56, 66, [ 0, 0, 5 ])

module.exports = { Tier }
