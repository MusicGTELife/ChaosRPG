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

class MarkdownHelper {
    static addBoldSeq(str) {
        return `**${str}**`
    }

    static addCodeSeq(str, lang) {
        return `\`\`\`${lang}\n${str}\`\`\``
    }
}

class Game {
    constructor(token) {
        this.discord = new Discord.Client()
        this.token = token
        this.gameDb = new GameDb()

        this.item = new ItemUtil(this)
        this.unit = new UnitUtil(this)
        this.player = new PlayerUtil(this)
        //this.monster = new Monster(this)
    }

    async init() {
        console.log('running game')
        await this.run()
    }

    syncinit() {
        this.init()
    }

    timeout(ms) {
        return new Promise(resolve => setTimeout(resolve, ms))
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
        else
            return FightType.NORMAL
    }

    onError(error) {
        console.log(`error, ${error}`)
    }

    onReady() {
        console.log('I am ready!')
        this.discord.user.setActivity('ChaosRPG', { type: 'PLAYING' })

/*
        let embed = new Discord.RichEmbed().setColor(3447003)
            .setDescription('**Character Inventory**')
            //.addBlankField()
            //.addField("**Equipment**", `*${MarkdownHelper.addCodeSeq("Currently equipped items", "json")}*`)
            .addField('*Amulet* **`Reavers Amulet of Sorrow`**',
                `**${MarkdownHelper.addCodeSeq("Foo: 15\nBar: 15\nBaz: some text", "prolog")}**`, true)
            .addField('*Helmet* **`Dunce Cap of Indecision`**',
                `**${MarkdownHelper.addCodeSeq("Foo: 15\nBar: 15\nBaz: some text", "prolog")}**`, true)
            .addField('*Armor* **`Apprentice\'s Robe of Rain`**',
                `**${MarkdownHelper.addCodeSeq("Foo: 15\nBar: 15\nBaz: some text", "prolog")}**`, true)
            .addField('*Gloves* **`Danny Glover\'s Dandy Gloves`**',
                `**${MarkdownHelper.addCodeSeq("Foo: 15\nBar: 15\nBaz: some text", "prolog")}**`, true)
            .addField('*Boots* **`Peter Pan\'s Getaway Boots`**',
                `**${MarkdownHelper.addCodeSeq("Foo: 15\nBar: 15\nBaz: some text", "prolog")}**`, true)

            //.addBlankField()
            //.addField("**Inventory**", `*${MarkdownHelper.addCodeSeq("Items in your bag", "json")}*`)
            .addField('*Slot 1* **`Reavers Amulet of Sorrow`**',
                `**${MarkdownHelper.addCodeSeq("Foo: 15\nBar: 15\nBaz: some text", "prolog")}**`, true)
            .addField('*Slot 2* **`Dunce Cap of Indecision`**',
                `**${MarkdownHelper.addCodeSeq("Foo: 15\nBar: 15\nBaz: some text", "prolog")}**`, true)
            .addField('*Slot 3* **`Apprentice\'s Robe of Rain`**',
                `**${MarkdownHelper.addCodeSeq("Foo: 15\nBar: 15\nBaz: some text", "prolog")}**`, true)
            .addField('*Slot 4* **`Danny Glover\'s Dandy Gloves`**',
                `**${MarkdownHelper.addCodeSeq("Foo: 15\nBar: 15\nBaz: some text", "prolog")}**`, true)
            .addField('*Slot 5* **`Peter Pan\'s Getaway Boots`**',
                `**${MarkdownHelper.addCodeSeq("Foo: 15\nBar: 15\nBaz: some text", "prolog")}**`, true)

        console.log(embed)
        this.discord.channels.get('403320283261304835').send(embed)
*/
    }

    onMessage(message) {
        console.log(message.content)
    }

    onTypingStart(channel, user) {
        console.log(`${user.id} typing on ${channel.id}`)
    }

    async loop(obj) {
        let onlinePlayers = [ 1, 2, 4, 5, 6, 7, 8, 9, 10 ]

        let player = await obj.gameDb.getPlayer(0xbeef)
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
        this.discord.on('ready', ready => { this.onReady() })
        this.discord.on('error', error => { this.onError(error) })
        this.discord.on('message', message => { this.onMessage(message) })
        this.discord.on('typingStart', (channel, user) => { this.onTypingStart(channel, user) })

        this.discord.login(this.token)

        let itemObj = ItemUtil.generateItem(ItemClass.ARMOR, Tier.TIER2.id, ItemRarity.COMMON.id)
        itemObj.id = 0x1337
        itemObj.owner = 0xbeef
        itemObj.is_equipped = true
        let item = await this.gameDb.createItem(itemObj)
        if (!item) {
            console.log(`failed creating test item id ${itemObj.id}`)
        }

        itemObj = ItemUtil.generateItem(ItemClass.ARMOR, Tier.TIER4.id, ItemRarity.COMMON.id)
        itemObj.id = 0x1337+1
        itemObj.owner = 0xbeef
        itemObj.is_equipped = true
        item = await this.gameDb.createItem(itemObj)
        if (!item) {
            console.log(`failed creating test item id ${itemObj.id}`)
        }

        itemObj = ItemUtil.generateItem(ItemClass.ARMOR, Tier.TIER4.id, ItemRarity.COMMON.id)
        itemObj.id = 0x1337+2
        itemObj.owner = 0xbeef
        itemObj.is_equipped = true
        item = await this.gameDb.createItem(itemObj)
        if (!item) {
            console.log(`failed creating test item id ${itemObj.id}`)
        }

        // generate test player
        console.log('creating player')
        let playerObj = UnitUtil.createBaseDescriptor(UnitType.PLAYER.id)
        playerObj.equipment[0] = 0x1337
        playerObj.equipment[1] = 0x1337+1
        playerObj.equipment[2] = 0x1337+2
        playerObj.id = 0xbeef

        console.log(`${JSON.stringify(playerObj)}`)

        let player = await this.gameDb.createUnit(playerObj)
        if (player) {
            let items = await this.player.getEquippedItems(player)
            item = await this.gameDb.getItem(itemObj.id)

            await this.player.unequipItem(player, items, item, 2)
        }

        while (1) {
            await this.sleep(10*1000, loop => { this.loop(this) })
        }
    }
}

const token = ''
let game = new Game(token)
game.syncinit()
