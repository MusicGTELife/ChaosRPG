const Config = require('./config.json')

const Discord = require('discord.js')

const RNG = require('./rng')
const { GameDb } = require('./db')

const { StatTable } = require('./stattable')

const { Tier, TierStatCount } = require('./tier')

const { ItemClass } = require('./itemclass')
const { ItemRarity } = require('./itemrarity')
const { ItemTable } = require('./itemtable')

const { UnitType } = require('./unit')
const { PlayerType, Player, Mage, Warrior, Rogue } = require('./player')
const { Monster, MonsterType } = require('./monster')

// utility classes
const { Markdown, DiscordUtil } = require('./util/discord')
const { ItemUtil } = require('./util/item')
const { StatUtil } = require('./util/stats')
const { UnitUtil } = require('./util/unit')
const { PlayerUtil } = require('./util/player')
//const { MonsterUtil } = require('./util/monster')

const FightType = { }
FightType.SUPERBOSS = { id: 9999, name: "Super Boss" }
FightType.BOSS = { id: 9900, name: "Boss" }
FightType.UNIQUE = { id: 9500, name: "Unique" }
FightType.RARE = { id: 9000, name: "Rare" }
FightType.MAGIC = { id: 7500, name: "Magic" }
FightType.NORMAL = { id: 0, name: "Common" }

// TODO move base application parts to their own module
class Game {
    constructor(config) {
        this.discord = new Discord.Client()
        this.gameDb = new GameDb(config.db.host, config.db.options)

        this.md = new Markdown()

        this.item = new ItemUtil(this)
        this.unit = new UnitUtil(this)
        this.player = new PlayerUtil(this)
        //this.monster = new MonsterUtil(this)

        this.token = config.token || ''
        this.interrupt = false

        this.syncinit()
    }

    async destroy() {
        let res = await this.discord.destroy()
            .then(await this.gameDb.disconnect())
    }

    async init() {
        console.log('initializing game')

        if (this.token === '') {
            console.log('Discord API token required')
            return false
        }

        // catch terminal interrupts to shutdown cleanly
        process.on('SIGINT', () => {
            console.log('SIGINT caught')
            this.interrupt = true
        })

        this.discord.on('error', e => { this.onError(e) })
        this.discord.on('warn', e => { this.onWarning(e) })
        this.discord.on('debug', e => { this.onDebug(e) })

        this.discord.on('ready', () => { this.onReady() })
        this.discord.on('disconnect', reason => { this.onDisconnect(reason) })
        this.discord.on('message', message => { this.onMessage(message) })
        this.discord.on('typingStart', (channel, user) => { this.onTypingStart(channel, user) })

        DiscordUtil.setCommandHandler('create', this, this.createPlayer)

        console.log('logging in to discord')
        let res = await this.discord.login(this.token)
            .then(await this.gameDb.connect())
            .then(await this.run())
            .catch(e => {
                console.log('caught', e)
                return false
            })

        process.exit(0)
    }

    syncinit() {
        this.init()
    }

    timeout(ms) {
        return new Promise(resolve => this.discord.setTimeout(resolve, ms))
    }

    async sleep(ms, fn, ...args) {
        await this.timeout(ms)
        return fn(...args)
    }

    getFightType(value) {
        if (value >= FightType.SUPERBOSS.id)
            return FightType.SUPERBOSS
        else if (value >= FightType.BOSS.id)
            return FightType.BOSS
        else if (value >= FightType.UNIQUE.id)
            return FightType.UNIQUE
        else if (value >= FightType.RARE.id)
            return FightType.RARE
        else if (value >= FightType.MAGIC.id)
            return FightType.MAGIC

        return FightType.NORMAL
    }

    onError(m) {
        console.error(`ERR: \`${m}\``)
    }

    onWarning(m) {
        console.warn(`WARN: \`${m}\``)
    }

    onDebug(m) {
        console.log(`DEBUG: \`${m}\``)
    }

    onDisconnect(reason) {
        console.log(`DEBUG: disconnected ${reason.reason} (${reason.code})`)
    }

    onReady() {
        console.log('connected to discord')

        this.discord.user.setActivity('ChaosRPG', { type: 'PLAYING' })
    }

    onMessage(message) {
        console.log(message.content)
        let command = DiscordUtil.parseCommand(message)
        if (command) {
            console.log(`processing command ${command.command.name}`)
            DiscordUtil.processCommand(command)
        }
    }

