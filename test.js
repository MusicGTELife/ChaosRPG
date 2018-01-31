const { test } = require('ava')

const { StorageUtil } = require('./util/storage')
const { UnitUtil } = require('./util/unit')

const { GameDb } = require('./db')
const { UnitType, Unit } = require('./unit')
const { Storage } = require('./storage')

test('units', async t => {
    let player = UnitUtil.create(UnitType.PLAYER.id)
    let monster = UnitUtil.create(UnitType.MONSTER.id)
    t.not(player, null)
    t.not(monster, null)
    t.is(UnitUtil.create(0), null)
})

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

    const monsterStorage = [
        {
            id: Storage.EQUIPMENT.id,
            size: Storage.EQUIPMENT.size,
            buffer: [ 0, 0, 0, 0, 0, 0, 0, 0 ]
        }
    ]

    t.deepEqual(StorageUtil.createStorage(UnitType.PLAYER.id), storage)
    t.deepEqual(StorageUtil.createStorage(UnitType.MONSTER.id), monsterStorage)

    t.true(StorageUtil.isNodeValid(storage, Storage.EQUIPMENT.id))
    t.true(StorageUtil.isNodeValid(storage, Storage.INVENTORY.id))
    t.false(StorageUtil.isNodeValid())
    t.false(StorageUtil.isNodeValid(storage, 0))
    t.false(StorageUtil.isNodeValid(monsterStorage, Storage.INVENTORY.id))

    t.true(StorageUtil.isSlotValid(
        storage, Storage.EQUIPMENT.id, Storage.EQUIPMENT.size-1
    ))

    t.false(StorageUtil.isSlotValid(
        storage, Storage.EQUIPMENT.id, Storage.EQUIPMENT.size
    ))
    t.false(StorageUtil.isSlotValid(storage, -1, Storage.EQUIPMENT.size))

    storage[0].buffer[1] = 1
    t.false(StorageUtil.isSlotOccupied(
        storage, Storage.EQUIPMENT.id, Storage.EQUIPMENT.size-1
    ))
    t.true(StorageUtil.isSlotOccupied(storage, Storage.EQUIPMENT.id, 1))
    t.is(StorageUtil.getNode(storage, Storage.EQUIPMENT.id-1), null)

    t.deepEqual(StorageUtil.getNode(storage, Storage.EQUIPMENT.id),
        {
            id: Storage.EQUIPMENT.id,
            size: Storage.EQUIPMENT.size,
            buffer: [ 0, 1, 0, 0, 0, 0, 0, 0 ]
        })

    t.is(StorageUtil.getSlot(storage, Storage.EQUIPMENT.id, 11), 0)
    t.is(StorageUtil.getSlot(storage, Storage.EQUIPMENT.id, 1), 1)
    t.true(StorageUtil.setSlot(storage, Storage.EQUIPMENT.id, 0, 1111))
})

