const mongoose = require('mongoose')
const Schema = mongoose.Schema

// Game schemas
const GuildSettingsSchema = new Schema({
    guild: String,
    game_channel: String,
    debug_channel: String,

    // SecureRNG
    base_rng_secret: String,
    base_rng_counter: Number,

    active_players: [ Number ]
})

const SettingsSchema = new Schema({
    // unique id's shared across all guilds
    next_account_id: Number,
    next_unit_id: Number,
    next_item_id: Number,

    guilds: [ String ]
})

const AccountSchema = new Schema({
    id: Number,
    guild: String,
    name: String
})

const StorageSchema = new Schema({
    id: Number,
    size: Number,
    buffer: [ Number ]
},
    { _id: false }
)

const StatSchema = new Schema({
    id: Number,
    value: Number,
},
    { _id: false }
)

const UnitSchema = new Schema({
    id: Number,
    type: Number,
    level: Number,
    name: String,
    storage: [ StorageSchema ],
    stats: [ StatSchema ],
    descriptor: Schema.Types.Mixed
})

const ItemSchema = new Schema({
    id: Number,
    ilvl: Number,
    owner: Number,
    code: Number,
    storage_flag: Number,
    item_class: Number,
    item_sub_class: Number,
    tier: Number,
    rarity: Number,
    stats: [ StatSchema ],
    descriptor: Schema.Types.Mixed
})

// Game models
const Account = mongoose.model('Account', AccountSchema)

const Settings = mongoose.model('Settings', SettingsSchema)
const GuildSettings = mongoose.model('GuildSettings', GuildSettingsSchema)

const Unit = mongoose.model('Unit', UnitSchema)
const Item = mongoose.model('Item', ItemSchema)

module.exports = { Account, Settings, GuildSettings, Unit, Item }
