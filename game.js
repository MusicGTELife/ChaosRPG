const Config = require('./config.json')

const Discord = require('discord.js')

const { GameDb } = require('./db')
const { SecureRNG, SecureRNGContext } = require('./rng')
const { GameState } = require('./gamestate')
const { CombatContext, CombatEventType } = require('./combat')
const { Storage } = require('./storage')
const { StatTable } = require('./stattable')
const { GameCommands } = require('./gamecommands')
const { getExperienceForLevel } = require('./experience') // TODO|FIXME move to unit

const { UnitType } = require('./unit')

// utility classes
const { Markdown, CommandHandler } = require('./util/discord')
const { StorageUtil } = require('./util/storage')
const { StatUtil } = require('./util/stats')
const { ItemUtil } = require('./util/item')
const { UnitUtil } = require('./util/unit')
const { PlayerUtil } = require('./util/player')
const { MonsterUtil } = require('./util/monster')

const DebugLevel = { }
DebugLevel.NONE = 0x00
DebugLevel.INFO = 0x01
DebugLevel.WARN = 0x02

// TODO move base application parts to their own module
class Game {
    constructor(config) {
        this.token = config.token || ''

        this.debugLevel = config.debug_level || DebugLevel.NONE

        this.discordConnected = false
        this.dbConnected = false

        this.secureRng = new SecureRNG()
        this.discord = new Discord.Client()
        this.md = new Markdown()

        let db = config.db[config.db.active]
        if (!db)
            throw new Error('Invalid database configuration')

        this.gameDb = new GameDb(db.host, db.options)
        this.commandHandler = new CommandHandler(this, GameCommands)

        this.item = new ItemUtil(this)
        this.unit = new UnitUtil(this)
        this.player = new PlayerUtil(this)
        this.monster = new MonsterUtil(this)

        this.interrupt = false
        this.gameState = GameState.OFFLINE

        this.combatContexts = new Map()

        this.timerInterval = null
    }

    async destroy() {
        console.log('connections', this.discordConnected, this.dbConnected)

        if (this.discordConnected) {
            await this.broadcastMessage('ChaosRPG is shutting down.')
            await this.discord.destroy()
            this.discordConnected = false
        }

        if (this.dbConnected) {
            await this.gameDb.disconnect()
            this.dbConnected = false
        }
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

        this.discord.on('error', e => { Game.onError(e) })
        this.discord.on('warn', e => { Game.onWarning(e) })
        this.discord.on('debug', e => { Game.onDebug(e) })

        this.discord.on('ready', () => { this.onReady() })
        this.discord.on('disconnect', reason => { this.onDiscordDisconnect(reason) })
        this.discord.on('reconnecting', () => { this.onDiscordReconnecting() })
        this.discord.on('resume', () => { this.onDiscordResume() })
        this.discord.on('message', message => { this.onMessage(message) })
        this.discord.on('messageUpdate', (oldMessage, newMessage) => { this.onMessageUpdate(oldMessage, newMessage) })
        this.discord.on('messageReactionAdd', (reaction, user) => { this.onMessageReactionAdd(reaction, user) })
        this.discord.on('messageReactionRemove', (reaction, user) => { this.onMessageReactionRemove(reaction, user) })

        this.gameDb.db.connection.on('connected', () => { this.onDbConnected() })
        this.gameDb.db.connection.on('disconnect', () => { this.onDbDisconnect() })

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

        return res
    }

    syncinit() {
        return new Promise(() => this.init())
    }

    timeout(ms) {
        return new Promise(resolve => this.discord.setTimeout(resolve, ms))
    }

    async sleep(ms, fn, ...args) {
        this.timerInterval = this.timeout(ms)
        await this.timerInterval

        return fn(...args)
    }

    static onError(m) {
        console.log(`ERR: \`${m}\``)
        process.exit(1)
    }

    static onWarning(m) {
        console.warn(`WARN: \`${m}\``)
    }

    static onDebug(m) {
        console.log(`DEBUG: \`${m}\``)
    }

