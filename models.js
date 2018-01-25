const { Model } = require('mongorito')

// Game models
class Item extends Model {}
class Unit extends Model {}

module.exports = { Item, Unit }
