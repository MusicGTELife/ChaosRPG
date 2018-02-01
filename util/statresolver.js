const { StatUtil } = require('./stats')

const StatResolver = { }

//StatResolver.add = (id, inputs, outputs, stats, value) => {
//}

StatResolver.sub = (id, inputs, outputs, stats, value) => {
}

StatResolver.mult = (id, inputs, outputs, stats, value) => {
}

StatResolver.addPercent = (id, inputs, outputs, stats, value) => {
}

StatResolver.subPercent = (id, inputs, outputs, stats, value) => {
}

StatResolver.add = (id, inputs, outputs, baseStats, itemStats, value) => {
    let list = []
    inputs.map(i => {
        list.push({
            id: i,
            value: (StatUtil.getStat(baseStats, i) + StatUtil.getStat(itemStats, i)) * value
        })
    })

    let out = []
    outputs.map(o => {
        list.map(l => {
            out.push({
                id: o,
                value: StatUtil.getStat(baseStats, o) + StatUtil.getStat(itemStats, o)+l.value
            })
        })
    })

    return out
}

StatResolver.resolve = function (mod, baseStats, itemStats, v) {
    return mod.resolver(mod.id, mod.inputs, mod.outputs, baseStats, itemStats, v)
}

/*
static resolveStat(id, value) {
    let modifier = Object.values(StatModifier).find((mod) => mod.id === id)
    if (modifier) {
        let entry = Object.values(StatTable).find(e => e.id === statId)
        let result = StatResolver.resolve(modifier.id, statId, ...value)
        console.log(`resolving ${modifier.name} ${entry.name_long} ${JSON.stringify(value)} => ${JSON.stringify(result)}`)
        return result
    }

    return 0
}
*/

module.exports = { StatResolver }
