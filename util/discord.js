class Markdown {
    bold(str) {
        str = `**${str}**`
        return str
    }

    code(str, lang) {
        lang = lang || ''
        str = `\`\`\`${lang}\n${str}\`\`\``
        return str
    }
}

module.exports = { Markdown }