    onDiscordDisconnect(reason) {
        this.discordConnected = false
        console.log(`DEBUG: disconnected ${reason.reason} (${reason.code})`)
    }

    onDiscordReconnecting() {
        this.discordConnected = false
    }

    onDiscordResume() {
        this.discordConnected = true
    }

    onReady() {
        console.log('connected to discord')

        this.discordConnected = true
        this.discord.user.setActivity('ChaosRPG', { 'type': 'PLAYING' })
        this.broadcastMessage('ChaosRPG is online.')
    }

    onMessage(message) {
        if (message.author.id === this.discord.user.id)
            return

        let command = this.commandHandler.parseCommand(message)
        if (command) {
            let tracked = [ ...this.commandHandler.trackedCommands.values() ]
            tracked = tracked.find(t => t.message.author.id === message.author.id)
            if (tracked && tracked.name === command.name) {
                console.log('tracked command exists')
                message.delete(10000)

                return
            }

            console.log(`processing command ${command.name}`)
            command.run()
        }
    }

    onMessageUpdate(oldMessage, newMessage) {
        if (newMessage.author.id === this.discord.user.id)
            return

        let command = this.commandHandler.parseCommand(newMessage)
        if (command) {
            let tracked = [ ...this.commandHandler.trackedCommands.values() ]
            tracked = tracked.find(t => t.message.author.id === newMessage.author.id)
            if (tracked && tracked.name === command.name) {
                console.log('tracked command exists')
                message.delete(10000)

                return
            }

            console.log(`processing command ${command.name}`)
            command.run()
        }
    }

    /* eslint no-unused-vars: [ "error", { "argsIgnorePattern": "^_" } ] */
    async onMessageReaction(reaction, user, _added) {
        if (user.id === this.discord.user.id)
            return

        let tracked = this.commandHandler.trackedCommands.get(reaction.message.id)
        if (!tracked) {
            console.log('untracked reaction')

            return
        }
        if (tracked.message.author.id !== user.id) {
            console.log('user is not initiator')

            return
        }

        let account = await this.gameDb.getAccount(
            reaction.message.guild.id, user.id
        )
        if (!account) {
            console.log('no account')

            return
        }
        // console.log(reaction.emoji)

        tracked.onReaction(tracked, account, reaction)
    }

    onMessageReactionAdd(reaction, user) {
        this.onMessageReaction(reaction, user, true)
    }

    onMessageReactionRemove(reaction, user) {
        this.onMessageReaction(reaction, user, false)
    }

    onDbConnected() {
        this.dbConnected = true
    }

    onDbDisconnect() {
        this.dbConnected = false
    }

    async broadcastMessage(message, debugOnly = false) {
        if (!this.discordConnected)
            return

        if (!this.dbConnected)
            return

        let settings = await this.gameDb.getSettings()
        await Promise.all(settings.guilds.map(async g => {
            let guild = await this.discord.guilds.get(g)
            if (!guild) {
                console.log('no guild record', g)
                process.exit(1)

                return
            }

            let guildSettings = await this.gameDb.getGuildSettings(guild.id)
            if (!guildSettings)
                return

            let gameChannel = guild.channels.get(guildSettings.game_channel)
            if (gameChannel && !debugOnly)
                gameChannel.send(message)

            let debugChannel = guild.channels.get(guildSettings.debug_channel)
            if (debugChannel)
                debugChannel.send(message)
        }))
    }

    makeSlotNamesString(slotNames) {
        let pos = 0
        let slotString = ''
        slotNames.map(s => {
            slotString += s
            if (pos !== slotNames.length - 1)
                slotString += ', '
            else
                slotString += '.'
            pos++
        })

        return slotString
    }

    async getAccountRecords(guildId, discordUserId) {
        let records = { 'account': null, 'unit': null }

        records.account = await this.gameDb.getAccount(guildId, discordUserId)
        if (records.account)
            records.unit = await this.gameDb.getUnitByAccount(records.account.id)

        return records
    }

