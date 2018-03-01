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

const CommandTrigger = '.'

class Command {
    constructor(name, commandHandler, ctx, args, message, timeout) {
        this.name = name
        this.commandHandler = commandHandler
        this.ctx = ctx
        this.args = args
        this.message = message
        this.response = null

        this.timeout = timeout
        this.timer = null
        if (this.timeout > 0)
            this.timer = setTimeout(() => { this.deleter() }, timeout)
    }

    deleter() {
        if (this.response) {
            // console.log('response deleted', this.response.id)
            this.commandHandler.trackedCommands.delete(this.response.id)
            this.response.delete()
            this.response = null
        }
    }

    refresh() {
        if (this.timeout <= 0)
            return

        if (this.timer)
            clearTimeout(this.timer)

        this.timer = setTimeout(() => { this.deleter() }, this.timeout)
        // console.log('timer refreshed')
    }
}

class CommandHandler {
    constructor(game, handlers) {
        this.game = game
        this.handlers = new Map()
        this.trackedCommands = new Map()

        Object.values(handlers).map(h => {
            let handler = CommandHandler.createHandler(
                h.name, h.argsMin, h.argsMax, h.confirm, this.game, h.Command, h.timeout
            )
            if (handler)
                this.handlers.set(h.name, handler)
        })
    }

    static createHandler(name, argsMin, argsMax, confirm, ctx, command, timeout) {
        return {
            name, argsMin, argsMax, confirm,
            ctx, 'Command': command, timeout
        }
    }

    getHandler(name) {
        return this.handlers.get(name)
    }

    setHandler(name, handler) {
        return this.handlers.set(name, handler)
    }

    parseCommand(message) {
        if (message.content.charAt(0) !== CommandTrigger)
            return null

        let args = message.content.substring(1).split(/\s* \s*/)
        if (!args.length) {
            console.log('invalid command format')

            return null
        }

        let handler = this.getHandler(args[0])
        if (!handler) {
            console.log('unable to parse as command', args[0])

            return null
        }

        // get rid of the command name leaving only arguments
        if (args.length)
            args.shift()

        if (args.length > handler.argsMax || args.length < handler.argsMin) {
            console.log('invalid number of args', handler)

            return null
        }

        let command = new handler.Command(
            this, this.game, args, message, handler.timeout
        )
        console.log(command)

        return command
    }
}

class DiscordUtil {
    static isValidChannelName(name) {
        console.log('isValidChannelName', name)
        if (name === '')
            return false

        return name.match(/(<?#?(\d+)>?)/, '$2') !== null
    }

    static guildHasChannel(guild, name) {
        if (!DiscordUtil.isValidChannelName(name))
            return null

        let replaced = name
        let channelId = replaced.replace(/(<?#?(\d+)>?)/, '$2')
        let channel = guild.channels.get(channelId)
        if (!channel)
            channel = guild.channels.find('name', name)

        return channel
    }
}

module.exports = { Markdown, DiscordUtil, CommandHandler, Command }
