const { UnitType, Unit } = require('./unit')

const { StatTable } = require('./stattable')

class PlayerType { }
PlayerType.MAGE = { id: 0x01, name: "Mage" }
PlayerType.WARRIOR = { id: 0x02, name: "Warrior" }
PlayerType.ROGUE = { id: 0x03, name: "Rogue" }
PlayerType.RANGER = { id: 0x04, name: "Ranger" }
PlayerType.CLERIC = { id: 0x05, name: "Cleric" }

const baseStatPoints = 20
const statPointsPerLevel = 4

class Player extends Unit { }

Player.descriptor = {
    type: 0,
    account: '',
    last_online_period: 0,
    last_chat_ts: 0
}

class Mage extends Player { }
Mage.stats = [
    { id: StatTable.DEX.id, value: 2 },
    { id: StatTable.INT.id, value: 10 },
    { id: StatTable.STR.id, value: 2 },
    { id: StatTable.VIT.id, value: 6 },
    { id: StatTable.BASE_MATK.id, value: 4 },
    { id: StatTable.BASE_ATK.id, value: 0 }
]

class Warrior extends Player { }
Warrior.stats = [
    { id: StatTable.DEX.id, value: 4 },
    { id: StatTable.INT.id, value: 2 },
    { id: StatTable.STR.id, value: 8 },
    { id: StatTable.VIT.id, value: 6 },
    { id: StatTable.BASE_MATK.id, value: 0 },
    { id: StatTable.BASE_ATK.id, value: 4 }
]

class Rogue extends Player { }
Rogue.stats = [
    { id: StatTable.DEX.id, value: 6 },
    { id: StatTable.INT.id, value: 8 },
    { id: StatTable.STR.id, value: 2 },
    { id: StatTable.VIT.id, value: 4 },
    { id: StatTable.BASE_MATK.id, value: 1 },
    { id: StatTable.BASE_ATK.id, value: 3 }
]

class Ranger extends Player { }
Ranger.stats = [
    { id: StatTable.DEX.id, value: 8 },
    { id: StatTable.INT.id, value: 4 },
    { id: StatTable.STR.id, value: 4 },
    { id: StatTable.VIT.id, value: 4 },
    { id: StatTable.BASE_MATK.id, value: 1 },
    { id: StatTable.BASE_ATK.id, value: 3 }
]

class Cleric extends Player { }
Cleric.stats = [
    { id: StatTable.DEX.id, value: 3 },
    { id: StatTable.INT.id, value: 6 },
    { id: StatTable.STR.id, value: 3 },
    { id: StatTable.VIT.id, value: 8 },
    { id: StatTable.BASE_MATK.id, value: 2 },
    { id: StatTable.BASE_ATK.id, value: 2 }
]

module.exports = { PlayerType, Player, Mage, Warrior, Rogue, Ranger, Cleric }
