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
const { Markdown } = require('./util/discord')
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
        this.markdown = new Markdown()
        this.gameDb = new GameDb(config.db.host, config.db.options)

        this.item = new ItemUtil(this)
        this.unit = new UnitUtil(this)
        this.player = new PlayerUtil(this)
        //this.monster = new MonsterUtil(this)

        this.token = config.token || ''
        this.interrupt = false
    }

    onInterrupt() {
        this.interrupt = true
    }

    async destroy() {
        let res = await this.discord.destroy()
            .then(async () => await this.gameDb.disconnect())

        process.exit(0)
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
            this.onInterrupt()
        })

        this.discord.on('error', e => { this.onError(e) })
        this.discord.on('warn', e => { this.onWarning(e) })
        this.discord.on('debug', e => { this.onDebug(e) })

        this.discord.on('ready', () => { this.onReady() })
        this.discord.on('disconnect', reason => { this.onDisconnect(reason) })
        this.discord.on('message', message => { this.onMessage(message) })
        this.discord.on('typingStart', (channel, user) => { this.onTypingStart(channel, user) })

        console.log('logging in to discord')
        let res = await this.discord.login(this.token)
            .then(async () => await this.gameDb.connect())
            .then(async () => await this.run())
            .catch(e => {
                console.log('caught', e)
                return false
            })

        return res
    }

    syncinit() {
        return this.init()
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
        console.log('I am ready!')
        this.discord.user.setActivity('ChaosRPG', { type: 'PLAYING' })
    }

    onMessage(message) {
        console.log(message.content)
    }

    onTypingStart(channel, user) {
        console.log(`${user.id} typing on ${channel.id}`)
    }

    async createPlayerInventoryEmbed(unit, items, color) {
        let embed = new Discord.RichEmbed()
            .setColor(3447003).setDescription('**Character Inventory**')

        let slot = 0
        items.map(e => {
            let item = e
            let name = ItemUtil.getName(item.code)
            let desc = this.markdown.code("Foo: 15\nBar: 15\nBaz: some text", "prolog")

            embed.addField(
                `*Slot ${++slot}* **\`${name}\`**`,
                `**${desc}**`
            , true)
        })

        console.log(embed)
        //this.discord.channels.get('405592756908589056').send(embed)
    }

    async loop(obj) {
        let onlinePlayers = [ 1, 2, 4, 5, 6, 7, 8, 9, 10 ]

        let player = await obj.gameDb.getUnit(0xbeef)
        if (!player)
            console.log('unable to lookup player')

        //let weapon = Item.createDescriptor(ItemClass.WEAPON)
        //let armor = Item.createDescriptor(ItemClass.ARMOR)
        //let jewel = Item.createDescriptor(ItemClass.JEWEL)

        let magic = RNG.getRandomInt(0, FightType.SUPERBOSS.id)
        let fightType = obj.getFightType(magic)

        let items = await obj.player.getEquippedItems(player)

        await obj.player.computeBaseStats(player)

        //this.discord.channels.get('403320283261304835').send(`\`\`\`json\n[\n\{ 'player': ${JSON.stringify(player)},\n'playerItems': ${JSON.stringify(items)} }\n]\n\`\`\``)
    }

    async run() {
        let code = ItemTable.GREAT_HELM.code

        let itemObj = ItemUtil.generate(code, ItemClass.ARMOR, Tier.TIER2.id, ItemRarity.COMMON.id)
        itemObj.id = 0x1337
        itemObj.owner = 0xbeef
        itemObj.is_equipped = true
        let item = await this.gameDb.createItem(itemObj)
        if (!item) {
            console.log(`failed creating test item id ${itemObj.id}`)
        }

        itemObj = ItemUtil.generate(code, ItemClass.ARMOR, Tier.TIER4.id, ItemRarity.COMMON.id)
        itemObj.id = 0x1337+1
        itemObj.owner = 0xbeef
        itemObj.is_equipped = true
        item = await this.gameDb.createItem(itemObj)
        if (!item) {
            console.log(`failed creating test item id ${itemObj.id}`)
        }

        itemObj = ItemUtil.generate(code, ItemClass.ARMOR, Tier.TIER4.id, ItemRarity.COMMON.id)
        itemObj.id = 0x1337+2
        itemObj.owner = 0xbeef
        itemObj.is_equipped = true
        item = await this.gameDb.createItem(itemObj)
        if (!item) {
            console.log(`failed creating test item id ${itemObj.id}`)
        }

        // generate test player
        console.log('creating player')
        let playerObj = PlayerUtil.create(PlayerType.MAGE.id)
        playerObj.equipment[0] = 0x1337
        playerObj.equipment[1] = 0x1337+1
        playerObj.equipment[2] = 0x1337+2
        playerObj.id = 0xbeef

        console.log(`${JSON.stringify(playerObj)}`)

        let player = await this.gameDb.createUnit(playerObj)
        if (player) {
            let items = await this.player.getEquippedItems(player)
            this.createPlayerInventoryEmbed(playerObj, items)

            item = await this.gameDb.getItem(itemObj.id)

            await this.player.unequipItem(player, items, item, 2)
        }

        while (!this.interrupt) {
            await this.sleep(10*1000, loop => { this.loop(this) })
        }

        console.log('run loop terminating')

        await this.destroy()

        console.log('shutdown complete')

        return true
    }
}

const game = new Game(Config)
game.syncinit()
