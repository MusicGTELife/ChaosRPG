class Guild {
    static createSettings(guild, gameChannel, debugChannel, rngSecret, rngCounter) {
        return {
            guild,
            game_channel: gameChannel,
            debug_channel: debugChannel,

            base_rng_secret: rngSecret,
            base_rng_counter: rngCounter,

            active_players: [ ]
        }
    }
}

module.exports = { Guild }