    async createPlayerInventoryEmbed(unit, node) {
        let items = await this.unit.getItems(unit)
        let sNode = unit.storage.find(sn => sn.id === node)
        let slotIdx = 0

        let embed = new Discord.RichEmbed()
            .setColor(7682618)

        embed.addField(`\`${unit.name}\``, `📦 ${StorageUtil.getNodeName(node)}`)

        sNode.buffer.map(s => {
            let item = items.find(i => i.id === s)
            let name = 'Empty'
            let desc = ''
            if (item) {
                const rarity = ItemUtil.getItemRarityEntry(item.rarity)
                name = `${rarity.name} ${ItemUtil.getName(item.code)} [T:${item.tier}]`
                if (!UnitUtil.itemRequirementsAreMet(unit, item)) {
                    name += '🛑'
                    desc += 'Stat requirements not met, item requires:\n'
                    const entry = ItemUtil.getItemTableEntry(item.code)
                    entry.requirements.map(r => {
                        const statEntry = StatUtil.getStatTableEntry(r.id)
                        desc += `${r.value} ${statEntry.name_long}\n`
                    })
                } else {
                    item.stats.map(st => {
                        const entry = StatUtil.getStatTableEntry(st.id)
                        desc += `(+${st.value}) ${entry.name_long}\n`
                    })
                    if (desc === '')
                        desc = 'No stats'
                }
                desc = Markdown.c(desc, 'prolog')

                const nodeEntry = sNode.id === Storage.EQUIPMENT.id ? Storage.EQUIPMENT : Storage.INVENTORY
                const slotName = nodeEntry.descriptor[slotIdx].name
                embed.addField(`*${slotName}* **\`${name}\`**`, `${desc}`)
            }

            slotIdx++
        })

        // console.log(embed)
        return embed
    }

    createPlayerStatsEmbed(unit) {
        const statsBody = this.unitInfoStatsBody(unit, true)
        let embed = new Discord.RichEmbed().setColor(7682618)
            .addField('Character Stats', `*\`${unit.name}\`*\n${statsBody}`)

        if (unit.descriptor.stat_points_remaining)
            embed.addField(`Remaining`, `**${unit.descriptor.stat_points_remaining}** stat points are available`, true)

        // console.log(embed)
        return embed
    }

    unitInfoStatsBody(unit, showEmoji = false) {
        if (!unit)
            return ''

        const ST = StatTable
        const SU = StatUtil

        const str = SU.getStat(unit.stats, ST.UNIT_STR.id).value
        const dex = SU.getStat(unit.stats, ST.UNIT_DEX.id).value
        const int = SU.getStat(unit.stats, ST.UNIT_INT.id).value
        const vit = SU.getStat(unit.stats, ST.UNIT_VIT.id).value

        const isPlayer = unit.type === UnitType.PLAYER.id

        let unitInfo = ''

        if (!isPlayer) {
            const monsterRarity = MonsterUtil.getMonsterRarityEntry(unit.descriptor.rarity)
            unitInfo += `${monsterRarity.name} `
        }
        unitInfo += `Level ${unit.level}\n`
        if (isPlayer) {
            unitInfo += `Exp(${SU.getStat(unit.stats, ST.UNIT_EXP.id).value}/` +
                `${getExperienceForLevel(unit.level + 1)})\n\n`
        } else {
            unitInfo += '\n\n'
        }

        unitInfo += `HP (${SU.getStat(unit.stats, ST.UNIT_HP.id).value}/` +
            `${SU.getStat(unit.stats, ST.UNIT_HP_MAX.id).value})\n` +
            `${showEmoji ? '<:str:416835539166035968> ' : ''}Str(${str}) ${showEmoji ? '<:dex:416835539237470208> ' : ''}Dex(${dex}) ${showEmoji ? '<:int:416835539157909504> ' : ''}Int(${int}) ${showEmoji ? '<:vit:416835538901794827> ' : ''}Vit(${vit})\n` +
            `Atk(${SU.getStat(unit.stats, ST.UNIT_BASE_ATK.id).value}+${SU.getStat(unit.stats, ST.UNIT_ATK.id).value})` +
            ` MAtk(${SU.getStat(unit.stats, ST.UNIT_BASE_MATK.id).value}+${SU.getStat(unit.stats, ST.UNIT_MATK.id).value})\n` +
            `Def(${SU.getStat(unit.stats, ST.UNIT_DEF.id).value}) MDef(${SU.getStat(unit.stats, ST.UNIT_MDEF.id).value})\n` +
            `Acc(${SU.getStat(unit.stats, ST.UNIT_ACCURACY.id).value / 100}%) ` +
            `Rct(${SU.getStat(unit.stats, ST.UNIT_REACTION.id).value})\n` +
            `Block(${SU.getStat(unit.stats, ST.UNIT_BLOCK.id).value}%)`

        return unitInfo
    }

