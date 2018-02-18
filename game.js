const Config = require('./config.json')

const Discord = require('discord.js')

const { Guild } = require('./guild')

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

const { Unit: UnitModel } = require('./models')

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

        this.combatContexts = new Map()

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

        DiscordUtil.setCommandHandler('guild', this, this.guildSettings)

        DiscordUtil.setCommandHandler('create', this, this.createPlayer)
        DiscordUtil.setCommandHandler('delete', this, this.deletePlayer)
        DiscordUtil.setCommandHandler('stats', this, this.spendStatPoints)

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

    async onReady() {
        console.log('connected to discord')

        this.discordConnected = true

        this.discord.user.setActivity('ChaosRPG', { type: 'PLAYING' })

        let settings = await this.gameDb.getSettings()
        settings.guilds.map(async g => {
            let guild = this.discord.guilds.get(g)
            if (!guild) {
                console.log('no guild record', g)
                process.exit(1)
                return
            }

            let guildSettings = await this.gameDb.getGuildSettings(guild.id)

            let gameChannel = guild.channels.get(guildSettings.game_channel)
            if (gameChannel) {

            }

            let debugChannel = guild.channels.get(guildSettings.debug_channel)
            if (debugChannel) {
                debugChannel.send('ChaosRPG is online.')
            }
        })
    }

    onMessage(message) {
        console.log(message.content)
        let command = DiscordUtil.parseCommand(message)
        if (command) {
            console.log(`processing command ${command.name}`)
            DiscordUtil.processCommand(command)
        }

        if (message.author.id !== this.discord.user.id) {
            //const emojiList = message.guild.emojis.map(e=>e.toString()).join(" ")
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

    // administrative handlers

    // lexical this is in the context of CommandHandler
    // TODO break this up into multiple commands, or at least some utility
    // functions to make it easier to deal with all of the cases
    async guildSettings() {
        console.log('guild settings', this.args.length)
        if (this.args.length >= 2) {
            let subCmd = this.args[0]
            let guildName = this.args[1]

            const guild = this.ctx.discord.guilds.find('name', guildName)
            if (!guild) {
                console.log(`I am not in ${guildName}`)
                this.message.channel
                    .send(`<@${this.message.author.id}> I am not in guild ${guildName}`)
                return
            }

            let settings = await this.ctx.gameDb.getSettings()

            if (subCmd === 'add' && this.args.length <= 4) {
                console.log('add', guildName)

                if (settings.guilds.find(g => g.guild === guildName)) {
                    console.log('already exists')
                    this.message.channel
                        .send(`<@${this.message.author.id}> Settings already exist for ${guildName}`)
                } else {
                    let gameChannel = this.args[2] || ''
                    let debugChannel = this.args[3] || ''

                    let game = null
                    let debug = null

                    let isChannel = function(channel) {
                        if (channel === '')
                            return false
                        return channel.match(/(<?#?(\d+)>?)/, '$2') !== null
                    }

                    if (gameChannel !== '') {
                        if (isChannel(gameChannel)) {
                            gameChannel = gameChannel.replace(/(<?#?(\d+)>?)/, '$2')
                            game = guild.channels.get(gameChannel)
                        }
                        if (!game)
                            game = guild.channels.find('name', gameChannel)
                        if (!game) {
                            this.message.channel
                                .send(`<@${this.message.author.id}> Unable to lookup channel ${gameChannel}`)
                            return
                        }
                    }

                    if (debugChannel !== '') {
                        if (isChannel(debugChannel)) {
                            debugChannel = debugChannel.replace(/(<?#?(\d+)>?)/, '$2')
                            debug = guild.channels.get(debugChannel)
                        }
                        if (!debug)
                            debug = guild.channels.find('name', debugChannel)
                        if (!debug) {
                            this.message.channel
                                .send(`<@${this.message.author.id}> Unable to lookup channel ${debugChannel}`)
                            return
                        }
                    }

                    let guildSettings = Guild.createSettings(
                        guild.id, game ? game.id : '', debug ? debug.id : '', '', 0
                    )
                    await this.ctx.gameDb.createGuildSettings(guildSettings)
                    settings.guilds.push(guild.id)
                    await settings.save()

                    this.message.channel
                        .send(`<@${this.message.author.id}> Added guild ${guildName}`)
                }

                return
            } else if (subCmd === 'remove') {
                console.log('remove')

                await this.ctx.gameDb.removeGuildSettings(guildName)
                return
            } else if (subCmd === 'debug') {
                if (args.length === 2) {
                    this.message.channel
                        .send(`<@${this.message.author.id}> Added guild ${guildName}`)
                } else {
                }

                return
            } else if (subCmd === 'game') {
                let guildSettings = this.ctx.gameDb.getGuildSettings()
                if (args.length === 2) {
                    this.message.channel
                        .send(`<@${this.message.author.id}> Added guild ${guildName}`)

                } else {
                }

                return
            }

            console.log('invalid sub-command')
            return
        }

        console.log(settings)
    }

    // user handlers

    // lexical this is in the context of CommandHandler
    async createPlayer() {
        console.log('createPlayer')

        let settings = await this.ctx.gameDb.getSettings()

        let account = await this.ctx.gameDb.getAccount(this.message.guild.id, this.message.author.id)
        if (!account) {
            account = await this.ctx.gameDb.createAccount({
                id: settings.next_account_id,
                guild: this.message.guild.id,
                name: this.message.author.id
            })

            settings.next_account_id++
            await settings.save()
        }
        if (!account) {
            console.log('failed to create account')
            return null
        }

        let typeString = this.args.length ? this.args[0].toLowerCase() : ''

        let type = ({
            ['mage']: PlayerType.MAGE.id,
            ['warrior']: PlayerType.WARRIOR.id,
            ['rogue']: PlayerType.ROGUE.id,
            ['ranger']: PlayerType.RANGER.id,
            ['cleric']: PlayerType.CLERIC.id
        })[typeString] || 0

        if (!type) {
            console.log(`invalid player type ${type}`)
            this.message.channel
                .send(`<@${this.message.author.id}> Invalid player class ${typeString}, valid types are: \`Mage, Warrior, Rogue, Ranger, Cleric\``)
            return
        }

        let existing = await this.ctx.gameDb.getUnitByAccount(account.id)
        if (existing) {
            this.message.channel
                .send(`<@${this.message.author.id}> You already have a player, use the delete command if you wish to create a new player`)
            return
        }

        let playerData = PlayerUtil.create(type, 1, account.id, this.message.author.username)
        console.log(settings)

        let player = await this.ctx.unit.prepareGeneratedUnit(playerData, settings)
        if (player) {
            this.message.channel
                .send(`<@${this.message.author.id}> Your ${typeString} character has been created`)
        } else {
            this.message.channel
                .send(`<@${this.message.author.id}> Failed to create your ${typeString} character`)
        }
    }

    // lexical this is in the context of CommandHandler
    async deletePlayer() {
        console.log('deletePlayer')

        let settings = await this.ctx.gameDb.getSettings()

        let account = await this.ctx.gameDb.getAccount(this.message.guild.id, this.message.author.id)
        if (!account) {
           this.message.channel
                .send(`<@${this.message.author.id}> No account found`)
            return
        }

        let existing = await this.ctx.gameDb.getUnitByAccount(account.id)
        if (existing) {
            let combatCtx = await this.ctx.combatContexts.get(account.guild)
            if (combatCtx && combatCtx.unitA.type === UnitType.PLAYER.id) {
                if (combatCtx.unitA.descriptor.account === account.id)
                    this.ctx.combatContexts.delete(account.guild)
            }
            if (combatCtx && combatCtx.unitB.type === UnitType.PLAYER.id) {
                if (combatCtx.unitB.descriptor.account === account.id)
                    this.ctx.combatContexts.delete(account.guild)
            }

            await this.ctx.gameDb.removeUnit(existing)
            this.message.channel
                .send(`<@${this.message.author.id}> Your character has been deleted`)
        } else {
            this.message.channel
                .send(`<@${this.message.author.id}> Unable to delete, no character found`)
        }
    }

    // lexical this is in the context of CommandHandler
    async spendStatPoints() {
        console.log('spendStatPoints')

        let settings = await this.ctx.gameDb.getSettings()

        let account = await this.ctx.gameDb.getAccount(this.message.guild.id, this.message.author.id)
        if (!account) {
           this.message.channel
                .send(`<@${this.message.author.id}> No account found`)
            return
        }

        let player = await this.ctx.gameDb.getUnitByAccount(account.id)
        if (!player) {
            this.message.channel
                .send(`<@${this.message.author.id}> Unable to lookup your account, use .create to make an account`)
            return
        }

        if (player.type !== UnitType.PLAYER.id) {
            return
        }

        let remainingPoints = player.descriptor.stat_points_remaining

        if (this.args.length === 0) {
            this.message.channel
                .send(`<@${this.message.author.id}> You have ${remainingPoints} available stat points`)
            return
        }

        const value = parseInt(this.args[0], 10)
        const typeString = this.args[1].toLowerCase()

        if (value > remainingPoints) {
            this.message.channel
                .send(`<@${this.message.author.id}> You only ${remainingPoints} available and cannot apply ${value} points to ${typeString}`)
            return
        }

        let stat = ({
            ['str']: StatTable.STR.id,
            ['dex']: StatTable.DEX.id,
            ['int']: StatTable.INT.id,
            ['vit']: StatTable.VIT.id,
        })[typeString] || 0

        if (!stat) {
            this.message.channel
                .send(`<@${this.message.author.id}> Invalid stat type, choose one of: str, dex, int, vit`)
            return
        }

        let items = await this.ctx.player.getEquippedItems(player)
        await PlayerUtil.applyStatPoints(player, items, stat, value)

        this.message.channel
            .send(`<@${this.message.author.id}> ${value} points have been applied, you have ${remainingPoints-value} available stat points remaining`)
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

    unitInfoCombatHeader(unit) {
        if (!unit)
            return ''

        const ST = StatTable
        const SU = StatUtil

        const name = UnitUtil.getName(unit)
        const isPlayer = unit.type === UnitType.PLAYER.id

        let unitInfo = `Level ${unit.level}`

        if (!isPlayer) {
            const monsterRarity = MonsterUtil.getMonsterRarityEntry(unit.descriptor.rarity)
            unitInfo += ` ${monsterRarity.name}`
        } else {
            unitInfo += ` Exp(${SU.getStat(unit.stats, ST.UNIT_EXP.id).value}/` +
                `${getExperienceForLevel(unit.level+1)})`
        }

        unitInfo += `\nHP (${SU.getStat(unit.stats, ST.UNIT_HP.id).value}/` +
            `${SU.getStat(unit.stats, ST.UNIT_HP_MAX.id).value})`

        return unitInfo
    }

    unitInfoCombatStats(unit) {
        if (!unit)
            return ''

        const ST = StatTable
        const SU = StatUtil

        const str = SU.getStat(unit.stats, ST.UNIT_STR.id).value
        const dex = SU.getStat(unit.stats, ST.UNIT_DEX.id).value
        const int = SU.getStat(unit.stats, ST.UNIT_INT.id).value
        const vit = SU.getStat(unit.stats, ST.UNIT_VIT.id).value

        let unitInfo = `S:${str} D:${dex} I:${int} V:${vit}` +
            `\nBaseAtk(${SU.getStat(unit.stats, ST.UNIT_BASE_ATK.id).value}:${SU.getStat(unit.stats, ST.UNIT_BASE_MATK.id).value})` +
            `\nAtk(${SU.getStat(unit.stats, ST.UNIT_ATK.id).value}:${SU.getStat(unit.stats, ST.UNIT_MATK.id).value})` +
            `\nDef(${SU.getStat(unit.stats, ST.UNIT_DEF.id).value}:${SU.getStat(unit.stats, ST.UNIT_MDEF.id).value})` +
            `\nAcc:Rct(${SU.getStat(unit.stats, ST.UNIT_ACCURACY.id).value}:${SU.getStat(unit.stats, ST.UNIT_REACTION.id).value})`

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

    async getUnitsForCombat(online) {
        let rngCtx = this.secureRng.getContext('combat')
        if (!rngCtx) {
            console.log('unable to get combat RNG context')
            return null
        }

        if (!online || online.length < 1) {
            console.log('not enough online players, skipping combat')
            return null
        }

        if (online.length > 1)
            online = SecureRNG.shuffleSequence(rngCtx, online)

        let units = []
        units.push(online.pop())

        let pvp = false
        if (online.length > 1) {
            let diff = Math.abs(online[online.length-1].level-units[0].level)
            let range = Math.round(units[0].level * 0.1)
            if (range <= diff && SecureRNG.getRandomInt(rngCtx, 0, 127) === 127)
                pvp = true
        }

        let monsterRarity = MonsterRarity.COMMON

        if (pvp) {
            console.log('pvp combat selected')

            units.push(online.pop())
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
            const range = 1 + Math.round(units[0].level * 0.1)
            const code = shuffledTable.shift().code
            const diff = SecureRNG.getRandomInt(rngCtx, -range, range)
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

        return units
    }

    async doOffline() {
        console.log('doOffline')

        return true
    }

    async doCombat(combatContext) {
        console.log('doCombat')

        if (!combatContext) {
            console.log('no combat context in doCombat')
            process.exit(1)
            return false
        }

        // resolve attack
        let results = await combatContext.resolveRound()
        if (!results) {
            console.log('failed to resolve attack')
            return false
        }

        const ST = StatTable
        const SU = StatUtil

        let guild = await combatContext.game.gameDb.getGuildSettings(combatContext.guild)
        let channel = await combatContext.game.discord.channels.get(guild.game_channel)

        let dmgA = ''
        let dmgB = ''
        let output = ''

        await results.map(async r => {
            const atkName = `${UnitUtil.getName(r.attacker)}`
            const defName = `${UnitUtil.getName(r.defender)}`

            if (r.type === CombatEventType.PLAYER_DAMAGE.id ||
                    r.type === CombatEventType.MONSTER_DAMAGE.id) {
                let total = r.data.physical + r.data.magic

                let out = `dealt ${total} (${r.data.physical}|${r.data.magic})\n`

                if (r.attacker.id === combatContext.unitA.id) {
                    dmgA += out
                } else {
                    dmgB += out
                }
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
        })

        console.log(output)

        results.map(async r => {
            if (r.type === CombatEventType.PLAYER_DEATH.id ||
                    r.type === CombatEventType.MONSTER_DEATH.id) {

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

                    r.attacker = await UnitModel.findOneAndUpdate({ id: r.attacker.id },
                        { stats: r.attacker.stats, descriptor: r.attacker.descriptor },
                        { new: true }
                    )
                }
                if (r.defender.type === UnitType.PLAYER.id) {
                   // NOTE just temporary
                    console.log('resurrecting player unit')
                    SU.setStat(r.defender.stats, ST.UNIT_HP.id,
                            SU.getStat(r.defender.stats, ST.UNIT_HP_MAX.id).value)

                    r.defender = await UnitModel.findOneAndUpdate({ id: r.defender.id },
                        { stats: r.defender.stats, descriptor: r.defender.descriptor },
                        { new: true }
                    )
                }
                this.combatContexts.delete(combatContext.guild)
                return true
            }
        })

        let embed = new Discord.RichEmbed()
            .setColor(7682618)//.setDescription(info)

        let desc = ''
        if (output !== '')
            Markdown.c(output, "ml")

        let unitAHdr = this.unitInfoCombatHeader(combatContext.unitA)
        let unitBHdr = this.unitInfoCombatHeader(combatContext.unitB)

        let unitABody = this.unitInfoCombatStats(combatContext.unitA)
        let unitBBody = this.unitInfoCombatStats(combatContext.unitB)

        embed.addField(`__\`${combatContext.unitA.name}\`__`, `${unitAHdr}\n${unitABody}`, true)
        embed.addField(`__\`${combatContext.unitB.name}\`__`, `${unitBHdr}\n${unitBBody}`, true)
        embed.addBlankField()

        if (output !== '') {
            embed.addField('Combat', output)
        } else {
            embed.addField(`\`${combatContext.unitA.name}\``, dmgA || 'died', true)
            embed.addField(`\`${combatContext.unitB.name}\``, dmgB || 'died', true)
        }

        //console.log(embed)
        if (!combatContext.message)
            combatContext.message = await channel.send(embed)
        else
            combatContext.message = await combatContext.message.edit(embed)

        return true
    }

    async doOnline() {
        console.log('doOnline')

        // Okay, here we need to iterate through each guild configured guild,
        // check the current game state of that guild
        let settings = await this.gameDb.getSettings()
        settings.guilds.map(async g => {
            let guild = this.discord.guilds.get(g)
            let guildSettings = await this.gameDb.getGuildSettings(guild.id)
            if (!guildSettings) {
                console.log('expected guild not found')
                return
            }

            console.log('guild', g, guildSettings)
            const channel = this.discord.channels.get(guildSettings.game_channel)
            if (!channel) {
                if (guildSettings.game_channel !== '') {
                    console.log('could not get configured channel', guildSettings.game_channel)
                    process.exit(1)
                }
                console.log('skipping unconfigured guild')
                return
            }

            // okay, look for this guilds combat context
            let combatCtx = this.combatContexts.get(guild.id)
            if (combatCtx) {
                console.log('found existing context')
                await this.doCombat(combatCtx)
            } else {
                console.log('no combat context')
                // create ctx
                let online = channel.members
                    .filter(m => m.presence.status === 'online' || m.presence.status === 'idle')
                    .map(m => m.id)

                //console.log('online', online)

                let accounts = await Promise.all(online.map(async m => {
                    //console.log('mapping accounts', g, m)
                    return await this.gameDb.getAccount(g, m)
                }))
                accounts = accounts.filter(a => a !== null)

                // online has been transformed into a list of accounts
                // we need to map accounts to characters now
                accounts = await Promise.all(accounts.map(async a => {
                    //console.log('account', a)
                    let player = await this.gameDb.getUnitByAccount(a.id)
                    return player
                }))
                accounts = accounts.filter(a => a !== null)
                console.log('units', accounts)

                // finally, select players for combat
                let units = await this.getUnitsForCombat(accounts)
                if (!units || units.length !== 2)
                    return false

                let combatContext = new CombatContext(this, guild.id, ...units)
                this.combatContexts.set(guild.id, combatContext)
            }
        })

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
        }

        return false
    }

    async run() {
        console.log('loading settings')
        let settings = await this.gameDb.getSettings()
        if (!settings) {
            console.log('game settings don\'t exist, creating')
            const settingsObj = {
                next_account_id: 1, next_unit_id: 1, next_item_id: 1, guilds: []
            }
            settings = await this.gameDb.createSettings(settingsObj)
            if (!settings) {
                console.log('unable to create game settings')
                process.exit(1)
                return false
            }
        }

/*
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
*/

        // and save the game settings
        await settings.save()

        while (!this.interrupt) {
            await this.sleep(1*5000, async loop => { await this.loop() })
        }

        console.log('run loop terminating')

        await this.destroy()

        console.log('shutdown complete')

        return true
    }
}

const game = new Game(Config)
