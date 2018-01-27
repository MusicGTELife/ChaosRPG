const { UnitType, Unit } = require('./unit')

const MonsterSpec = {
    tier_range: [ 0, 10 ],
    level_range: [ 0, 100 ],
    stats: [ ]
}

class Monster extends Unit { }
Monster.descriptor = { }

module.exports = { Monster, MonsterSpec }
