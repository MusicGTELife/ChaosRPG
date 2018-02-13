const mongoose = require('mongoose')
const Schema = mongoose.Schema

// Game schemas
const SettingsSchema = {
    next_unit_id: Number,
    next_item_id: Number,

    // SecureRNG
    base_rng_secret: String,
    base_rng_hmac: String,
    base_rng_counter: Number,

    player_hmac: String,
    plater_counter: Number,

    monster_hmac: String,
    monster_counter: Number,

    item_hmac: String,
    item_counter: Number,
}

const ActiveUsers = new Schema({
    recent: [ Number ]
})

const StorageSchema = new Schema({
    id: Number,
    size: Number,
    buffer: [ Number ]
}, { _id: false })

const UnitSchema = {
    id: Number,
    type: Number,
    level: Number,
    name: String,
    storage: [ StorageSchema ],
    stats: [ { _id: false, id: Number, value: Number } ],
    descriptor: Schema.Types.Mixed
}

const ItemSchema = {
    id: Number,
    ilvl: Number,
    owner: Number,
    code: Number,
    storage_flag: Number,
    item_class: Number,
    tier: Number,
    stats: [ { _id: false, id: Number, value: Number } ],
    descriptor: Schema.Types.Mixed
}

// Game models
const Settings = mongoose.model('Settings', SettingsSchema)

const Unit = mongoose.model('Unit', UnitSchema)
const Item = mongoose.model('Item', ItemSchema)

module.exports = { Settings, Unit, Item }
