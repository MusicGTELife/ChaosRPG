class Markdown {
    static bold(str) {
        return `**${str}**`
    }

    static code(str, lang) {
        return `\`\`\`${lang || ''}\n${str}\`\`\``
    }
}

Markdown.b = Markdown.bold
Markdown.c = Markdown.code

function createCommand(name, argsMin, argsMax, confirm) {
    return {
        name,
        args_min: argsMin,
        args_max: argsMax,
        confirm,
        func: null,
        ctx: null
    }
}

const Command = { }
Command.trigger = '.'

const C = createCommand

const Commands = { }
// Administrative command
Commands.GUILD = C("guild", 0, 4, true, null, null)

// User commands
Commands.CREATE_PLAYER = C("create", 0, 1, false, null, null)
Commands.DELETE_PLAYER = C("delete", 0, 0, false, null, null)
Commands.PLAYER_INFO = C("player", 0, 2, false, null, null)
Commands.EQUIPMENT = C("gear", 0, 0, false, null, null)
Commands.EQUIP = C("equip", 0, 2, false, null, null)

class CommandHandler {
    constructor(name, ctx, func, args, message) {
        this.name = name
        this.ctx = ctx
        this.func = func
        this.args = args
        this.message = message
    }

    async run() {
        return await this.func()
    }
}

// TODO|FIXME timer cancellation
class TrackedCommand {
    constructor(tracked, command, timeout) {
        this.tracked = tracked
        this.command = command
        this.timeout = timeout
        this.response = null

        this.timer = setTimeout(() => { this.deleter() }, timeout)
    }

    deleter() {
        console.log('timer expired')
        if (this.command.response) {
            this.tracked.delete(this.command.response.id)
            this.command.response.delete()
            console.log('response deleted')
        }
    }

    refresh(timeout) {
        this.timeout = timeout
        clearTimeout(this.timer)
        this.timer = setTimeout(() => { this.deleter() }, timeout)
        console.log('timer refreshed')
    }
}

class DiscordUtil {
    static getCommandEntry(name) {
        return Object.values(Commands).find(c => c.name === name.toLowerCase())
    }

    static setCommandHandler(name, ctx, func) {
        let command = DiscordUtil.getCommandEntry(name)
        command.ctx = ctx
        command.func = func
    }

    static parseCommand(message) {
        if (message.content.charAt(0) !== Command.trigger)
            return null

        let args = message.content.substring(1).split(/\s* \s*/)
        if (!args.length) {
            console.log('invalid command format')
            return null
        }

        let command = DiscordUtil.getCommandEntry(args[0])
        if (!command) {
            console.log('unable to parse as command', args[0])
            return null
        }

        // get rid of the command name leaving only arguments
        if (args.length)
            args.shift()

        if (args.length > command.args_max || args.length < command.args_min) {
            console.log('invalid number of args', command)
            return null
        }

        let handler = new CommandHandler(
            command.name, command.ctx, command.func, args, message
        )

        return handler
    }

    static async processCommand(command) {
        //console.log('processCommand', command)
        if (command && command.func)
            await command.func()
    }

    static isValidChannelName(name) {
        if (name === '')
            return false
        return channel.match(/(<?#?(\d+)>?)/, '$2') !== null
    }

    static guildHasChannel(name) {
        if (!DiscordUtil.isValidChannel(gameChannel))
            return false

        let channelId = name.replace(/(<?#?(\d+)>?)/, '$2')
        let channel = guild.channels.get(channelId)

        if (!channel)
            channel  = guild.channels.find('name', name)

        return !!channel
    }
}

module.exports = { Markdown, DiscordUtil, Command, TrackedCommand }
