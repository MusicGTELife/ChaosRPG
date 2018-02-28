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
    static createHandler(name, argsMin, argsMax, confirm, ctx, func, onReaction) {
        return {
            name,
            'args_min': argsMin,
            'args_max': argsMax,
            confirm,

            'ctx': ctx,
            'func': func,
            'onReaction': onReaction
        }
    }
}

// TODO|FIXME unify command and tracked command
class CommandHandler {
    constructor(name, ctx, args, func, onReaction, message) {
        this.name = name
        this.ctx = ctx

        this.args = args
        this.func = func || null

        this.onReaction = onReaction || null

        this.message = message || null
    }

    async run() {
        return await this.func()
    }

    static getCommandEntry(name) {
        return Object.values(Commands).find(c => c.name === name.toLowerCase())
    }

    static setHandler(name, ctx, func, onReaction) {
        let command = CommandHandler.getCommandEntry(name)
        command.ctx = ctx
        command.func = func
        command.onReaction = onReaction || null
    }

    static parseCommand(message) {
        if (message.content.charAt(0) !== CommandTrigger)
            return null

        let args = message.content.substring(1).split(/\s* \s*/)
        if (!args.length) {
            console.log('invalid command format')

            return null
        }

        let command = CommandHandler.getCommandEntry(args[0])
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
            command.name, command.ctx, args,
            command.func, command.onReaction, message
        )

        return handler
    }
}

// TODO|FIXME timer cancellation
class TrackedCommand {
    constructor(tracked, command, timeout) {
        this.tracked = tracked
        this.command = command
        this.timeout = timeout

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

module.exports = { Markdown, DiscordUtil, Command, TrackedCommand, CommandHandler }
