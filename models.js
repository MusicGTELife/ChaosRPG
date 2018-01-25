const { Model } = require('mongorito')

// Game models
class Item extends Model {}
class Unit extend Model {}
class Player extends Model {}
class Monster extends Model {}

module.exports = { Item, Unit, Player, Monster }
