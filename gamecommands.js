const { Command } = require('./util/discord')

const cc = Command.createHandler

const GameCommands = { }
// Administrative command
GameCommands.GUILD = cc('guild', 0, 4, true, null, null, null, null)

// User commands
GameCommands.CREATE_PLAYER = cc('create', 0, 1, false, null, null, null)
GameCommands.DELETE_PLAYER = cc('delete', 0, 0, false, null, null, null)
GameCommands.PLAYER_INFO = cc('player', 0, 2, false, null, null, null)
GameCommands.EQUIPMENT = cc('gear', 0, 0, false, null, null, null)
GameCommands.EQUIP_ITEM = cc('equip', 0, 2, false, null, null, null)
GameCommands.DROP_ITEM = cc('drop', 0, 1, false, null, null, null)

module.exports = { GameCommands }