    createCombatInfoEmbed(unitA, unitB, dmgA, dmgB, output, isPreCombat) {
        let unitAName = unitA.name
        let unitBName = unitB.name
        let unitAClass = 'Monster'
        let unitBClass = 'Monster'

        if (unitA.type === UnitType.PLAYER.id)
            unitAClass = PlayerUtil.getClass(unitA)

        if (unitB.type === UnitType.PLAYER.id)
            unitBClass = PlayerUtil.getClass(unitB)

        let embed = new Discord.RichEmbed()
            .setColor(7682618)

        if (output === '')
            embed.setDescription(`\`\`\`ml\n${unitAName} ${unitAClass} and ${unitBName} ${unitBClass} have been selected for combat.\`\`\``)

        if (isPreCombat) {
            embed.addField('Stats', this.unitInfoStatsBody(unitA), true)
            embed.addField('Stats', this.unitInfoStatsBody(unitB), true)
        } else {
            let statsA = this.unitInfoStatsBody(unitA)
            let statsB = this.unitInfoStatsBody(unitB)
            if (dmgA !== '')
                statsA += `\n\n${dmgA}`
            if (dmgB !== '')
                statsB += `\n\n${dmgB}`

            embed.addField(`\`${unitAName}\``, statsA, true)
            embed.addField(`\`${unitBName}\``, statsB, true)
            if (output !== '') {
                embed.addBlankField()
                embed.addField('Combat result', output)
            }
        }

        return embed
    }

    async updateGuildRngState(guildSettings, combatRngCtx, monsterRngCtx, itemRngCtx) {
        if (!guildSettings) {
            process.exit(1)

            return
        }

        if (combatRngCtx) {
            guildSettings.combat_rng_state.rng_secret = combatRngCtx.secret
            guildSettings.combat_rng_state.rng_counter = combatRngCtx.counter
            guildSettings.combat_rng_state.rng_offset = combatRngCtx.currentOffset
        }

        if (monsterRngCtx) {
            guildSettings.monster_rng_state.rng_secret = monsterRngCtx.secret
            guildSettings.monster_rng_state.rng_counter = monsterRngCtx.counter
            guildSettings.monster_rng_state.rng_offset = monsterRngCtx.currentOffset
        }

        if (itemRngCtx) {
            guildSettings.item_rng_state.rng_secret = itemRngCtx.secret
            guildSettings.item_rng_state.rng_counter = itemRngCtx.counter
            guildSettings.item_rng_state.rng_offset = itemRngCtx.currentOffset
        }

        // console.log('gsettings', guildSettings)
        await guildSettings.save()
    }

