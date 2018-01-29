const { test } = require('ava')

const { GameDb } = require('./db')
const { UnitType, Unit } = require('./unit')
const { StorageUtil } = require('./util/storage')
const { Storage } = require('./storage')

test('db models', async t => {
    const gameDb = new GameDb('mongodb://localhost/game-test', {})
    await gameDb.connect()

    let item = await gameDb.getUnit()
    t.is(item, null)
    item = await gameDb.getUnit("a string").catch(() => null)
    t.is(item, null)

    await gameDb.disconnect()
})

test('storage', t => {
    const buffer = [ 0, 0, 0, 0, 0, 0, 0, 0 ]
    const storage = [
        {
            id: Storage.EQUIPMENT.id,
            size: Storage.EQUIPMENT.size,
            buffer: [ 0, 0, 0, 0, 0, 0, 0, 0 ]
        },
        {
            id: Storage.INVENTORY.id,
            size: Storage.INVENTORY.size,
        buffer: [ 0, 0, 0, 0, 0, 0, 0, 0 ]
        }
    ]

    t.deepEqual(StorageUtil.createStorage(UnitType.PLAYER.id), storage)

    t.true(StorageUtil.isNodeValid(storage, Storage.EQUIPMENT.id))
    t.true(StorageUtil.isNodeValid(storage, Storage.INVENTORY.id))
    t.false(StorageUtil.isNodeValid())
    t.false(StorageUtil.isNodeValid(storage, 0))

    t.true(StorageUtil.isSlotValid(
        storage, Storage.EQUIPMENT.id, Storage.EQUIPMENT.size-1
    ))
})

