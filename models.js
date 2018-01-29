const mongoose = require('mongoose')
const Schema = mongoose.Schema

const UnitSchema = {
    id: Number,
    type: Number,
    stats: [ { id: Number, value: Number } ],
    equipment: [ Number ],
    descriptor: Schema.Types.Mixed
}

const ItemSchema = {
    id: Number,
    ilvl: Number,
    is_equipped: Boolean,
    owner: Number,
    code: Number,
    item_class: Number,
    tier: Number,
    descriptor: Schema.Types.Mixed,
    stats: [ Schema.Types.Mixed ]
}

// Game models
const Unit = mongoose.model('Unit', UnitSchema)
const Item = mongoose.model('Item', ItemSchema)

module.exports = { Unit, Item }
