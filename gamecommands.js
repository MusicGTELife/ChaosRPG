const { Command, CommandHandler } = require('./util/discord')
const { StorageUtil } = require('./util/storage')
const { PlayerUtil } = require('./util/player')
const { UnitUtil } = require('./util/unit')

const { Storage } = require('./storage')
const { StatTable } = require('./stattable')

// administrative handlers

class GuildSettings extends Command {
    constructor(commandHandler, ctx, args, message, timeout) {
        super('guild', commandHandler, ctx, args, message, timeout)
    }

    // TODO break this up into multiple commands, or at least some utility
    // functions to make it easier to deal with all of the cases
    async run() {
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

            // TODO|FIXME hardcoded for now
            guildSettings = Guild.createSettings(
                guild.id, game ? game.id : '', debug ? debug.id : '',
                { 'rng_secret': 'test', 'rng_counter': 0, 'rng_offset': 0 },
                { 'rng_secret': 'test1', 'rng_counter': 0, 'rng_offset': 0 },
                { 'rng_secret': 'test2', 'rng_counter': 0, 'rng_offset': 0 }
            )
            await this.ctx.gameDb.createGuildSettings(guildSettings)
            // console.log(guildSettings)

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
}

// unprivileged command handlers

class CreatePlayer extends Command {
    constructor(commandHandler, ctx, args, message, timeout) {
        super('create', commandHandler, ctx, args, message, timeout)
    }

    async run() {
        console.log('createPlayerHandler')

        if (this.message.channel.permissionsFor(this.ctx.discord.user).has('MANAGE_MESSAGES'))
            this.message.delete(10000)

        let settings = await this.ctx.gameDb.getSettings()
        let guildSettings = await this.ctx.gameDb.getGuildSettings(this.message.guild.id)
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

        let starterItems = PlayerUtil.createStarterItems(type)
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
}

class DeletePlayer extends Command {
    constructor(commandHandler, ctx, args, message, timeout) {
        super('delete', commandHandler, ctx, args, message, timeout)
    }

    async run() {
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
}

class PlayerInfo extends Command {
    constructor(commandHandler, ctx, args, message, timeout) {
        super('player', commandHandler, ctx, args, message, timeout)
    }

    async run() {
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

        let embed = this.ctx.createPlayerStatsEmbed(player)
        let sent = await this.message.channel.send(embed)
        this.response = sent
        this.commandHandler.trackedCommands.set(this.response.id, this)

        if (player.descriptor.stat_points_remaining) {
            await sent.react('416835539166035968')
            await sent.react('416835539237470208')
            await sent.react('416835539157909504')
            await sent.react('416835538901794827')
        }
    }

    async onReaction(tracked, account, reaction) {
        let player = await this.ctx.gameDb.getUnitByAccount(account.id)
        if (!player)
            return

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

        let items = await this.ctx.unit.getItems(player)
        player = await PlayerUtil.applyStatPoints(player, items, stat, 1)

        let embed = this.ctx.createPlayerStatsEmbed(player)
        embed.setFooter(`Stat has been applied`)
        this.response = await reaction.message.edit(embed)
        this.refresh(this.timeout)
    }
}

class Equipment extends Command {
    constructor(commandHandler, ctx, args, message, timeout) {
        super('gear', commandHandler, ctx, args, message, timeout)
    }

    async run() {
        console.log('equipmentHandler')

        if (this.response)
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
        this.response = sent
        this.commandHandler.trackedCommands.set(this.response.id, this)

        await sent.react('⚔')
        await sent.react('💰')
    }

    async onReaction(tracked, account, reaction) {
        let player = await this.ctx.gameDb.getUnitByAccount(account.id)
        if (!player)
            return

        let node = Storage.EQUIPMENT.id
        if (reaction.emoji.name === '⚔')
            node = Storage.EQUIPMENT.id
        else if (reaction.emoji.name === '💰')
            node = Storage.INVENTORY.id
        else
            return

        let embed = await this.ctx.createPlayerInventoryEmbed(player, node)
        this.response = await reaction.message.edit(embed)

        this.refresh(this.timeout)
    }
}

class EquipItem extends Command {
    constructor(commandHandler, ctx, args, message, timeout) {
        super('equip', commandHandler, ctx, args, message, timeout)
    }

    async run() {
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

        if (!UnitUtil.unequipItem(player, items, item, srcDesc.node, srcDesc.slot)) {
            this.message.channel
                .send(`<@${this.message.author.id}> ${slotDest} failed unequipping item`).then(m => m.delete(10000))

            return
        }

        if (!UnitUtil.equipItem(player, items, item, destDesc.node, destDesc.slot)) {
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
}

class DropItem extends Command {
    constructor(commandHandler, ctx, args, message, timeout) {
        super('drop', commandHandler, ctx, args, message, timeout)
    }

    async run() {
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

        if (!UnitUtil.unequipItem(player, items, item, slotDesc.node, slotDesc.slot)) {
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
}

const cc = CommandHandler.createHandler

const GameCommands = { }
// Administrative command
GameCommands.GUILD = cc('guild', 0, 4, true, null, GuildSettings, -1)

// User commands
GameCommands.CREATE_PLAYER = cc('create', 0, 1, false, null, CreatePlayer, -1)
GameCommands.DELETE_PLAYER = cc('delete', 0, 0, false, null, DeletePlayer, -1)
GameCommands.PLAYER_INFO = cc('player', 0, 2, false, null, PlayerInfo, 60000)
GameCommands.EQUIPMENT = cc('gear', 0, 0, false, null, Equipment, 60000)
GameCommands.EQUIP_ITEM = cc('equip', 0, 2, false, null, EquipItem, -1)
GameCommands.DROP_ITEM = cc('drop', 0, 1, false, null, DropItem, -1)

module.exports = { GameCommands }
