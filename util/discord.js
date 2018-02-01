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

const Command = { }
Command.trigger = '!'

const Commands = { }
Commands.CREATE_PLAYER = {
    name: "create",
    args_min: 1,
    args_max: 1,
    confirm: false,
    func: null,
    ctx: null
}
Commands.DELETE_PLAYER = {
    name: "delete",
    args_min: 1,
    args_max: 1,
    func: null,
    ctx: null
}

class CommandHandler {
    constructor(name, ctx, func, args, channel, user) {
        this.name = name
        this.ctx = ctx
        this.func = func
        this.args = args
        this.channel = channel
        this.user = user
    }

    async run() {
        return await this.func()
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

        let args = message.content.substring(1).split(' ')
        if (!args.length)
            return null

        let command = DiscordUtil.getCommandEntry(args[0])
        if (!command)
            return null

        if (args.length)
            args.shift()

        let handler = new CommandHandler(
            command.name, command.ctx, command.func, args, message.channel.id, message.author.id
        )

        return handler
    }

    static processCommand(command) {
        console.log('processCommand', command)
        if (command && command.func)
            command.func()
    }
}

module.exports = { Markdown, DiscordUtil }
