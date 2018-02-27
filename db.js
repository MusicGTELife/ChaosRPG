const mongoose = require('mongoose')
const { Account, Settings, GuildSettings, Unit, Item } = require('./models')
const { UnitType } = require('./unit')

mongoose.Promise = global.Promise

class GameDb {
    constructor(host, options) {
        this.host = host
        this.options = options
        this.db = mongoose
    }

    execCb(err, results) {
        if (err) {
            console.log('err', err)

            return null
        }

        console.log('results', results)

        return results
    }

    async connect() {
        return await this.db.connect(this.host, this.options)
            .then(() => true)
            .catch(() => false)
    }

    async disconnect() {
        await this.db.disconnect()
    }

    async createSettings(settingsObj) {
        console.log('createSettings')
        const existing = await this.getSettings()
        if (existing) {
            console.log(`game settings already exist`)

            return null
        }

        let settings = new Settings(settingsObj)
        await settings.save()

        return settings
    }

    async getSettings() {
        let settings = await Settings.findOne()
        // console.log('getSettings', settings)

        return settings
    }

    async updateSettings(settings) {
        console.log('updateSettings')

        return await settings.save()
    }

    async getGuildSettings(guild) {
        let guildSettings = await GuildSettings.where('guild', guild).findOne()

        return guildSettings
    }

    async createGuildSettings(guildSettingsObj) {
        let existing = await this.getGuildSettings(guildSettingsObj.guild)
        if (existing) {
            console.log('guild settings already exist')

            return null
        }

        let guildSettings = new GuildSettings(guildSettingsObj)
        await guildSettings.save()

        return guildSettings
    }

    async removeGuildSettings(guildSettings) {
        return await GuildSettings.where('guild', guildSettings.guild).remove()
    }

    async createAccount(accountObj) {
        let existing = await this.getAccount(accountObj.guild, accountObj.name)
        if (existing) {
            console.log('account exists')

            return null
        }

        let account = new Account(accountObj)
        await account.save()

        return account
    }

    async getAccount(guild, name) {
        let account = await Account.findOne({ guild, name })
        // console.log(guild, name)

        return account
    }

    async createActiveUsers() {
        console.log('createActiveUsers')
        const existing = await this.getActiveUsers()
        if (existing) {
            console.log(`active users record already exists`)

            return null
        }

        let activeUsers = new ActiveUsers(activeUsersObj)
        await activeUsers.save()

        return activeUsers
    }

    async getActiveUsers() {
        return await ActiveUsers.findOne()
    }

    async updateActiveUsers(activeUsers) {
        console.log('updateActiveUsers')

        return await activeUsers.save()
    }

    async createUnit(unitObj) {
        if (unitObj.type === UnitType.PLAYER.id) {
            const existing = await this.getUnitByAccount(unitObj.descriptor.account)
            if (existing) {
                console.log(`cannot create unit for ${unitObj.descriptor.account} which already exists`)

                return null
            }
        }

        let unit = new Unit(unitObj)
        await unit.save()

        return unit
    }

    async getUnit(id) {
        return await Unit.where('id', id).findOne()
    }

    async getUnitByAccount(account) {
        return await Unit.where('descriptor.account', account).findOne()
    }

    async getUnits(ids) {
        return await Unit.where('id').in(ids).find()
    }

    async updateUnit(unit) {
        return await unit.save()
    }

    async updateUnits(ids) {
        return await Unit.where('id').in(ids).update()
    }

    async removeUnit(unit) {
        return await unit.remove()
    }

    async removeUnits(ids) {
        return await Unit.where('id').in(ids).remove()
    }

    async createItem(itemObj) {
        let existing = await this.getItem(itemObj.id)
        if (existing) {
            console.log(`cannot create item for ${itemObj.id} which already exists`)

            return null
        }

        let item = new Item(itemObj)
        await item.save()

        return item
    }

    async getItem(id) {
        return await Item.where('id', id).findOne()
    }

    async getItems(ids) {
        return await Item.where('id').in(ids).find()
    }

    async getUnitItems(id) {
        return await Item.where('owner', id).find()
    }

    async updateItem(item) {
        return await item.save()
    }

    async updateItems(ids) {
        return await Item.where('id').in(ids).update()
    }

    async removeItem(item) {
        return await item.remove()
    }

    async removeItems(ids) {
        return await Item.where('id').in(ids).remove()
    }
}

module.exports = { GameDb }
