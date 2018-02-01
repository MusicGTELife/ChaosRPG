const mongoose = require('mongoose');
const { Settings, Unit, Item } = require('./models')

class GameDb {
    constructor(host, options) {
        this.host = host
        this.options = options
        this.db = mongoose
    }

    async connect() {
        let res = await this.db.connect(this.host, this.options)
            .then(() => true)
            .catch(() => false)
        return res
    }

    async disconnect() {
        await this.db.connection.close().then(await this.db.disconnect())
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
        console.log('getSettings')
        let settings = await Settings.findOne()
        return settings
    }

    async updateSettings(settings) {
        console.log('updateSettings')
        return await settings.save()
    }

    async createUnit(unitObj) {
        const existing = await this.getUnit(unitObj.id)
        if (existing) {
            console.log(`cannot create unit for ${unitObj.id} which already exists`)
            return null
        }

        let unit = new Unit(unitObj)
        await unit.save()

        return unit
    }

    async getUnit(id) {
        let unit = await Unit.where('id', id).findOne()
        return unit
    }

    async getUnitByName(name) {
        let unit = await Unit.where('descriptor.name', name).findOne()
        return unit
    }

    async getUnits(ids) {
        let units = await Unit.where('id').in(ids).find()
        return items
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

    async removeUnits(units) {
        return await Unit.where('id').in(ids).remove()
    }

    async createItem(itemObj) {
        let existing = await this.getItem(itemObj.id)
        if (existing) {
            console.log(`cannot create item for ${itemObj.id} which already exists`)
            return null;
        }

        let item = new Item(itemObj)
        await item.save()
        return item
    }

    async getItem(id) {
        let item = await Item.where('id', id).findOne()
        return item
    }

    async getItems(ids) {
        let items = await Item.where('id').in(ids).find()
        return items
    }

    async getUnitItems(id) {
        //let items = await Item.where('id').in()
        //    .where('owner', unit.id).find()

        let items = await Item.where('owner', id).find()
        return items
    }

    async updateItem(item) {
        return await item.save()
    }

    async updateItems(items) {
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
