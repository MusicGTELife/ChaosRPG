class Guild {
    static createSettings(
        guild, gameChannel, debugChannel,
        itemRngDesc, monsterRngDesc, combatRngDesc) {

        return {
            guild,
            'game_channel': gameChannel,
            'debug_channel': debugChannel,

            'item_rng_state': itemRngDesc,
            'monster_rng_state': monsterRngDesc,
            'combat_rng_state': combatRngDesc
        }
    }
}

module.exports = { Guild }
