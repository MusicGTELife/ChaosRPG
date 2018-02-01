const mongoose = require('mongoose')
const Schema = mongoose.Schema

const SettingsSchema = {
    next_unit_id: Number,
    next_item_id: Number
}

const StorageSchema = new Schema({
    id: Number,
    size: Number,
    buffer: [ Number ]
}, { _id: false })

const UnitSchema = {
    id: Number,
    type: Number,
    storage: [ StorageSchema ],
    stats: [ { _id: false, id: Number, value: Number} ],
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
    stats: [ { _id: false, id: Number, value: Number} ],
    descriptor: Schema.Types.Mixed
}

// Game models
const Settings = mongoose.model('Settings', SettingsSchema)
const Unit = mongoose.model('Unit', UnitSchema)
const Item = mongoose.model('Item', ItemSchema)

module.exports = { Settings, Unit, Item }
