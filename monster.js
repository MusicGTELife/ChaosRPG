const { Unit } = require('./unit')

class Monster extends Unit { }
Monster.descriptor = {
    code: 0
}

module.exports = { Monster }
