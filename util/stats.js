const { StatResolver, StatModifier } = require('../statmodifier')

class StatUtil {
    static applyOverrides(stats, overrides) {
        overrides.map(stat => {
            let base = stats.find(base => base.id === stat.id)
            if (base) {
                console.log(`applying override ${base.id} ${base.value} => ${stat.value}`)
                base.value = stat.value
            } else {
                stats.push(stat.id, stat.flag, stat.value)
            }
        })
    }

    static getReducedStats(stats) {
        // reduce into a map with summed stat values
        let reducedMap = stats.reduce((prev, curr) => {
            prev.set(curr.id, curr.value + (prev.get(curr.id) || 0))
            return prev
        }, new Map())

        let reduced = Array.from(reducedMap, ([id, value]) => ({ id, value }))
        //console.log('reduced', JSON.stringify(reduced))
        return reduced
    }

    static getSortedStats(stats) {
        stats.sort((lhs, rhs) => lhs.id - rhs.id)
    }

    static getStat(stats, id) {
        if (!stats)
            return 0;

        const sum = stats.reduce((value, stat) => {
            if (stat.id === id)
                return value + stat.value
            return value
        }, 0);

        return sum
    }

    static setStat(stats, id, value) {
        if (!stats)
            return

        stats.map((e) => {
            console.log('setting', e, id, value);
            if (e.id === id) {
                console.log('setting');
                e.value = value
            }
        })
    }

    static createDescriptor(id, value) {
        return { id, value }
    }

    static resolveStat(id, value) {
        let modifier = Object.values(StatModifier).find((mod) => mod.id === id)
        if (modifier) {
            let result = StatResolver.resolve(modifier, value)
            console.log(`resolving ${modifier.name_long} ${value} => ${result}`)
            return result
        }

        return 0
    }
}

module.exports = { StatUtil }
