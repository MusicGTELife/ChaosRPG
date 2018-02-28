const Config = require('./config.json')

const Discord = require('discord.js')

const { Guild } = require('./guild')

const { GameDb } = require('./db')
const { SecureRNG, SecureRNGContext } = require('./rng')
const { GameState } = require('./gamestate')
const { CombatContext, CombatEventType } = require('./combat')
const { Storage } = require('./storage')
const { StatTable } = require('./stattable')

const { getExperienceForLevel } = require('./experience')

const { UnitType } = require('./unit')

// const { 'Unit': UnitModel } = require('./models')

// utility classes
const { Markdown, TrackedCommand, DiscordUtil } = require('./util/discord')
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

        this.gameDb.db.connection.on('connected', () => { this.onDbConnected() })
        this.gameDb.db.connection.on('disconnect', () => { this.onDbDisconnect() })

        DiscordUtil.setCommandHandler('guild', this, this.guildSettingsHandler)

        DiscordUtil.setCommandHandler('create', this, this.createPlayerHandler)
        DiscordUtil.setCommandHandler('delete', this, this.deletePlayerHandler)
        DiscordUtil.setCommandHandler('player', this, this.playerInfoHandler)
        DiscordUtil.setCommandHandler('gear', this, this.gearHandler)
        DiscordUtil.setCommandHandler('equip', this, this.equipHandler)
        DiscordUtil.setCommandHandler('drop', this, this.dropHandler)

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

        this.discord.user.setActivity('ChaosRPG', { 'type': 'PLAYING' })

        await this.broadcastMessage('ChaosRPG is online.')
    }

    async onMessage(message) {
        // console.log(message.content)
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

    /* eslint no-unused-vars: [ "error", { "argsIgnorePattern": "^_" } ] */
    async onMessageReaction(reaction, user, _added) {
        if (user.id === this.discord.user.id)
            return

        let tracked = this.trackedCommands.get(reaction.message.id)
        if (!tracked)
            return

        if (tracked.command.message.author.id !== user.id)
            return

        let account = await this.gameDb.getAccount(
            tracked.command.message.guild.id,
            tracked.command.message.author.id
        )
        if (!account)
            return

        let player = await this.gameDb.getUnitByAccount(account.id)
        if (!player)
            return

        // console.log(reaction.emoji)

        if (tracked.command.name === 'gear') {
            if (reaction.emoji.name === '⚔') {
                let embed = await this.createPlayerInventoryEmbed(player, Storage.EQUIPMENT.id)
                this.response = reaction.message.edit(embed)
            } else if (reaction.emoji.name === '💰') {
                let embed = await this.createPlayerInventoryEmbed(player, Storage.INVENTORY.id)
                this.response = reaction.message.edit(embed)
            } else {
                return
            }
            tracked.refresh(tracked.timeout)
        } else if (tracked.command.name === 'player') {
            if (player.descriptor.stat_points_remaining <= 0)
                return

            let stat = 0
            // console.log(reaction.emoji.id, reaction.emoji.name)
            if (reaction.emoji.name === 'str')
                stat = StatTable.STR.id
            else if (reaction.emoji.name === 'dex')
                stat = StatTable.DEX.id
            else if (reaction.emoji.name === 'int')
                stat = StatTable.INT.id
            else if (reaction.emoji.name === 'vit')
                stat = StatTable.VIT.id
            else
                return

            let items = await this.unit.getItems(player)
            await PlayerUtil.applyStatPoints(player, items, stat, 1)

            let embed = await this.createPlayerStatsEmbed(player)
            embed.setFooter(`Stat has been applied`)
            this.response = reaction.message.edit(embed)
            tracked.refresh(tracked.timeout)
        }
    }

    async onMessageReactionAdd(reaction, user) {
        return await this.onMessageReaction(reaction, user, true)
    }

    async onMessageReactionRemove(reaction, user) {
        return await this.onMessageReaction(reaction, user, false)
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
                await gameChannel.send(message)

            let debugChannel = guild.channels.get(guildSettings.debug_channel)
            if (debugChannel)
                await debugChannel.send(message)
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

        if (this.args.length < 1 || this.args.length > 4)
            return

        let subCmd = this.args[0]
        let settings = await this.ctx.gameDb.getSettings()

        if (subCmd === 'purge') {
            console.log('purge')

            settings.guilds = []
            settings.markModified('guilds')
            await settings.save()

            this.message.channel
                .send(`<@${this.message.author.id}> Active guilds purged`).then(m => m.delete(10000))

            return
        } else if (subCmd === 'add') {
            console.log('add')

            const guild = this.ctx.discord.guilds.get(this.message.guild.id)
            if (!guild) {
                this.message.channel
                    .send(`<@${this.message.author.id}> I am not in guild ${guild.name}`).then(m => m.delete(10000))

                return
            }

            if (settings.guilds.find(g => g.guild === guild.name)) {
                console.log('already exists')
                this.message.channel
                    .send(`<@${this.message.author.id}> Settings already exist for ${guild.name}`).then(m => m.delete(10000))

                return
            }

            let guildSettings = await this.ctx.gameDb.getGuildSettings(guild.id)
            if (guildSettings) {
                this.message.channel
                    .send(`<@${this.message.author.id}> Guild settings already exist for ${guild.name}`).then(m => m.delete(10000))

                return
            }

            let gameChannel = this.args[1] || ''
            let debugChannel = this.args[2] || ''

            let game = DiscordUtil.guildHasChannel(guild, gameChannel)
            if (!game && gameChannel !== '') {
                this.message.channel
                    .send(`<@${this.message.author.id}> Unable to lookup channel ${gameChannel}`).then(m => m.delete(10000))

                return
            }

            let debug = DiscordUtil.guildHasChannel(guild, debugChannel)
            if (!debug && debugChannel !== '') {
                this.message.channel
                    .send(`<@${this.message.author.id}> Unable to lookup channel ${debugChannel}`).then(m => m.delete(10000))

                return
            }

            guildSettings = Guild.createSettings(
                guild.id, game ? game.id : '', debug ? debug.id : '',
                { 'rng_secret': 'test', 'rng_counter': 0, 'rng_offset': 0 },
                { 'rng_secret': 'test1', 'rng_counter': 0, 'rng_offset': 0 },
                { 'rng_secret': 'test2', 'rng_counter': 0, 'rng_offset': 0 }
            )
            await this.ctx.gameDb.createGuildSettings(guildSettings)
            console.log(guildSettings)

            settings.guilds.push(guild.id)
            settings.markModified('guilds')
            await settings.save()

            this.message.channel
                .send(`<@${this.message.author.id}> Added guild ${guild.name}`).then(m => m.delete(10000))

            return
        } else if (subCmd === 'remove') {
            console.log('remove')

            if (this.args.length === 1) {
                const guild = this.ctx.discord.guilds.get(this.message.guild.id)
                if (!guild) {
                    console.log('unable to get guild')

                    return
                }

                const idx = settings.guilds.findIndex(g => g.guild === this.message.guild.id)
                if (idx >= 0) {
                    settings.guilds.splice(idx, 1)
                    settings.markModified('guilds')
                    await settings.save()
                }

                let guildSettings = await this.ctx.gameDb.getGuildSettings(this.message.guild.id)
                if (guildSettings) {
                    await this.ctx.gameDb.removeGuildSettings(this.message.guild.id)

                    this.message.channel
                        .send(`<@${this.message.author.id}> Guild ${guild.name} removed`).then(m => m.delete(10000))

                    return
                }
            }
        } else if (subCmd === 'debug') {
            console.log('debug')
            if (this.args.length === 1) {
                const guild = this.ctx.discord.guilds.get(this.message.guild.id)
                if (!guild) {
                    console.log('unable to lookup guild')

                    return
                }
                let guildSettings = await this.ctx.gameDb.getGuildSettings(this.message.guild.id)
                if (guildSettings) {
                    guildSettings.debug_channel = ''
                    await guildSettings.save()

                    this.message.channel
                        .send(`<@${this.message.author.id}> Removed debug channel`).then(m => m.delete(10000))

                    return
                }
            }

            if (this.args.length === 2) {
                const guild = this.ctx.discord.guilds.get(this.message.guild.id)
                if (!guild) {
                    console.log('unable to lookup guild')

                    return
                }
                let guildSettings = await this.ctx.gameDb.getGuildSettings(this.message.guild.id)
                if (!guildSettings) {
                    this.message.channel
                        .send(`<@${this.message.author.id}> Unable to lookup guild settings`).then(m => m.delete(10000))

                    return
                }

                let debugChannel = this.args[1] || ''

                let debug = DiscordUtil.guildHasChannel(guild, debugChannel)
                if (!debug) {
                    this.message.channel
                        .send(`<@${this.message.author.id}> Unable to lookup channel ${debugChannel}`).then(m => m.delete(10000))

                    return
                }

                guildSettings.debug_channel = debugChannel
                await guildSettings.save()

                this.message.channel
                    .send(`<@${this.message.author.id}> Set debug channel ${debugChannel}`).then(m => m.delete(10000))

                return
            }
        } else if (subCmd === 'game') {
            // TODO|FIXME
            return
        }
    }

    // unprivileged command handlers

    // lexical this is in the context of CommandHandler
    async createPlayerHandler() {
        console.log('createPlayerHandler')

        if (this.message.channel.permissionsFor(this.ctx.discord.user).has('MANAGE_MESSAGES'))
            this.message.delete(10000)

        let settings = await this.ctx.gameDb.getSettings()
        let guildSettings = await this.ctx.gambeDb.getGuildSettings(this.message.guild.id)
        if (!guildSettings) {
            this.message.channel
                .send(`<@${this.message.author.id}> Unable to find settings for this guild`).then(m => m.delete(10000))

            return
        }
        let account = await this.ctx.gameDb.getAccount(this.message.guild.id, this.message.author.id)
        if (!account) {
            account = await this.ctx.gameDb.createAccount({
                'id': settings.next_account_id,
                'guild': this.message.guild.id,
                'name': this.message.author.id
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

        let itemRngCtx = this.ctx.secureRng.getContext(`${this.message.guild.id}-item_rng`)
        let starterItems = PlayerUtil.createStarterItems(itemRngCtx, type)
        if (!starterItems) {
            console.log('unable to create starter items')
            process.exit(1)

            return
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

        if (this.response)
            return

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
            await sent.react('416835539166035968')
            await sent.react('416835539237470208')
            await sent.react('416835539157909504')
            await sent.react('416835538901794827')
        }

        this.response = sent
        let trackedCommand = new TrackedCommand(this.ctx.trackedCommands, this, 60000)
        this.ctx.trackedCommands.set(sent.id, trackedCommand)
    }

    // lexical this is in the context of CommandHandler
    async gearHandler() {
        console.log('gearHandler')

        if (this.command && this.command.response)
            return

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
            const slotNames = StorageUtil.getSlotNames()
            const slotString = this.ctx.makeSlotNamesString(slotNames)

            this.message.channel
                .send(`<@${this.message.author.id}> Valid slots are ${slotString}`).then(m => m.delete(10000))

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
                srcDesc = { 'node': n.id, 'slot': src.id }

            let dest = n.descriptor.find(d => d.name.toLowerCase() === slotDest)
            if (dest && !destDesc)
                destDesc = { 'node': n.id, 'slot': dest.id }
        })

        // now it's time to check the slots
        // first check if the source slot contains an item
        if (!srcDesc) {
            console.log('no source item descriptor')
            this.message.channel
                .send(`<@${this.message.author.id}> ${slotSrc} is not a valid slot`).then(m => m.delete(10000))

            return
        }

        if (!destDesc) {
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

        let destItemId = StorageUtil.getSlot(player.storage, destDesc.node, destDesc.slot)
        if (destItemId) {
            this.message.channel
                .send(`<@${this.message.author.id}> ${slotDest} already contains an item, move it first`).then(m => m.delete(10000))

            return
        }

        let items = await this.ctx.unit.getItems(player)
        let item = items.find(i => i.id === srcItemId)
        if (!item) {
            console.log(srcItemId, player.storage)
            console.log('failed looking up src item')
            process.exit(1)
        }

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

        items = await this.ctx.player.getItems(player)

        await UnitUtil.computeBaseStats(player, items)
        player.markModified('stats')
        player.markModified('storage')
        await player.save()
    }

    async dropHandler() {
        console.log('dropHandler')

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
            const slotNames = StorageUtil.getSlotNames()
            const slotString = this.ctx.makeSlotNamesString(slotNames)

            this.message.channel
                .send(`<@${this.message.author.id}> Valid slots are ${slotString}`).then(m => m.delete(10000))

            return
        }

        if (this.args.length !== 1) {
            console.log('bad args', this.args)

            return
        }

        let slot = this.args[0].toLowerCase()

        // okay, we are dealing with a valid slot name, but we need to turn
        // it into a slot descriptor
        let slotDesc = null

        Object.values(Storage).map(n => {
            let slotDescriptor = n.descriptor.find(d => d.name.toLowerCase() === slot)
            if (slotDescriptor && !slotDesc)
                slotDesc = { 'node': n.id, 'slot': slotDescriptor.id }
        })

        // now it's time to check the slots
        // first check if the source slot contains an item
        if (!slotDesc) {
            console.log('no source item descriptor')
            this.message.channel
                .send(`<@${this.message.author.id}> ${slot} is not a valid slot`).then(m => m.delete(10000))

            return
        }

        let slotItemId = StorageUtil.getSlot(player.storage, slotDesc.node, slotDesc.slot)
        if (!slotItemId) {
            console.log(player.storage, slotDesc, slotItemId)
            this.message.channel
                .send(`<@${this.message.author.id}> ${slot} contains no item`).then(m => m.delete(10000))

            return
        }

        let items = await this.ctx.unit.getItems(player)
        let item = items.find(i => i.id === slotItemId)
        if (!item) {
            console.log(srcItemId, player.storage)
            console.log('failed looking up item')
            process.exit(1)
        }

        if (!this.ctx.unit.unequipItem(player, items, item, slotDesc.node, slotDesc.slot)) {
            this.message.channel
                .send(`<@${this.message.author.id}> ${slot} failed unequipping item`).then(m => m.delete(10000))

            return
        }

        await item.remove()
        items = await this.ctx.player.getItems(player)

        await UnitUtil.computeBaseStats(player, items)
        player.markModified('stats')
        player.markModified('storage')
        await player.save()

        this.message.channel
            .send(`<@${this.message.author.id}> ${slot} item has been dropped`).then(m => m.delete(10000))
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

    async createPlayerStatsEmbed(unit) {
        let embed = new Discord.RichEmbed().setColor(7682618)
            .addField(`\`*${unit.name}\`*`, `**${unit.descriptor.stat_points_remaining}** stat points are available`, true)

        let statsBody = this.unitInfoStatsBody(unit, true)
        embed.addField('Character Stats', statsBody)

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

    createCombatInfoEmbed(unitA, unitB, isPreCombat) {
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

        if (isPreCombat) {
            embed.setDescription(`\`\`\`ml\n${unitAClass} and ${unitBClass} have been seleced for combat.\`\`\``)
            embed.addField(`\`${unitAName}\``, this.unitInfoStatsBody(unitA), true)
            embed.addField(`\`${unitBName}\``, this.unitInfoStatsBody(unitB), true)
        } else {
            embed.addField(`\`${unitAName}\` ${unitAClass}`, this.unitInfoStatsBody(unitA), true)
            embed.addField(`\`${unitBName}\` ${unitBClass}`, this.unitInfoStatsBody(unitB), true)
        }

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

        // let guild = await combatContext.game.gameDb.getGuildSettings(combatContext.guild)
        // let channel = await combatContext.game.discord.channels.get(guild.game_channel)

        let dmgA = ''
        let dmgB = ''
        let output = ''

        const eventCount = results.length
        let idx = 0
        results.map(r => {
            const atkName = `${UnitUtil.getName(r.attacker)}`
            const defName = `${UnitUtil.getName(r.defender)}`

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

            if (idx > 0 && idx < eventCount - 1)
                output += ' '

            idx++
        })

        if (output !== '')
            Markdown.c(output, 'ml')

        let embed = this.createCombatInfoEmbed(combatContext.unitA, combatContext.unitB)
        if (output !== '') {
            embed.addField('Combat', output)
        } else {
            embed.addField(`\`${combatContext.unitA.name}\``, dmgA || 'died', true)
            embed.addField(`\`${combatContext.unitB.name}\``, dmgB || 'died', true)
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
                combatRngCtx = new SecureRNGContext(guildSettings.combat_rng_state.rng_secret)
                if (!this.secureRng.addContext(combatRngCtx, `${guildSettings.guild}-combat_rng`)) {
                    console.log('unable to add combat RNG context')

                    return
                }
            }

            let itemRngCtx = this.secureRng.getContext(`${guildSettings.guild}-item_rng`)
            if (!itemRngCtx) {
                itemRngCtx = new SecureRNGContext(guildSettings.item_rng_state.rng_secret)
                if (!this.secureRng.addContext(itemRngCtx, `${guildSettings.guild}-item_rng`)) {
                    console.log('unable to add item RNG context')

                    return
                }
            }

            let monsterRngCtx = this.secureRng.getContext(`${guildSettings.guild}-monster_rng`)
            if (!monsterRngCtx) {
                monsterRngCtx = new SecureRNGContext(guildSettings.monster_rng_state.rng_secret)
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

                let embed = this.createCombatInfoEmbed(units[0], units[1], true)

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
            await this.sleep(1 * 10000, async () => { await this.loop() })
        }

        console.log('run loop terminating')

        await this.destroy()

        console.log('shutdown complete')

        return true
    }
}

const game = new Game(Config)
game.syncinit()
