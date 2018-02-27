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
                // console.log(`applying override ${base.id} ${base.value} => ${stat.value}`)
                base.value = stat.value
            } else {
                console.log('adding new stat in apply')
                stats.push({ 'id': stat.id, 'value': stat.value })
            }
        })
    }

    static getReducedStats(stats) {
        // reduce into a map with a single summed value per stat id
        let reducedMap = stats.reduce((prev, curr) => {
            return prev.set(curr.id, curr.value + (prev.has(curr.id) ? prev.get(curr.id) : 0))
        }, new Map())

        return Array.from(reducedMap, ([ id, value ]) => ({ id, value }))
    }

    static getSortedStats(stats) {
        stats.sort((lhs, rhs) => lhs.id - rhs.id)
    }

    static getStat(stats, id) {
        const value = stats.reduce((v, stat) =>
            stat.id === id ? v + stat.value : v, 0)

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
        return Object.values(StatModifier).sort((a, b) => a.id - b.id)
    }

    static getModifier(id) {
        const mods = StatUtil.getModifiers()

        return mods.find(m => m.id === id)
    }

    static resolveModifier(stats, mod) {
        let inputs = mod.inputs.map(i => ({
            'id': i, 'value': StatUtil.getStat(stats, i).value * mod.value
        }))

        let outputs = mod.outputs.map(i => StatUtil.getStat(stats, i))

        // console.log(`inputs ${JSON.stringify(inputs)} inputs end`)
        // console.log(`outputs ${JSON.stringify(outputs)} outputs end`)

        let resolved = []
        inputs.map(i => {
            outputs.map(o => {
                let opRes = mod.operation(o, i.value)
                opRes.value = Math.round(opRes.value)
                resolved.push(opRes)
            })
        })

        return resolved
    }

    // TODO support either a single stat list or an array of stat lists
    static resolve(stats, mods) {
        if (!stats || !mods)
            return []

        let resolvedStats = []
        mods.map(e => {
            let resolved = StatUtil.resolveModifier(stats, e)
            resolvedStats = resolvedStats.concat(resolved)
        })

        if (!resolvedStats.length === 1) {
            console.log(resolvedStats)
            process.exit(1)
        }

        return resolvedStats
    }
}

module.exports = { StatUtil }
