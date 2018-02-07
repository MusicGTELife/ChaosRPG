const Config = require('./config.json')

const Discord = require('discord.js')

const { SecureRNG, SecureRNGContext } = require('./rng')
const { GameDb } = require('./db')

const { Storage } = require('./storage')
const { StatTable } = require('./stattable')

const { Tier, TierStatCount } = require('./tier')

const { ItemClass, ArmorClass, WeaponClass, JewelClass } = require('./itemclass')
const { ItemRarity } = require('./itemrarity')
const { ItemTable } = require('./itemtable')

const { UnitType } = require('./unit')
const { MonsterTable } = require('./monstertable')
const { PlayerType, Player, Mage, Warrior, Rogue } = require('./player')
const { Monster, MonsterType } = require('./monster')
const { MonsterRarity } = require('./monsterrarity.js')

// utility classes
const { Markdown, DiscordUtil } = require('./util/discord')
const { ItemUtil } = require('./util/item')
const { StatUtil } = require('./util/stats')
const { UnitUtil } = require('./util/unit')
const { PlayerUtil } = require('./util/player')
const { MonsterUtil } = require('./util/monster')

// TODO move base application parts to their own module
class Game {
    constructor(config) {
        this.token = config.token || ''

        this.isLocalTest = config.mode === "test"
        this.isProduction = config.mode === "production"
        if (!this.isLocalTest && !this.isProduction)
            throw new Error('invalid configurtion mode')

        this.discordConnected = false
        this.dbConnected = false


        this.secureRng = new SecureRNG()
        this.discord = new Discord.Client()
        this.md = new Markdown()

        let db = this.isLocalTest ? config.test_db : config.db
        this.gameDb = new GameDb(db.host, db.options)

        this.item = new ItemUtil(this)
        this.unit = new UnitUtil(this)
        this.player = new PlayerUtil(this)
        this.monster = new MonsterUtil(this)

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
        this.discord.on('disconnect', reason => { this.onDiscordDisconnect(reason) })
        this.discord.on('message', message => { this.onMessage(message) })
        this.discord.on('typingStart', (channel, user) => { this.onTypingStart(channel, user) })

        this.gameDb.db.connection.on('connected', () => { this.onDbConnected() })
        this.gameDb.db.connection.on('disconnect', () => { this.onDbDisconnect() })

        DiscordUtil.setCommandHandler('create', this, this.createPlayer)
        DiscordUtil.setCommandHandler('delete', this, this.deletePlayer)

        console.log('logging in to discord')
        let res = await this.discord.login(this.token)
            .catch(e => {
                console.log(e)
            })
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

    onError(m) {
        console.error(`ERR: \`${m}\``)
    }

    onWarning(m) {
        console.warn(`WARN: \`${m}\``)
    }

    onDebug(m) {
        console.log(`DEBUG: \`${m}\``)
    }

    onDiscordDisconnect(reason) {
        this.discordConnected = false
        console.log(`DEBUG: disconnected ${reason.reason} (${reason.code})`)
    }

    onReady() {
        console.log('connected to discord')

        this.discordConnected = true

        this.discord.user.setActivity('ChaosRPG', { type: 'PLAYING' })
    }

    onMessage(message) {
        console.log(message.content)
        let command = DiscordUtil.parseCommand(message)
        if (command) {
            console.log(`processing command ${command.name}`)
            DiscordUtil.processCommand(command)
        }

        if (message.author.id !== this.discord.user.id) {
            const emojiList = message.guild.emojis.map(e=>e.toString()).join(" ")
            //if (emojiList) message.channel.send(emojiList)
        }
    }

    onTypingStart(channel, user) {
        console.log(`${user.id} typing on ${channel.id}`)
    }

    onDbConnected() {
        this.dbConnected = true
    }

    onDbDisconnect() {
        this.dbConnected = false
    }

    // FIXME move this somewhere else
    static getFightMonsterRarity(value) {
        if (value >= MonsterRarity.SUPERBOSS.rarity)
            return MonsterRarity.SUPERBOSS
        else if (value >= MonsterRarity.BOSS.rarity)
            return MonsterRarity.BOSS
        else if (value >= MonsterRarity.UNIQUE.rarity)
            return MonsterRarity.UNIQUE
        else if (value >= MonsterRarity.RARE.rarity)
            return MonsterRarity.RARE
        else if (value >= MonsterRarity.MAGIC.rarity)
            return MonsterRarity.MAGIC

        return MonsterRarity.COMMON
    }

    // discord command handlers

    // lexical this is in the context of CommandHandler
    async createPlayer() {
        console.log('createPlayer')

        let typeString = this.args[0].toLowerCase()

        let type = ({
            ['mage']: PlayerType.MAGE.id,
            ['warrior']: PlayerType.MAGE.id,
            ['rogue']: PlayerType.MAGE.id,
            ['ranger']: PlayerType.MAGE.id,
            ['cleric']: PlayerType.MAGE.id
        })[typeString] || 0

        if (!type) {
            console.log(`invalid player type ${type}`)
            this.ctx.discord.channels.get(this.channel)
                .send(`<@${this.user}> Invalid player class ${typeString}, valid types are: \`Mage, Warrior, Rogue, Ranger, Cleric\``)
            return
        }

        if (await this.ctx.gameDb.getUnitByName(this.user)) {
            this.ctx.discord.channels.get(this.channel)
                .send(`<@${this.user}> You already have a player, use the delete command if you wish to create a new player`)
            return
        }

        let settings = await this.ctx.gameDb.getSettings()
        let player = PlayerUtil.create(type, this.user)
        player.id = settings.next_unit_id++

        player = await this.ctx.gameDb.createUnit(player)
        if (player) {
            settings.save()
            this.ctx.discord.channels.get(this.channel)
                .send(`<@${this.user}> Your ${typeString} character has been created`)
        } else {
            this.ctx.discord.channels.get(this.channel)
                .send(`<@${this.user}> Failed to create your ${typeString} character`)
        }
    }

    // lexical this is in the context of CommandHandler
    async deletePlayer() {
        console.log('deletePlayer')

        let existing = await this.ctx.gameDb.getUnitByName(this.user)
        if (existing) {
            await this.ctx.gameDb.removeUnit(existing)
            this.ctx.discord.channels.get(this.channel)
                .send(`<@${this.user}> Your character has been deleted`)
        } else {
            this.ctx.discord.channels.get(this.channel)
                .send(`<@${this.user}> Unable to delete, no character found`)
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

    async getRecentlyActivePlayer() {
        let activeUsers = await getActiveUsers()
        if (!activeUsers) {
            console.log('unable to get active users')
            return null
        }

        let player = null
        return player
    }

    async getLocalTestPlayer() {
        let onlinePlayers = [ 1, 2, 4, 5, 6, 7, 8, 9, 10 ]

        let player = await this.gameDb.getUnitByAccount('ᛖᛒᛟᛚᚨ')
        if (!player) {
            console.log('unable to lookup player')
            return
        }

        return player
    }

    async loop() {
        if (!this.dbConnected) {
            console.log('not connected to the database, skipping combat');
            return
        }

        if (!this.discordConnected && !this.isLocalTest) {
            console.log('discord is not connected, skipping combat')
            return
        }

        let rngCtx = this.secureRng.getContext('combat')
        if (!rngCtx) {
            console.log('unable to get combat RNG context');
            return
        }

        let monsterRngCtx = this.secureRng.getContext('monster')
        if (!monsterRngCtx) {
            console.log('unable to get monster RNG context')
            return
        }

        // TODO select alternative run loop implementation based on config mode
        let player = null
        if (this.isLocalTest)
            player = await this.getLocalTestPlayer()
        else
            player = await this.getRecentlyActivePlayer()

        if (!player) {
            console.log('unable to find a recently active player, skipping combat')
            return
        }
        //await this.unit.computeBaseStats(player)

        let magic = SecureRNG.getRandomInt(rngCtx, 0, MonsterRarity.SUPERBOSS.rarity)
        let monsterRarity = Game.getFightMonsterRarity(magic)

        // generate a monster
        console.log('creating monster')
        const code = MonsterTable.SKELETON_WARRIOR.code
        let monsterObj = this.monster.generate(monsterRngCtx, code, 2, monsterRarity.id)
        if (!monsterObj) {
            console.log('failed creating a monster')
            return false
        }
        //const monster = await this.gameDb.createUnit(monsterObj)

        console.log(`selected ${player.descriptor.account} for combat with monster rarity ${monsterRarity.name} magic ${magic}`)

        //this.discord.channels.get('403320283261304835').send(`\`\`\`json\n[\n\{ 'player': ${JSON.stringify(player)},\n'playerItems': ${JSON.stringify(items)} }\n]\n\`\`\``)
    }

    async run() {
        console.log('loading settings')
        let settings = await this.gameDb.getSettings()
        if (!settings) {
            console.log('game settings don\'t exist, creating')
            settings = await this.gameDb.createSettings({ next_unit_id: 1, next_item_id: 1 })
            if (!settings) {
                console.log('unable to create game settings')
                return false
            }
        }

        const combatRngCtx = new SecureRNGContext('combat secret')
        if (!this.secureRng.addContext(combatRngCtx, 'combat')) {
            console.log('unable to add combat RNG context')
            return false
        }

        const itemRngCtx = new SecureRNGContext('item secret')
        if (!this.secureRng.addContext(itemRngCtx, 'item')) {
            console.log('unable to add item RNG context')
            return false
        }

        const monsterRngCtx = new SecureRNGContext('monster secret')
        if (!this.secureRng.addContext(monsterRngCtx, 'monster')) {
            console.log('unable to add monster RNG context')
            return false
        }

        // generate test player
        console.log('creating player')

        let playerObj = PlayerUtil.create(PlayerType.CLERIC.id, "ᛖᛒᛟᛚᚨ")
        let player = await this.gameDb.createUnit(playerObj)
        if (player) {
            // generate test items
            let code = ItemTable.GREAT_HELM.code

            let itemObj = ItemUtil.generate(itemRngCtx, code, ItemClass.ARMOR, ArmorClass.GLOVES, Tier.TIER5.id, ItemRarity.COMMON.id)
            itemObj.owner = player.id
            let item = await this.gameDb.createItem(itemObj)
            await this.player.equipItem(player, item, Storage.EQUIPMENT.id, 1)

            itemObj = ItemUtil.generate(itemRngCtx, code, ItemClass.ARMOR, ArmorClass.BOOTS, Tier.TIER4.id, ItemRarity.COMMON.id)
            itemObj.owner = player.id
            item = await this.gameDb.createItem(itemObj)
            await this.player.equipItem(player, item, Storage.EQUIPMENT.id, 2)

            itemObj = ItemUtil.generate(itemRngCtx, code, ItemClass.ARMOR, Tier.TIER6.id, ItemRarity.COMMON.id)
            itemObj.owner = player.id
            item = await this.gameDb.createItem(itemObj)
            await this.player.equipItem(player, item, Storage.EQUIPMENT.id, 3)

            console.log('updating settings')
            await this.gameDb.updateSettings(settings)

            console.log(`${JSON.stringify(player)}`)

            let items = await this.unit.getEquippedItems(player)

            this.createPlayerInventoryEmbed(player, items)
        }

        while (!this.interrupt) {
            await this.sleep(1*1000, async loop => { await this.loop() })
        }

        console.log('run loop terminating')

        await this.destroy()

        console.log('shutdown complete')

        return true
    }
}

const game = new Game(Config)
