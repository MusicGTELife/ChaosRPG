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
Commands.CREATE = {
    name: "create",
    args_min: 0,
    args_max: 0,
    ctx: null,
    handler: null
}

class DiscordUtil {
    static getCommandEntry(name) {
        return Object.values(Commands).find(c => c.name === name.toLowerCase())
    }

    static setCommandHandler(name, ctx, handler) {
        let command = DiscordUtil.getCommandEntry(name)
        if (command) {
            command.ctx = ctx
            command.handler = handler
        }
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

        return {
            command, args, user: message.author.id, channel: message.channel.id
        }
    }

    static processCommand(command) {
        console.log('processCommand', command)
        if (command && command.command.handler)
            command.command.handler(command)
    }
}

module.exports = { Markdown, DiscordUtil }
