const StatResolver = { }

StatResolver.mult = function (stat, value) {
    stat.value *= value
    
    return stat
}

StatResolver.add = function (stat, value) {
    stat.value += value

    return stat
}

module.exports = { StatResolver }
