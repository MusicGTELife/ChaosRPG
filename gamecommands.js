const { Command } = require('./util/discord')

const cc = Command.createHandler

const Commands = { }
// Administrative command
Commands.GUILD = cc('guild', 0, 4, true, null, null, null, null)

// User commands
Commands.CREATE_PLAYER = cc('create', 0, 1, false, null, null, null)
Commands.DELETE_PLAYER = cc('delete', 0, 0, false, null, null, null)
Commands.PLAYER_INFO = cc('player', 0, 2, false, null, null, null)
Commands.EQUIPMENT = cc('gear', 0, 0, false, null, null, null)
Commands.EQUIP_ITEM = cc('equip', 0, 2, false, null, null, null)
Commands.DROP_ITEM = cc('drop', 0, 1, false, null, null, null)

module.exports = { Commands }