    async printCombatEvents(combatContext, results) {
        let output = ''
        let dmgA = ''
        let dmgB = ''

        results.filter(r => r.type === CombatEventType.PLAYER_DAMAGE.id ||
                r.type === CombatEventType.MONSTER_DAMAGE.id ||
                r.type === CombatEventType.BLOCK.id)
            .map(r => {
                if (r.type === CombatEventType.PLAYER_DAMAGE.id ||
                    r.type === CombatEventType.MONSTER_DAMAGE.id) {
                    let dmg = r.data.getDamage()
                    let total = dmg.physical.damage + dmg.magic.damage

                    let physString = dmg.physical.damage.toString()
                    const physCrit = dmg.physical.is_crit
                    if (physCrit)
                        physString = `**${physString}**`

                    let magicString = dmg.magic.damage.toString()
                    const magicCrit = dmg.magic.is_crit
                    if (magicCrit)
                        magicString = `**${magicString}**`

                    let out = `took ${total} (${physString}:${magicString})\n`

                    if (r.attacker.id === combatContext.unitA.id)
                        dmgB += out
                    else
                        dmgA += out
                }

                if (r.type === CombatEventType.BLOCK.id) {
                    if (r.attacker.id === combatContext.unitA.id)
                        dmgB += 'blocked'
                    else
                        dmgA += 'blocked'
                }
            })

        let deathResults = results.filter(r => r.type === CombatEventType.PLAYER_DEATH.id ||
                r.type === CombatEventType.MONSTER_DEATH.id ||
                r.type === CombatEventType.PLAYER_EXPERIENCE.id ||
                r.type === CombatEventType.PLAYER_LEVEL.id ||
                r.type === CombatEventType.MONSTER_ITEM_DROP.id)

        const eventCount = deathResults.length
        let idx = 0
        deathResults.map(r => {
            const atkName = `${UnitUtil.getName(r.attacker)}`
            const defName = `${UnitUtil.getName(r.defender)}`

            if (idx > 0 && idx < eventCount)
                output += ' '

            if (r.type === CombatEventType.PLAYER_DEATH.id ||
                    r.type === CombatEventType.MONSTER_DEATH.id)
                output += `**\`${atkName}\`** has slain **\`${defName}\`**.`

            if (r.type === CombatEventType.PLAYER_EXPERIENCE.id)
                output += `**\`${atkName}\`** has gained **${r.data}** experience.`

            if (r.type === CombatEventType.PLAYER_LEVEL.id)
                output += `**\`${atkName}\`** has reached level **${r.attacker.level}**!`

            if (r.type === CombatEventType.MONSTER_ITEM_DROP.id) {
                let itemEntry = ItemUtil.getItemTableEntry(r.data.code)
                output += `**\`${defName}\`** has dropped their **${itemEntry.name}**.`
            }

            idx++
        })

        if (output !== '')
            output = Markdown.c(output, 'ml')

        let embed = this.createCombatInfoEmbed(combatContext.unitA, combatContext.unitB, dmgA, dmgB, output)
        combatContext.message.edit(embed)
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

        this.printCombatEvents(combatContext, results)

        return true
    }

    doOffline() {
        console.log('doOffline')

        return true
    }

