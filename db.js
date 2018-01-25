const { Database, Model } = require('mongorito');

const { Item, Unit } = require('./models')

class GameDb {
    constructor() {
        const db = new Database('localhost/game')
        db.connect()

        console.log('registering models')

        db.register(Item)
        db.register(Unit)

        this.db = db
    }

    async createUnit(unitObj) {
        let existing = await this.getUnit(unitObj.id)
        if (existing) {
            console.log(`cannot create player for ${unitObj.id} which already exists`)
            return null
        }

        let unit = new Unit(unitObj)
        await unit.save()
        return unit
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

    async getUnit(id) {
        let unit = await Unit.where('id', id).findOne()
        return unit
    }

    async getUnits(ids) {

    }

    async getItem(id) {
        let item = await Item.where('id', id).findOne()
        return item
    }

    async getItems(ids) {

    }
}

module.exports = { GameDb }
