const Config = require('./config.json')

const Discord = require('discord.js')

const { GameDb } = require('./db')
const { SecureRNG, SecureRNGContext } = require('./rng')
const { GameState } = require('./gamestate')

const { CombatType, CombatContext, CombatEventType } = require('./combat')
const { Storage, Slots } = require('./storage')
const { StatTable, StatFlag } = require('./stattable')

const { Tier, TierStatCount } = require('./tier')

const { ItemClass, ArmorClass, WeaponClass, JewelClass } = require('./itemclass')
const { ItemRarity } = require('./itemrarity')
const { ItemTable } = require('./itemtable')

const { getExperienceForLevel } = require('./experience')

const { UnitType } = require('./unit')
const { MonsterTable } = require('./monstertable')
const { PlayerType, Player, Mage, Warrior, Rogue } = require('./player')
const { Monster, MonsterType } = require('./monster')
const { MonsterRarity } = require('./monsterrarity.js')

// utility classes
const { Markdown, DiscordUtil } = require('./util/discord')
const { StorageUtil } = require('./util/storage')
const { StatUtil } = require('./util/stats')
const { ItemUtil } = require('./util/item')
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

        this.gameState = GameState.OFFLINE
        this.combatContext = null
        this.combatMessage = null // FIXME for now, just to seperate it

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
        DiscordUtil.setCommandHandler('stat', this, this.spendStatPoints)

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

        console.log('logging in to discord')
        let res = await this.discord.login(this.token)
            .catch(e => {
                console.log('caught', e)
                return false
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
            ['warrior']: PlayerType.WARRIOR.id,
            ['rogue']: PlayerType.ROGUE.id,
            ['ranger']: PlayerType.RANGER.id,
            ['cleric']: PlayerType.CLERIC.id
        })[typeString] || 0

        if (!type) {
            console.log(`invalid player type ${type}`)
            this.ctx.discord.channels.get(this.channel)
                .send(`<@${this.user}> Invalid player class ${typeString}, valid types are: \`Mage, Warrior, Rogue, Ranger, Cleric\``)
            return
        }

        if (await this.ctx.gameDb.getUnitByAccount(this.user)) {
            this.ctx.discord.channels.get(this.channel)
                .send(`<@${this.user}> You already have a player, use the delete command if you wish to create a new player`)
            return
        }

        let settings = await this.ctx.gameDb.getSettings()
        let playerData = PlayerUtil.create(type, 1, this.user)
        let player = await this.ctx.unit.prepareGeneratedUnit(playerData, settings)
        if (player) {
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

        let existing = await this.ctx.gameDb.getUnitByAccount(this.user)
        if (existing) {
            await this.ctx.gameDb.removeUnit(existing)
            this.ctx.discord.channels.get(this.channel)
                .send(`<@${this.user}> Your character has been deleted`)
        } else {
            this.ctx.discord.channels.get(this.channel)
                .send(`<@${this.user}> Unable to delete, no character found`)
        }
    }

    // lexical this is in the context of CommandHandler
    async spendStatPoints() {
        console.log('spendStatPoints')

        let player = await this.ctx.gameDb.getUnitByAccount(this.user)
        if (!player) {
            this.ctx.discord.channels.get(this.channel)
                .send(`<@${this.user}> Unable to lookup your account, use .create to make an account`)
            return
        }

        if (player.type !== UnitType.PLAYER.id) {
            return
        }

        let remainingPoints = player.descriptor.stat_points_remaining

        if (this.args.length === 0) {
            this.ctx.discord.channels.get(this.channel)
                .send(`<@${this.user}> You have ${remainingPoints} available stat points`)
            return
        }

        const value = parseInt(this.args[0], 10)
        const typeString = this.args[1].toLowerCase()

        if (value > remainingPoints) {
            this.ctx.discord.channels.get(this.channel)
                .send(`<@${this.user}> You only ${remainingPoints} available and cannot apply ${value} points to ${typeString}`)
            return
        }

        let stat = ({
            ['str']: StatTable.STR.id,
            ['dex']: StatTable.DEX.id,
            ['int']: StatTable.INT.id,
            ['vit']: StatTable.VIT.id,
        })[typeString] || 0

        if (!stat) {
            this.ctx.discord.channels.get(this.channel)
                .send(`<@${this.user}> Invalid stat type, choose one of: str, dex, int, vit`)
            return
        }

        await PlayerUtil.applyStatPoints(player, stat, value)

        this.ctx.discord.channels.get(this.channel)
            .send(`<@${this.user}> ${value} points have been applied, you have ${remainingPoints-value} available stat points remaining`)
    }

    createPlayerInventoryEmbed(unit, items, color) {
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

    unitInfoToString(unit) {
        if (!unit)
            return ''

        const ST = StatTable
        const SU = StatUtil

        let unitInfo = ''

        const name = UnitUtil.getName(unit)
        const isPlayer = unit.type === UnitType.PLAYER.id
        if (isPlayer) {
            unitInfo += `${name} Level ${unit.level} ` +
                `Exp (${SU.getStat(unit.stats, ST.UNIT_EXP.id).value}/` +
                `${getExperienceForLevel(unit.level+1)})`
        } else {
            const monsterRarity = MonsterUtil.getMonsterRarityEntry(unit.descriptor.rarity)
            unitInfo += `${monsterRarity.name} ${name} Level ${unit.level}`
        }

        unitInfo += ` HP (${SU.getStat(unit.stats, ST.UNIT_HP.id).value}/` +
            `${SU.getStat(unit.stats, ST.UNIT_HP_MAX.id).value})` +
            ` BaseAtk ${SU.getStat(unit.stats, ST.UNIT_BASE_ATK.id).value}` +
            ` BaseMAtk ${SU.getStat(unit.stats, ST.UNIT_BASE_MATK.id).value}` +
            ` Atk ${SU.getStat(unit.stats, ST.UNIT_ATK.id).value}` +
            ` MAtk ${SU.getStat(unit.stats, ST.UNIT_MATK.id).value}` +
            ` Def ${SU.getStat(unit.stats, ST.UNIT_DEF.id).value}` +
            ` MDef ${SU.getStat(unit.stats, ST.UNIT_MDEF.id).value}`

        return unitInfo
    }

    async getRecentlyActivePlayers() {
        let activeUsers = await this.gameDb.getActiveUsers()
        if (!activeUsers) {
            console.log('unable to get active users')
            return null
        }

        return activeUsers
    }

    async getLocalTestPlayers() {
        let players = []
        let player = await this.gameDb.getUnitByAccount('TestMage')
        if (!player) {
            console.log('unable to get player1 by account')
            return null
        }
        players.push(player)

        player = await this.gameDb.getUnitByAccount('TestRanger')
        if (!player) {
            console.log('unable to get test ranger by account')
            return null
        }
        players.push(player)

        player = await this.gameDb.getUnitByAccount('TestWarrior')
        if (!player) {
            console.log('unable to get test warrior by account')
            return null
        }
        players.push(player)

        player = await this.gameDb.getUnitByAccount('TestCleric')
        if (!player) {
            console.log('unable to get test cleric by account')
            return null
        }
        players.push(player)

        player = await this.gameDb.getUnitByAccount('TestRogue')
        if (!player) {
            console.log('unable to get test rogue by account')
            return null
        }
        players.push(player)

        if (players.length !== 5) {
            console.log('unable to lookup players')
            return null
        }

        return players
    }

    async getUnitsForCombat() {
        let rngCtx = this.secureRng.getContext('combat')
        if (!rngCtx) {
            console.log('unable to get combat RNG context')
            return null
        }

        // TODO select alternative run loop implementation based on config mode
        let players = null
        if (this.isLocalTest)
            players = await this.getLocalTestPlayers()
        else
            players = await this.getActivePlayers()

        if (!players) {
            console.log('unable to find a recently active player, skipping combat')
            return null
        }

        players = SecureRNG.shuffleSequence(rngCtx, players)

        let pvp = false
        if (players.length > 1 && SecureRNG.getRandomInt(rngCtx, 0, 127) === 127)
            pvp = true

        let units = []

        units.push(players.pop())

        let monsterRarity = MonsterRarity.COMMON

        if (pvp) {
            console.log('pvp combat selected')

            units.push(players.pop())
        } else {
            console.log('monster combat selected')

            let settings = await this.gameDb.getSettings()
            let monsterRngCtx = this.secureRng.getContext('monster')
            if (!monsterRngCtx) {
                console.log('unable to get monster RNG context')
                return null
            }

            let magic = SecureRNG.getRandomInt(rngCtx, 0, MonsterRarity.SUPERBOSS.rarity)
            monsterRarity = Game.getFightMonsterRarity(magic)

            let shuffledTable = SecureRNG.shuffleSequence(monsterRngCtx, Object.values(MonsterTable))

            // generate a monster
            const code = shuffledTable.shift().code
            const diff = SecureRNG.getRandomInt(rngCtx, -5, 5)
            const level = Math.max(1, units[0].level+diff)

            console.log(`creating level ${level} ${monsterRarity.name}(${magic}) monster for combat`)

            let monsterData = this.monster.generate(monsterRngCtx, code, level, Tier.TIER1.id, monsterRarity.id)
            if (!monsterData) {
                console.log('failed creating a monster')
                return null
            }
            let monster = await this.unit.prepareGeneratedUnit(monsterData, settings)
            units.push(monster)
        }

        const SU = StatUtil
        const ST = StatTable

        let unitAStr = this.unitInfoToString(units[0])
        let unitBStr = this.unitInfoToString(units[1])

        let output = `combat selected\n\`${unitAStr}\`\n*VS.*\n\`${unitBStr}\``

        console.log(output)
        if (this.discordConnected)
            this.combatMessage = await this.discord.channels.get('406164903708327938')
                .send(output)

        return units
    }

    async doOffline() {
        console.log('doOffline')

        return true
    }

    async doCombat() {
        console.log('doCombat')

        if (!this.combatContext)
            return false

        // resolve attack
        let results = await this.combatContext.resolveRound()
        if (!results) {
            console.log('failed to resolve attack')
            return false
        }

        const ST = StatTable
        const SU = StatUtil

        let output = ''

        await results.map(async r => {
            const atkName = UnitUtil.getName(r.attacker)
            const defName = UnitUtil.getName(r.defender)

            if (r.type === CombatEventType.PLAYER_DAMAGE.id ||
                    r.type === CombatEventType.MONSTER_DAMAGE.id) {
                let total = r.data.physical + r.data.magic

                output += `\`${atkName}\` did ${total} ` +
                    `(${r.data.physical}:${r.data.magic})` +
                    ` damage to \`${defName}\``
            }

            if (r.type === CombatEventType.PLAYER_DEATH.id ||
                    r.type === CombatEventType.MONSTER_DEATH.id) {
                output += `${atkName} has slain ${defName}.`
            }

            if (r.type === CombatEventType.PLAYER_EXPERIENCE.id) {
                output += `${atkName} has gained ${r.data} experience.`
            }

            if (r.type === CombatEventType.PLAYER_LEVEL.id) {
                output += `${atkName} has reached level ${r.attacker.level}!`
            }

            if (output[output.length-1] !== '\n')
                output += '\n'
        })

        console.log(output)

        await results.map(async r => {
            if (r.type === CombatEventType.PLAYER_DEATH.id ||
                    r.type === CombatEventType.MONSTER_DEATH.id) {
                this.gameState = GameState.ONLINE

                if (r.defender.type === UnitType.MONSTER.id) {
                    // Monster death Vs. player

                    // TODO item drops

                    console.log('removing monster')
                    await this.gameDb.removeUnit(r.defender)
                } else if (r.attacker.type === UnitType.MONSTER.id &&
                        r.defender.type === UnitType.PLAYER.id) {
                    // Player death Vs. monster
                    console.log('removing monster')
                    await this.gameDb.removeUnit(r.attacker)
                }

                if (r.attacker.type === UnitType.PLAYER.id) {
                    // NOTE just temporary
                    console.log('resurrecting player unit')
                    SU.setStat(r.attacker.stats, ST.UNIT_HP.id,
                            SU.getStat(r.attacker.stats, ST.UNIT_HP_MAX.id).value)
                    await r.attacker.save()
                }
                if (r.defender.type === UnitType.PLAYER.id) {
                   // NOTE just temporary
                    console.log('resurrecting player unit')
                    SU.setStat(r.defender.stats, ST.UNIT_HP.id,
                            SU.getStat(r.defender.stats, ST.UNIT_HP_MAX.id).value)
                    await r.defender.save()
                }
            }
        })

        this.combatMessage = await this.combatMessage.edit(`${this.combatMessage.content}\n${output}\n`)

        return true
    }

    async doOnline() {
        console.log('doOnline')

        let foundPlayer = false

        let units = await this.getUnitsForCombat()
        if (!units || units.length !== 2)
            return false

        this.combatContext = new CombatContext(this, ...units)

        console.log(`selected ${UnitUtil.getName(units[0])} and ${UnitUtil.getName(units[1])} for combat`)

        this.gameState = GameState.COMBAT

        return true
    }

    async loop() {
        if (!this.dbConnected) {
            this.gameState = GameState.OFFLINE
            console.log('not connected to the database, skipping combat');
        }

        if (!this.discordConnected && !this.isLocalTest) {
            this.gameState = GameState.OFFLINE
            console.log('discord is not connected, skipping combat')
        }

        if (this.gameState === GameState.OFFLINE && this.dbConnected &&
                (this.isLocalTest ||
                (!this.isLocalTest && this.discordConnected))) {
            this.gameState = GameState.ONLINE
        }

        switch (this.gameState) {
            case GameState.ONLINE:
                return await this.doOnline()

            case GameState.OFFLINE:
                return await this.doOffline()

            case GameState.COMBAT:
                return await this.doCombat()
        }

        return false
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

        // Create test Mage
        console.log('creating test Mage')
        let playerData = PlayerUtil.create(PlayerType.MAGE.id, 1, "TestMage")
        let player = await this.unit.prepareGeneratedUnit(playerData, settings)

        // Create test Ranger
        console.log('creating test Ranger')
        playerData = PlayerUtil.create(PlayerType.RANGER.id, 1, "TestRanger")
        player = await this.unit.prepareGeneratedUnit(playerData, settings)

        // Create test Cleric
        console.log('creating test Cleric')
        playerData = PlayerUtil.create(PlayerType.CLERIC.id, 1, "TestCleric")
        player = await this.unit.prepareGeneratedUnit(playerData, settings)

        // Create test Warrior
        console.log('creating test Warrior')
        playerData = PlayerUtil.create(PlayerType.WARRIOR.id, 1, "TestWarrior")
        player = await this.unit.prepareGeneratedUnit(playerData, settings)

        // Create test Warrior
        console.log('creating test Rogue')
        playerData = PlayerUtil.create(PlayerType.ROGUE.id, 1, "TestRogue")
        player = await this.unit.prepareGeneratedUnit(playerData, settings)

        // and last, save the game settings
        await settings.save()

        while (!this.interrupt) {
            await this.sleep(1*1500, async loop => { await this.loop() })
        }

        console.log('run loop terminating')

        await this.destroy()

        console.log('shutdown complete')

        return true
    }
}

const game = new Game(Config)