    async doOnline() {
        console.log('doOnline')

        // Okay, here we need to iterate through each guild configured guild,
        // check the current game state of that guild
        let settings = await this.gameDb.getSettings()
        await Promise.all(settings.guilds.map(async g => {
            let guild = await this.discord.guilds.get(g)
            let guildSettings = await this.gameDb.getGuildSettings(guild.id)
            if (!guildSettings)
                return

            // console.log('guild', g, guildSettings)
            const channel = await this.discord.channels.get(guildSettings.game_channel)
            if (guildSettings && guildSettings.game_channel !== '' && !channel) {
                console.log('could not get configured channel', guildSettings)
                process.exit(1)

                return
            }

            let combatRngCtx = this.secureRng.getContext(`${guildSettings.guild}-combat_rng`)
            if (!combatRngCtx) {
                combatRngCtx = new SecureRNGContext(
                    guildSettings.combat_rng_state.rng_secret,
                    guildSettings.combat_rng_state.rng_counter,
                    guildSettings.combat_rng_state.rng_offset
                )
                if (!this.secureRng.addContext(combatRngCtx, `${guildSettings.guild}-combat_rng`)) {
                    console.log('unable to add combat RNG context')

                    return
                }
            }

            let itemRngCtx = this.secureRng.getContext(`${guildSettings.guild}-item_rng`)
            if (!itemRngCtx) {
                itemRngCtx = new SecureRNGContext(
                    guildSettings.item_rng_state.rng_secret,
                    guildSettings.item_rng_state.rng_counter,
                    guildSettings.item_rng_state.rng_offset
                )
                if (!this.secureRng.addContext(itemRngCtx, `${guildSettings.guild}-item_rng`)) {
                    console.log('unable to add item RNG context')

                    return
                }
            }

            let monsterRngCtx = this.secureRng.getContext(`${guildSettings.guild}-monster_rng`)
            if (!monsterRngCtx) {
                monsterRngCtx = new SecureRNGContext(
                    guildSettings.monster_rng_state.rng_secret,
                    guildSettings.monster_rng_state.rng_counter,
                    guildSettings.monster_rng_state.rng_offset
                )
                if (!this.secureRng.addContext(monsterRngCtx, `${guildSettings.guild}-monster_rng`)) {
                    console.log('unable to add monster RNG context')

                    return
                }
            }

            // okay, look for this guilds combat context
            let combatCtx = this.combatContexts.get(guild.id)
            if (!combatCtx) {
                combatCtx = new CombatContext(this, guild.id, combatRngCtx, itemRngCtx, monsterRngCtx)
                this.combatContexts.set(guild.id, combatCtx)
            }

            if (!combatCtx.inCombat) {
                let online = channel.members
                    .filter(m => m.presence.status === 'online' || m.presence.status === 'idle')
                    .map(m => m.id)
                // console.log('online', online)

                let accounts = await Promise.all(online.map(async m => {
                    // console.log('mapping accounts', g, m)

                    return await this.gameDb.getAccount(g, m)
                }))
                accounts = accounts.filter(a => a !== null)

                // online has been transformed into a list of accounts
                // we need to map accounts to characters now
                accounts = await Promise.all(accounts.map(async a => {
                    // console.log('account', a)
                    return await this.gameDb.getUnitByAccount(a.id)
                }))
                accounts = accounts.filter(a => a !== null)

                // finally, select players for combat
                let units = await combatCtx.getUnitsForCombat(accounts)
                if (!units || units.length !== 2)
                    return false

                let embed = this.createCombatInfoEmbed(units[0], units[1], '', '', '', true)

                combatCtx.message = await channel.send(embed)
                combatCtx.unitA = units[0]
                combatCtx.unitB = units[1]
                combatCtx.inCombat = true
            }

            await this.updateGuildRngState(guildSettings, combatRngCtx, monsterRngCtx, itemRngCtx)

            return this.doCombat(combatCtx)
        }))

        return true
    }

    async loop() {
        if (!this.dbConnected) {
            this.gameState = GameState.OFFLINE
            console.log('not connected to the database, skipping combat')
        }

        if (!this.discordConnected) {
            this.gameState = GameState.OFFLINE
            console.log('discord is not connected, skipping combat')
        }

        if (this.gameState === GameState.OFFLINE &&
                this.dbConnected && this.discordConnected)
            this.gameState = GameState.ONLINE

        switch (this.gameState) {
            case GameState.ONLINE:
                return await this.doOnline()

            case GameState.OFFLINE:
                return await this.doOffline()
            default:
                break
        }

        return false
    }

    async run() {
        console.log('loading settings')
        let settings = await this.gameDb.getSettings()
        if (!settings) {
            console.log('game settings don\'t exist, creating')
            const settingsObj = {
                'next_account_id': 1, 'next_unit_id': 1, 'next_item_id': 1, 'guilds': []
            }
            settings = await this.gameDb.createSettings(settingsObj)
            if (!settings) {
                console.log('unable to create game settings')
                process.exit(1)

                return false
            }
        }

        /* eslint no-constant-condition: ["error", { "checkLoops": false }] */
        while (true) {
            if (this.interrupt && this.dbConnected && this.discordConnected) {
                let activeCombat = [ ...this.combatContexts.values() ]
                    .every(c => {
                        return c.inCombat
                    })

                if (!activeCombat)
                    break
            }
            await this.sleep(1 * 6000, async () => { await this.loop() })
        }

        console.log('run loop terminating')

        await this.destroy()

        console.log('shutdown complete')

        return true
    }
}

const game = new Game(Config)
game.syncinit()
