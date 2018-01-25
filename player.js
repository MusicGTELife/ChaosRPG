const { UnitType } = require('./unit')
const { UnitUtil } = require('./util/unit')

const { StatTable } = require('./stattable')

class PlayerType { }
PlayerType.MAGE = { id: 0x01, name: "Mage" }
PlayerType.WARRIOR = { id: 0x02, name: "Warrior" }
PlayerType.ROGUE = { id: 0x03, name: "Rogue" }
PlayerType.RANGER = { id: 0x04, name: "Ranger" }
PlayerType.CLERIC = { id:  0x05, name: "Cleric" }

const basePoints = 20
const pointsPerLevel = 4

class Player { }
Player.stats = [
    { id: StatTable.UNIT_EXP.id, value: 0 }
]

class Mage extends Player { }
Mage.stats = [
    { id: StatTable.DEX.id, value: 2 },
    { id: StatTable.INT.id, value: 8 },
    { id: StatTable.STR.id, value: 2 },
    { id: StatTable.VIT.id, value: 8 },
]

class Warrior extends Player { }
Warrior.stats = [
    { id: StatTable.DEX.id, value: 4 },
    { id: StatTable.INT.id, value: 2 },
    { id: StatTable.STR.id, value: 10 },
    { id: StatTable.VIT.id, value: 4 }
]

class Rogue extends Player { }
Rogue.stats = [
    { id: StatTable.DEX.id, value: 8 },
    { id: StatTable.INT.id, value: 8 },
    { id: StatTable.STR.id, value: 2 },
    { id: StatTable.VIT.id, value: 2 }
]

class Ranger extends Player { }
Ranger.stats = [
    { id: StatTable.DEX.id, value: 8 },
    { id: StatTable.INT.id, value: 4 },
    { id: StatTable.STR.id, value: 4 },
    { id: StatTable.VIT.id, value: 4 }
]

class Cleric extends Player { }
Cleric.stats = [
    { id: StatTable.DEX.id, value: 2 },
    { id: StatTable.INT.id, value: 6 },
    { id: StatTable.STR.id, value: 2 },
    { id: StatTable.VIT.id, value: 10 }
]

module.exports = { Player, Mage, Warrior, Rogue, Ranger, Cleric }
