const { StatTable } = require('../stattable')

class StatUtil {
    static applyOverrides(stats, overrides) {
        overrides.map(stat => {
            let base = stats.find(base => base.id === stat.id)
            if (base) {
                //console.log(`applying override ${base.id} ${base.value} => ${stat.value}`)
                base.value = stat.value
            } else {
                stats.push(stat.id, stat.value)
            }
        })
    }

    static getStatTableEntry(id) {
        return Object.values(StatTable).find(e => e.id === id)
    }

    static getReducedStats(stats) {
        // reduce into a map with a single summed value per stat id
        let reducedMap = stats.reduce((prev, curr) => {
            prev.set(curr.id, curr.value + (prev.get(curr.id) || 0))
            return prev
        }, new Map())

        return Array.from(reducedMap, ([id, value]) => ({ id, value }))
    }

    static getSortedStats(stats) {
        stats.sort((lhs, rhs) => lhs.id - rhs.id)
    }

    static getStat(stats, id) {
        if (!stats)
            return 0

        return stats.reduce((v, stat) => stat.id === id ? v+stat.value : v, 0)
    }

    static setStat(stats, id, value) {
        if (!stats)
            return false

        let isModified = false
        stats.map((e) => {
            if (e.id === id) {
                e.value = value
                isModified = true
            }
        })

        return isModified
    }

    static createDescriptor(id, value) {
        return { id, value }
    }
}

module.exports = { StatUtil }
