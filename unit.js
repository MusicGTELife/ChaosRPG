const { PlayerBase } = require('./player')
const { MonsterBase } = require('./monster')

const UnitType = { }
UnitType.PLAYER = { id: 0x01, name: "Hero" }
UnitType.MONSTER = { id: 0x02, name: "Monster" }

class UnitBase {
    static createBaseDescriptor(type) {
        let descriptor = ({
            [UnitType.PLAYER.id]: PlayerBase,
            [UnitType.MONSTER.id]: MonsterBase
        })[type] || []

        return {
            id: 0,
            type: 0,
            stats: descriptor.stats,
            descriptor
        }
    }
}

module.exports = { UnitBase, UnitType }
