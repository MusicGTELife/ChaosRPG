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
const { PlayerType, Player, Mage, Warrior, Rogue } = require('./player')
const { Monster, MonsterType } = require('./monster')

const { Unit: UnitModel } = require('./models')

// utility classes
const { Markdown, TrackedCommand, Command, DiscordUtil } = require('./util/discord')
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

        this.item = new ItemUtil(this)
        this.unit = new UnitUtil(this)
        this.player = new PlayerUtil(this)
        this.monster = new MonsterUtil(this)

        this.interrupt = false
        this.gameState = GameState.OFFLINE

        this.combatContexts = new Map()
        this.trackedCommands = new Map()

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

        this.discord.on('error', e => { this.onError(e) })
        this.discord.on('warn', e => { this.onWarning(e) })
        this.discord.on('debug', e => { this.onDebug(e) })

        this.discord.on('ready', () => { this.onReady() })
        this.discord.on('disconnect', reason => { this.onDiscordDisconnect(reason) })
        this.discord.on('reconnecting', () => { this.onDiscordReconnecting() })
        this.discord.on('resume', () => { this.onDiscordResume() })
        this.discord.on('message', message => { this.onMessage(message) })
        this.discord.on('messageUpdate', (oldMessage, newMessage) => { this.onMessageUpdate(oldMessage, newMessage) })
        this.discord.on('messageReactionAdd', (reaction, user) => { this.onMessageReactionAdd(reaction, user) })
        this.discord.on('messageReactionRemove', (reaction, user) => { this.onMessageReactionRemove(reaction, user) })
        this.discord.on('typingStart', (channel, user) => { this.onTypingStart(channel, user) })

        this.gameDb.db.connection.on('connected', () => { this.onDbConnected() })
        this.gameDb.db.connection.on('disconnect', () => { this.onDbDisconnect() })

        DiscordUtil.setCommandHandler('guild', this, this.guildSettingsHandler)

        DiscordUtil.setCommandHandler('create', this, this.createPlayerHandler)
        DiscordUtil.setCommandHandler('delete', this, this.deletePlayerHandler)
        DiscordUtil.setCommandHandler('player', this, this.playerInfoHandler)
        DiscordUtil.setCommandHandler('gear', this, this.gearHandler)
        DiscordUtil.setCommandHandler('equip', this, this.equipHandler)

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
    }

    syncinit() {
        return new Promise(resolve => this.init())
    }

    timeout(ms) {
        return new Promise(resolve => this.discord.setTimeout(resolve, ms))
    }

    async sleep(ms, fn, ...args) {
        this.timerInterval = this.timeout(ms)
        await this.timerInterval
        return fn(...args)
    }

    onError(m) {
        console.log(`ERR: \`${m}\``)
        process.exit(1)
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

    onDiscordReconnecting() {
        this.discordConnected = false
    }

    onDiscordResume() {
        this.discordConnected = true
    }

    async onReady() {
        console.log('connected to discord')

        this.discordConnected = true

        this.discord.user.setActivity('ChaosRPG', { type: 'PLAYING' })

        await this.broadcastMessage('ChaosRPG is online.')
    }

    async onMessage(message) {
        //console.log(message.content)
        if (message.author.id === this.discord.user.id)
            return

        let command = DiscordUtil.parseCommand(message)
        if (command) {
            console.log(`processing command ${command.name}`)
            await DiscordUtil.processCommand(command)
        }
    }

    async onMessageUpdate(oldMessage, newMessage) {
        if (newMessage.author.id === this.discord.user.id)
            return

        let command = DiscordUtil.parseCommand(newMessage)
        if (command) {
            console.log(`processing command ${command.name}`)
            await DiscordUtil.processCommand(command)
        }
    }

    async onMessageReaction(reaction, user, added) {
        if (user.id === this.discord.user.id)
            return

        let tracked = this.trackedCommands.get(reaction.message.id)
        if (!tracked) {
            return
        }

        if (tracked.command.message.author.id !== user.id) {
            return
        }

        let account = await this.gameDb.getAccount(tracked.command.message.guild.id, tracked.command.message.author.id)
        if (!account)
            return

        let player = await this.gameDb.getUnitByAccount(account.id)
        if (!player)
            return

        //console.log(reaction.emoji)

        if (tracked.command.name === 'gear') {
            tracked.refresh(tracked.timeout)

            if (reaction.emoji.name === '⚔') {
                let embed = await this.createPlayerInventoryEmbed(player, Storage.EQUIPMENT.id)
                this.response = reaction.message.edit(embed)
            } else if (reaction.emoji.name === '💰') {
                let embed = await this.createPlayerInventoryEmbed(player, Storage.INVENTORY.id)
                this.response = reaction.message.edit(embed)
            }
        } else if (tracked.command.name === 'player') {
            if (player.descriptor.stat_points_remaining <= 0)
                return

            tracked.refresh(tracked.timeout)

            let items = await this.unit.getItems(player)
            if (reaction.emoji.name === '💪') {
                await PlayerUtil.applyStatPoints(player, items, StatTable.STR.id, 1)
            } else if (reaction.emoji.name === '⚡') {
                await PlayerUtil.applyStatPoints(player, items, StatTable.DEX.id, 1)
            } else if (reaction.emoji.name === '📚') {
                await PlayerUtil.applyStatPoints(player, items, StatTable.INT.id, 1)
            } else if (reaction.emoji.name === '❤') {
                await PlayerUtil.applyStatPoints(player, items, StatTable.VIT.id, 1)
            }

            let embed = await this.createPlayerStatsEmbed(player)
            embed.setFooter(`Stat has been applied`)
            this.response = reaction.message.edit(embed)
        }
    }

    async onMessageReactionAdd(reaction, user) {
        return await this.onMessageReaction(reaction, user, true)
    }

    async onMessageReactionRemove(reaction, user) {
        return await this.onMessageReaction(reaction, user, false)
    }

    onTypingStart(channel, user) {
        //console.log(`${user.id} typing on ${channel.id}`)
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

                let gameChannel = guild.channels.get(guildSettings.game_channel)
                if (gameChannel && !debugOnly) {
                    await gameChannel.send(message)
                }

                let debugChannel = guild.channels.get(guildSettings.debug_channel)
                if (debugChannel) {
                    await debugChannel.send(message)
            }
        }))
    }

    // discord command handlers

    // administrative handlers

    // lexical this is in the context of CommandHandler
    // TODO break this up into multiple commands, or at least some utility
    // functions to make it easier to deal with all of the cases
    async guildSettingsHandler() {
        console.log('guildSettingsHandler')

        if (this.message.channel.permissionsFor(this.ctx.discord.user).has('MANAGE_MESSAGES'))
            this.message.delete(10000)

        if (this.args.length >= 2) {
            let subCmd = this.args[0]
            let guildName = this.args[1]

            const guild = this.ctx.discord.guilds.find('name', guildName)
            if (!guild) {
                console.log(`I am not in ${guildName}`)
                this.message.channel
                    .send(`<@${this.message.author.id}> I am not in guild ${guildName}`).then(m => m.delete(10000))
                return
            }

            let settings = await this.ctx.gameDb.getSettings()

            if (subCmd === 'add' && this.args.length <= 4) {
                console.log('add', guildName)

                if (settings.guilds.find(g => g.guild === guildName)) {
                    console.log('already exists')
                    this.message.channel
                        .send(`<@${this.message.author.id}> Settings already exist for ${guildName}`).then(m => m.delete(10000))
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
                                .send(`<@${this.message.author.id}> Unable to lookup channel ${gameChannel}`).then(m => m.delete(10000))
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
                                .send(`<@${this.message.author.id}> Unable to lookup channel ${debugChannel}`).then(m => m.delete(10000))
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
                        .send(`<@${this.message.author.id}> Added guild ${guildName}`).then(m => m.delete(10000))
                }

                return
            } else if (subCmd === 'remove') {
                console.log('remove')

                await this.ctx.gameDb.removeGuildSettings(guildName)
                return
            } else if (subCmd === 'debug') {
                if (args.length === 2) {
                    this.message.channel
                        .send(`<@${this.message.author.id}> Added guild ${guildName}`).then(m => m.delete(10000))
                } else {
                }

                return
            } else if (subCmd === 'game') {
                let guildSettings = this.ctx.gameDb.getGuildSettings()
                if (args.length === 2) {
                    this.message.channel
                        .send(`<@${this.message.author.id}> Added guild ${guildName}`).then(m => m.delete(10000))

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
    async createPlayerHandler() {
        console.log('createPlayerHandler')

        if (this.message.channel.permissionsFor(this.ctx.discord.user).has('MANAGE_MESSAGES'))
            this.message.delete(10000)

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
        let existing = await this.ctx.gameDb.getUnitByAccount(account.id)
        if (existing) {
            this.message.channel
                .send(`<@${this.message.author.id}> You already have a player, use the delete command if you wish to create a new player`).then(m => m.delete(10000))
            return
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
                .send(`<@${this.message.author.id}> Invalid player class ${typeString}, valid types are: \`Mage, Warrior, Rogue, Ranger, Cleric\``).then(m => m.delete(10000))
            return
        }

        let itemRngCtx = this.ctx.secureRng.getContext('item')
        let starterItems = PlayerUtil.createStarterItems(itemRngCtx, type)
        if (!starterItems) {
            console.log('unable to create starter items')
            process.exit(1)
        }
        let playerData = PlayerUtil.create(type, 1, account.id, this.message.author.username, starterItems)

        let player = await this.ctx.unit.prepareGeneratedUnit(playerData, settings)
        if (player) {
            this.message.channel
                .send(`<@${this.message.author.id}> Your ${typeString} character has been created`).then(m => m.delete(10000))
        } else {
            this.message.channel
                .send(`<@${this.message.author.id}> Failed to create your ${typeString} character`).then(m => m.delete(10000))
        }
    }

    // lexical this is in the context of CommandHandler
    async deletePlayerHandler() {
        console.log('deletePlayerHandler')

        if (this.message.channel.permissionsFor(this.ctx.discord.user).has('MANAGE_MESSAGES'))
            this.message.delete(10000)

        let accountRecords = await this.ctx.getAccountRecords(
            this.message.guild.id, this.message.author.id
        )

        if (!accountRecords.account) {
           this.message.channel
                .send(`<@${this.message.author.id}> No account found`).then(m => m.delete(10000))
            return
        }
        if (accountRecords.unit) {
            let combatCtx = await this.ctx.combatContexts.get(accountRecords.account.guild)
            if (combatCtx && combatCtx.unitA.type === UnitType.PLAYER.id) {
                if (combatCtx.unitA.descriptor.account === accountRecords.account.id)
                    this.ctx.combatContexts.delete(accountRecords.account.guild)
            }
            if (combatCtx && combatCtx.unitB.type === UnitType.PLAYER.id) {
                if (combatCtx.unitB.descriptor.account === accountRecords.account.id)
                    this.ctx.combatContexts.delete(accountRecords.account.guild)
            }

            await this.ctx.gameDb.removeUnit(accountRecords.unit)
            this.message.channel
                .send(`<@${this.message.author.id}> Your character has been deleted`).then(m => m.delete(10000))
        } else {
            this.message.channel
                .send(`<@${this.message.author.id}> Unable to delete, no character found`).then(m => m.delete(10000))
        }
    }

    // lexical this is in the context of CommandHandler
    async playerInfoHandler() {
        console.log('playerInfoHandler')

        if (this.message && this.message.channel.permissionsFor(this.ctx.discord.user).has('MANAGE_MESSAGES'))
            this.message.delete(10000)

        let accountRecords = await this.ctx.getAccountRecords(
            this.message.guild.id, this.message.author.id
        )

        if (!accountRecords.account) {
           this.message.channel
                .send(`<@${this.message.author.id}> No account found`).then(m => m.delete(10000))
            return
        }
        if (!accountRecords.unit) {
           this.message.channel
                .send(`<@${this.message.author.id}> No character found, use .create to make an account`).then(m => m.delete(10000))
            return
        }

        let player = accountRecords.unit

        let embed = await this.ctx.createPlayerStatsEmbed(player)
        let sent = await this.message.channel.send(embed)
        if (player.descriptor.stat_points_remaining) {
            await sent.react('💪')
            await sent.react('⚡')
            await sent.react('📚')
            await sent.react('❤')
        }

        this.response = sent
        let trackedCommand = new TrackedCommand(this.ctx.trackedCommands, this, 60000)

        this.ctx.trackedCommands.set(sent.id, trackedCommand)
    }

    // lexical this is in the context of CommandHandler
    async gearHandler() {
        console.log('gearHandler')

        if (this.message.channel.permissionsFor(this.ctx.discord.user).has('MANAGE_MESSAGES'))
            this.message.delete(10000)

        let accountRecords = await this.ctx.getAccountRecords(
            this.message.guild.id, this.message.author.id
        )

        if (!accountRecords.account) {
           this.message.channel
                .send(`<@${this.message.author.id}> No account found`).then(m => m.delete(10000))
            return
        }
        if (!accountRecords.unit) {
           this.message.channel
                .send(`<@${this.message.author.id}> No character found`).then(m => m.delete(10000))
            return
        }

        let embed = await this.ctx.createPlayerInventoryEmbed(accountRecords.unit, Storage.EQUIPMENT.id)
        let sent = await this.message.channel.send(embed)
        await sent.react('⚔')
        await sent.react('💰')

        this.response = sent
        let trackedCommand = new TrackedCommand(this.ctx.trackedCommands, this, 60000)

        this.ctx.trackedCommands.set(sent.id, trackedCommand)
    }

    async equipHandler() {
        console.log('equipHandler')

        if (this.message.channel.permissionsFor(this.ctx.discord.user).has('MANAGE_MESSAGES'))
            this.message.delete(10000)

        let accountRecords = await this.ctx.getAccountRecords(
            this.message.guild.id, this.message.author.id
        )

        if (!accountRecords.account) {
           this.message.channel
                .send(`<@${this.message.author.id}> No account found`).then(m => m.delete(10000))
            return
        }
        if (!accountRecords.unit) {
           this.message.channel
                .send(`<@${this.message.author.id}> No character found`).then(m => m.delete(10000))
            return
        }
        const player = accountRecords.unit

        if (this.args.length === 0) {
            let slotNames = Object.values(Storage).map(s => {
                return s.descriptor.map(d => d.name)
            })

            let pos = 0
            let slotString = ''
            slotNames.map(s => {
                slotString += s
                if (pos != slotNames.length-1)
                    slotString += ', '
                else
                    slotString += '.'
                pos++
            })

            this.message.channel
                .send(`<@${this.message.author.id}> Valid slots are ${slotString}`).then(m => m.delete(10000))
        } else {
            if (this.args.length !== 2) {
                console.log('bad args', this.args)
                return
            }

            let slotSrc = this.args[0].toLowerCase()
            let slotDest = this.args[1].toLowerCase()

            // okay, we are dealing with valid slot names, but we need to turn
            // them into slot descriptors
            let srcDesc = null
            let destDesc = null

            Object.values(Storage).map(n => {
                let src = n.descriptor.find(d => d.name.toLowerCase() === slotSrc)
                if (src && !srcDesc)
                    srcDesc = { node: n.id, slot: src.id }

                let dest = n.descriptor.find(d => d.name.toLowerCase() === slotDest)
                if (dest && !destDesc)
                    destDesc = { node: n.id, slot: dest.id }
            })

            // now it's time to check the slots
            // first check if the source slot contains an item
            if (!srcDesc) {
                console.log('no source item descriptor')
                this.message.channel
                    .send(`<@${this.message.author.id}> ${slotSrc} is not a valid slot`).then(m => m.delete(10000))
                return
            }

            if (!destDesc && slotDest !== 'ground') {
                console.log('no dest item descriptor')
                this.message.channel
                    .send(`<@${this.message.author.id}> ${slotDest} is not a valid slot`).then(m => m.delete(10000))
                return
            }

            // then check if the destination slot is empty and can contain the
            // source item
            let srcItemId = StorageUtil.getSlot(player.storage, srcDesc.node, srcDesc.slot)
            if (!srcItemId) {
                console.log(player.storage, srcDesc)
                this.message.channel
                    .send(`<@${this.message.author.id}> ${slotSrc} contains no item`).then(m => m.delete(10000))
                return
            }

            let destItemId = 0
            if (slotDest !== 'ground') {
                destItemId = StorageUtil.getSlot(player.storage, destDesc.node, destDesc.slot)

                if (destItemId) {
                    this.message.channel
                        .send(`<@${this.message.author.id}> ${slotDest} already contains an item, move it first`).then(m => m.delete(10000))
                    return
                }
            }

            let items = await this.ctx.unit.getItems(player)
            let item = items.find(i => i.id === srcItemId)
            if (!item) {
                console.log(srcItemId, player.storage)
                console.log('failed looking up src item')
                process.exit(1)
            }

            if (slotDest === 'ground') {
                if (!this.ctx.unit.unequipItem(player, items, item, srcDesc.node, srcDesc.slot)) {
                    this.message.channel
                        .send(`<@${this.message.author.id}> ${slotDest} failed unequipping item`).then(m => m.delete(10000))
                    return
                }

                item.owner = 0
                await item.remove()
                this.message.channel
                    .send(`<@${this.message.author.id}> ${slotDest} item has been dropped`).then(m => m.delete(10000))

            } else {
                if (!UnitUtil.isItemEquippableInSlot(player, items, item, destDesc.node, destDesc.slot)) {
                    this.message.channel
                        .send(`<@${this.message.author.id}> Unable to equip item in slot due to wielding restrictions ${slotDest}`).then(m => m.delete(10000))
                    return
                }

                if (!this.ctx.unit.unequipItem(player, items, item, srcDesc.node, srcDesc.slot)) {
                    this.message.channel
                        .send(`<@${this.message.author.id}> ${slotDest} failed unequipping item`).then(m => m.delete(10000))
                    return
                }

                if (!this.ctx.unit.equipItem(player, items, item, destDesc.node, destDesc.slot)) {
                    this.message.channel
                        .send(`<@${this.message.author.id}> ${slotDest} failed equipping item`).then(m => m.delete(10000))
                    return
                }

                this.message.channel
                    .send(`<@${this.message.author.id}> ${slotDest} item has been equipped`).then(m => m.delete(10000))
            }
            items = await this.ctx.player.getItems(player)

            await UnitUtil.computeBaseStats(player, items)
            player.markModified('stats')
            player.markModified('storage')
            await player.save()
        }
    }

    async getAccountRecords(guildId, discordUserId) {
        let records = { account: null, unit: null }

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
                    entry.requirements.map(s => {
                        const entry = StatUtil.getStatTableEntry(s.id)
                        desc += `${s.value} ${entry.name_long}\n`
                    })
                } else {
                    item.stats.map(s => {
                        const entry = StatUtil.getStatTableEntry(s.id)
                        desc += `(+${s.value}) ${entry.name_long}\n`
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

        //console.log(embed)
        return embed
    }

    async createPlayerStatsEmbed(unit) {
        let str = StatUtil.getStat(unit.stats, StatTable.STR.id).value
        let dex = StatUtil.getStat(unit.stats, StatTable.DEX.id).value
        let int = StatUtil.getStat(unit.stats, StatTable.INT.id).value
        let vit = StatUtil.getStat(unit.stats, StatTable.VIT.id).value

        let embed = new Discord.RichEmbed().setColor(7682618)
            .addField(`\`*${unit.name}\`*`, `**${unit.descriptor.stat_points_remaining}** stat points are available`, true)

        let statsBody = this.unitInfoStatsBody(unit, true)
        embed.addField('Character Stats', statsBody)

        //console.log(embed)
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
                `${getExperienceForLevel(unit.level+1)})\n\n`
        } else {
            unitInfo += '\n\n'
        }

        unitInfo += `HP (${SU.getStat(unit.stats, ST.UNIT_HP.id).value}/` +
            `${SU.getStat(unit.stats, ST.UNIT_HP_MAX.id).value})\n` +
            `${showEmoji ? '💪 ' : ''}Str(${str}) ${showEmoji ? '⚡ ' : ''}Dex(${dex}) ${showEmoji ? '📚 ' : ''}Int(${int}) ${showEmoji ? '❤ ' : ''}Vit(${vit})\n` +
            `Atk(${SU.getStat(unit.stats, ST.UNIT_BASE_ATK.id).value}+${SU.getStat(unit.stats, ST.UNIT_ATK.id).value})` +
            ` MAtk(${SU.getStat(unit.stats, ST.UNIT_BASE_MATK.id).value}+${SU.getStat(unit.stats, ST.UNIT_MATK.id).value})\n` +
            `Def(${SU.getStat(unit.stats, ST.UNIT_DEF.id).value}) MDef(${SU.getStat(unit.stats, ST.UNIT_MDEF.id).value})\n` +
            `Acc(${SU.getStat(unit.stats, ST.UNIT_ACCURACY.id).value/100}%) ` +
            `Rct(${SU.getStat(unit.stats, ST.UNIT_REACTION.id).value})\n` +
            `Block(${SU.getStat(unit.stats, ST.UNIT_BLOCK.id).value}%)`

        return unitInfo
    }

    createCombatInfoEmbed(unitA, unitB) {
        let unitAName = unitA.name
        let unitBName = unitB.name

        if (unitA.type === UnitType.PLAYER.id) {
            let className = PlayerUtil.getClass(unitA)
            unitAName += ` ${className}`
        }

        if (unitB.type === UnitType.PLAYER.id) {
            let className = PlayerUtil.getClass(unitB)
            unitBName += ` ${className}`
        }

        let embed = new Discord.RichEmbed()
            .setColor(7682618)//.setDescription(`\`${unitAName}\` VS. \`${unitBName}\``)

        embed.addField(`__\`${unitAName}\`__`, this.unitInfoStatsBody(unitA), true)
        embed.addField(`__\`${unitBName}\`__`, this.unitInfoStatsBody(unitB), true)
        embed.addBlankField()

        return embed
    }

    async doOffline() {
        console.log('doOffline')

        return true
    }

    // FIXME push anything not related to discord into combat module
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

        results.map(r => {
            const atkName = `${UnitUtil.getName(r.attacker)}`
            const defName = `${UnitUtil.getName(r.defender)}`

            if (r.type === CombatEventType.PLAYER_DAMAGE.id ||
                    r.type === CombatEventType.MONSTER_DAMAGE.id) {
                let dmg = r.data.getDamage()
                let total = dmg.physical.damage + dmg.magic.damage

                let out = `took ${total} ` +
                    `(${dmg.physical.damage}${dmg.physical.is_crit ? '*' : ''}` +
                    `|${dmg.magic.damage}${dmg.magic.is_crit ? '*' : ''})\n`

                if (r.attacker.id === combatContext.unitA.id) {
                    dmgB += out
                } else {
                    dmgA += out
                }
            }

            if (r.type === CombatEventType.BLOCK.id) {
                if (r.attacker.id === combatContext.unitA.id)
                    dmgB += 'blocked'
                else
                    dmgA += 'blocked'
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

            if (r.type === CombatEventType.MONSTER_ITEM_DROP.id) {
                let itemEntry = ItemUtil.getItemTableEntry(r.data.code)
                output += `${defName} has dropped their ${itemEntry.name}.`
            }
        })

        let desc = ''
        if (output !== '')
            Markdown.c(output, "ml")

        let embed = this.createCombatInfoEmbed(combatContext.unitA, combatContext.unitB)
        if (output !== '') {
            embed.addField('Combat', output)
        } else {
            embed.addField(`\`${combatContext.unitA.name}\``, dmgA, true)
            embed.addField(`\`${combatContext.unitB.name}\``, dmgB, true)
        }

        await combatContext.message.edit(embed)

        return true
    }

    async doOnline() {
        console.log('doOnline')

        // Okay, here we need to iterate through each guild configured guild,
        // check the current game state of that guild
        let settings = await this.gameDb.getSettings()
        await Promise.all(settings.guilds.map(async g => {
            console.log(g)
            let guild = await this.discord.guilds.get(g)
            let guildSettings = await this.gameDb.getGuildSettings(guild.id)
            if (!guildSettings) {
                console.log('expected guild not found')
                return
            }

            //console.log('guild', g, guildSettings)
            const channel = await this.discord.channels.get(guildSettings.game_channel)
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
            if (!combatCtx) {
                combatCtx = new CombatContext(this, guild.id)
                this.combatContexts.set(guild.id, combatCtx)
            }

            if (!combatCtx.inCombat) {
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
                    return await this.gameDb.getUnitByAccount(a.id)
                }))
                accounts = accounts.filter(a => a !== null)

                // finally, select players for combat
                let units = await combatCtx.getUnitsForCombat(accounts)
                if (!units || units.length !== 2)
                    return false

                let embed = this.createCombatInfoEmbed(units[0], units[1])
                combatCtx.message = await channel.send(embed)
                combatCtx.unitA = units[0]
                combatCtx.unitB = units[1]
                combatCtx.inCombat = true
                return true
            }

            return this.doCombat(combatCtx)
        }))

        return true
    }

    async loop() {
        if (!this.dbConnected) {
            this.gameState = GameState.OFFLINE
            console.log('not connected to the database, skipping combat');
        }

        if (!this.discordConnected) {
            this.gameState = GameState.OFFLINE
            console.log('discord is not connected, skipping combat')
        }

        if (this.gameState === GameState.OFFLINE &&
                this.dbConnected && this.discordConnected) {
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

        while (true) {
            if (this.interrupt && this.dbConnected && this.discordConnected) {
                let activeCombat = [...this.combatContexts.values()]
                    .every(c => {
                        return c.inCombat
                    })

                if (!activeCombat)
                    break
            }
            await this.sleep(1*10000, async loop => { await this.loop() })
        }

        console.log('run loop terminating')

        await this.destroy()

        console.log('shutdown complete')

        return true
    }
}

const game = new Game(Config)
game.syncinit()
