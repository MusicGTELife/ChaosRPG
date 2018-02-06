const { StatResolver } = require('../statresolver')
const { StatModifier } = require('../statmodifier')
const { StatTable } = require('../stattable')

class StatUtil {
    static createDescriptor(id, value) {
        return { id, value }
    }

    static getStatTableEntry(id) {
        return Object.values(StatTable).find(e => e.id === id)
    }

    static applyOverrides(stats, overrides) {
        overrides.map(stat => {
            let base = stats.find(s => s.id === stat.id)
            if (base) {
                //console.log(`applying override ${base.id} ${base.value} => ${stat.value}`)
                base.value = stat.value
            } else {
                console.log('adding new stat in apply')
                stats.push({ id: stat.id, value: stat.value })
            }
        })
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
        const value = stats.reduce((v, stat) =>
            stat.id === id ? v+stat.value : v
        , 0)

        return { id, value }
    }

    static setStat(stats, id, value) {
        if (!stats)
            return false

        let isModified = false
        stats.map(e => {
            if (e.id === id) {
                e.value = value
                isModified = true
            }
        })

        return isModified
    }

    static getModifiers() {
        let mods = Object.values(StatModifier)//.map(e => e)
        //console.log(mods)
        return mods
    }

    static getModifier(id) {
        const mods = StatUtil.getModifiers()
        return mods.find(m => m.id === id)
    }

    // TODO support either a single stat list or an array of stat lists
    static resolve(stats, mods) {
        if (!stats || !mods)
            return []

        let resolvedStats = []
        mods.map(e => {
            let inputs = e.inputs.map(i => ({
                id: i,
                value: StatUtil.getStat(stats, i).value*e.value
            }))

            let outputs = e.outputs.map(i => StatUtil.getStat(stats, i))

            //console.log(`inputs ${JSON.stringify(inputs)} inputs end`)
            //console.log(`outputs ${JSON.stringify(outputs)} outputs end`)

            let resolved = []
            inputs.map(i => {
                outputs.map(o => {
                    resolved.push(e.operation(o, i.value))
                })
            })

            resolvedStats = resolvedStats.concat(resolved)
        })

        return resolvedStats
    }
}

module.exports = { StatUtil }