    onTypingStart(channel, user) {
        console.log(`${user.id} typing on ${channel.id}`)
    }

    // discord command handlers
    async createPlayer(command) {
        let ctx = command.command.ctx
        console.log('createPlayer', ctx)

        let typeString = command.args[0].toLowerCase()

        let type = ({
            ['mage']: PlayerType.MAGE.id,
            ['warrior']: PlayerType.MAGE.id,
            ['rogue']: PlayerType.MAGE.id,
            ['ranger']: PlayerType.MAGE.id,
            ['cleric']: PlayerType.MAGE.id
        })[typeString] || 0

        if (!type) {
            console.log(`invalid player type ${type}`)
            ctx.discord.channels.get(command.channel)
                .send(`<@${command.user}> Invalid player class ${typeString}, valid types are: \`Mage, Warrior, Rogue, Ranger, Cleric\``)
            return
        }

        if (await ctx.gameDb.getUnit(command.user)) {
            ctx.discord.channels.get(command.channel)
                .send(`<@${command.user}> You already have a player, use the delete command if you which to create a new player`)
        }
    }

    async createPlayerInventoryEmbed(unit, items, color) {
        let embed = new Discord.RichEmbed()
            .setColor(3447003).setDescription('**Character Inventory**')

        let slot = 0
        items.map(e => {
            let name = ItemUtil.getName(e.code)
            let desc = Markdown.c("Foo: 15\nBar: 15\nBaz: some text", "prolog")

            embed.addField(`*Slot ${++slot}* **\`${name}\`**`, `**${desc}**`, true)
        })

        console.log(embed)
        //this.discord.channels.get('405592756908589056').send(embed)
    }

    async loop() {
        let onlinePlayers = [ 1, 2, 4, 5, 6, 7, 8, 9, 10 ]

        let player = await this.gameDb.getUnit(0xbeef)
        if (!player) {
            console.log('unable to lookup player')
            return
        }

        let items = await this.player.getEquippedItems(player)
        await this.player.computeBaseStats(player, items)

        let magic = RNG.getRandomInt(0, FightType.SUPERBOSS.id)
        let fightType = this.getFightType(magic)

        //this.discord.channels.get('403320283261304835').send(`\`\`\`json\n[\n\{ 'player': ${JSON.stringify(player)},\n'playerItems': ${JSON.stringify(items)} }\n]\n\`\`\``)
    }

    async run() {
        let code = ItemTable.GREAT_HELM.code

        let itemObj = ItemUtil.generate(code, ItemClass.ARMOR, Tier.TIER5.id, ItemRarity.COMMON.id)
        itemObj.id = 0x1337
        itemObj.owner = 0xbeef
        itemObj.is_equipped = true
        let item = await this.gameDb.createItem(itemObj)
        item = await this.gameDb.createItem(itemObj)

        itemObj = ItemUtil.generate(code, ItemClass.ARMOR, Tier.TIER4.id, ItemRarity.COMMON.id)
        itemObj.id = 0x1337+1
        itemObj.owner = 0xbeef
        itemObj.is_equipped = true
        item = await this.gameDb.createItem(itemObj)

        itemObj = ItemUtil.generate(code, ItemClass.ARMOR, Tier.TIER6.id, ItemRarity.COMMON.id)
        itemObj.id = 0x1337+2
        itemObj.owner = 0xbeef
        itemObj.is_equipped = true
        item = await this.gameDb.createItem(itemObj)

        // generate test player
        console.log('creating player')
        let playerObj = PlayerUtil.create(PlayerType.CLERIC.id)
        playerObj.storage[0].buffer[0] = 0x1337
        playerObj.storage[0].buffer[1] = 0x1337+1
        playerObj.storage[0].buffer[2] = 0x1337+2
        playerObj.id = 0xbeef

        let player = await this.gameDb.createUnit(playerObj)
        if (player) {
            console.log(`${JSON.stringify(player)}`)

            item = await this.gameDb.getItem(0x1337)

            let items = await this.unit.getEquippedItems(player)
            this.createPlayerInventoryEmbed(player, items)
        }

        while (!this.interrupt) {
            await this.sleep(5*1000, async loop => { await this.loop() })
        }

        console.log('run loop terminating')

        await this.destroy()

        console.log('shutdown complete')

        return true
    }
}

const game = new Game(Config)
