const { MonsterTable } = require('./monstertable')

const MonsterSpec = {
    tier_range: [ 0, 10 ],
    level_range: [ 0, 100 ],
    inventory: [ ],
    stats: [ ]
}

class Monster {
    constructor(game) {
        this.game = game
    }

    async generate(level) {
    }

    async getItems(monster) {
        if (monster)
            return monster.items

        return null
    }

    getBaseStats(monster) {
        if (monster)
            return monster.stats

        console.log('no monster')
        return null
    }
}

module.exports = { Monster }
