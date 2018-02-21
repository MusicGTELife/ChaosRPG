'use strict'

const { test } = require('ava')

const { SecureRNG, SecureRNGContext } = require('./rng')

const { StorageUtil } = require('./util/storage')
const { StatUtil } = require('./util/stats')
const { UnitUtil } = require('./util/unit')
const { PlayerUtil } = require('./util/player')
const { MonsterUtil } = require('./util/monster')
const { ItemUtil } = require('./util/item')

const { GameDb } = require('./db')

const { Storage, Slots } = require('./storage')
const { StatModifier } = require('./statmodifier')
const { StatResolver } = require('./statresolver')
const { StatTable } = require('./stattable')
const { UnitType, Unit } = require('./unit')
const { Player } = require('./player')
const { Monster } = require('./monster')
const { MonsterTable } = require('./monstertable')
const { ItemTable } = require('./itemtable')
const { ItemClass, ArmorClass, WeaponClass, JewelClass } = require('./itemclass')

test('rng', t => {
    const RNG = SecureRNG
    const rng = new RNG()

    t.false(RNG.validateContext(null))

    t.throws(() => new SecureRNGContext(1), TypeError)
    t.throws(() => new SecureRNGContext(''))
    t.throws(() => new SecureRNGContext('secret sauce', 'oops'))

    let ctx = new SecureRNGContext('secret sauce')
    t.true(RNG.validateContext(ctx))

    t.false(rng.removeContext('sauce'))
    t.throws(() => rng.addContext(null, 'sauce'))
    t.true(rng.addContext(ctx, 'sauce'))
    t.false(rng.addContext(ctx, 'sauce'))
    t.deepEqual(rng.getContext('sauce'), ctx)

    t.throws(() => RNG.getNextHmac(null), Error)

    let digest = RNG.getNextHmac(ctx)
    t.true(digest instanceof Buffer)

    t.throws(() => RNG.getBits(null, 0), Error)
    t.throws(() => RNG.getBits(ctx, 0), RangeError)
    t.throws(() => RNG.getBits(ctx, 49), RangeError)


    t.throws(() => SecureRNG.getRandomInt(null, 0, 1), Error)
    t.throws(() => SecureRNG.getRandomInt(ctx, 1, 0), RangeError)

    let val = RNG.getRandomInt(ctx, -9, 9)
    t.is(val >= -9 && val <= 9, true);

    t.true(rng.removeContext('sauce'))
})

test('stats', async t => {
    let stats = [ { id: StatTable.HP.id, value: 2 } ]

    let stat = StatUtil.getStat(stats, StatTable.HP.id)
    t.deepEqual(stat, { id :StatTable.HP.id, value: 2 })

    stat = StatResolver.add(StatUtil.getStat(stats, StatTable.HP.id), 3)
    t.deepEqual(stat, { id: StatTable.HP.id, value: 5 })

    stat = StatResolver.mult(StatUtil.getStat(stats, StatTable.HP.id), 3)
    t.deepEqual(stat, { id: StatTable.HP.id, value: 6 })

    stats.push({ id: StatTable.VIT.id, value: 3})

    let resolved = StatUtil.resolveModifier(stats, StatModifier.HP_PER_VIT)
    console.log(resolved)

    t.deepEqual(resolved, [ { id: StatTable.HP.id, value: 14 } ])

    stats = [
        { id: StatTable.ALL_ATTR.id, value: 2 },
        { id: StatTable.STR.id, value: 1 },
        { id: StatTable.DEX.id, value: 2 },
        { id: StatTable.INT.id, value: 3 },
        { id: StatTable.VIT.id, value: 4 }
    ]

    resolved = StatUtil.resolveModifier(stats, StatModifier.ALL_ATTR)
    t.deepEqual(resolved, [
        { id: StatTable.STR.id, value: 3 },
        { id: StatTable.DEX.id, value: 4 },
        { id: StatTable.INT.id, value: 5 },
        { id: StatTable.VIT.id, value: 6 }
    ])
})

test('units', async t => {
    let player = UnitUtil.create(UnitType.PLAYER.id)
    let monster = UnitUtil.create(UnitType.MONSTER.id)
    t.not(player, null)
    t.not(monster, null)
    t.is(UnitUtil.create(0), null)
})

test('monsters', async t => {
    let monster = MonsterUtil.create(MonsterTable.GOBLIN.code)
    t.not(monster, null)

    monster = MonsterUtil.create(0)
    t.is(monster, null)
})

test('items', async t => {
    // okay, this should select all entries in the item table and match it
    let entries = ItemUtil.getItemClassEntries([ItemClass.WEAPON, ItemClass.ARMOR, ItemClass.JEWEL])
    t.deepEqual(entries, Object.values(ItemTable))

    entries = ItemUtil.getItemSubClassEntries(ItemClass.WEAPON, [WeaponClass.MELEE_2H, WeaponClass.MELEE_1H])

})

test('db', async t => {
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

    t.true(StorageUtil.canEquipItemTypeInSlot(storage, Storage.EQUIPMENT.id, Slots.HEAD, ItemTable.GREAT_HELM.code))
    t.false(StorageUtil.canEquipItemTypeInSlot(storage, Storage.EQUIPMENT.id, Slots.FEET, ItemTable.GREAT_HELM.code))
    t.false(StorageUtil.canEquipItemTypeInSlot(storage, Storage.EQUIPMENT.id, Slots.ARM_L, ItemTable.GREAT_HELM.code))
    t.false(StorageUtil.canEquipItemTypeInSlot(storage, Storage.EQUIPMENT.id, Slots.ARM_R, ItemTable.GREAT_HELM.code))
    t.false(StorageUtil.canEquipItemTypeInSlot(storage, Storage.EQUIPMENT.id, Slots.BODY, ItemTable.GREAT_HELM.code))
    t.false(StorageUtil.canEquipItemTypeInSlot(storage, Storage.EQUIPMENT.id, Slots.HANDS, ItemTable.GREAT_HELM.code))

    t.true(StorageUtil.canEquipItemTypeInSlot(storage, Storage.EQUIPMENT.id, Slots.ARM_L, ItemTable.CRACKED_SWORD.code))
    t.true(StorageUtil.canEquipItemTypeInSlot(storage, Storage.EQUIPMENT.id, Slots.ARM_R, ItemTable.CRACKED_SWORD.code))
    t.true(StorageUtil.canEquipItemTypeInSlot(storage, Storage.INVENTORY.id, Slots.INV0, ItemTable.CRACKED_SWORD.code))
    t.false(StorageUtil.canEquipItemTypeInSlot(storage, Storage.EQUIPMENT.id, Slots.BODY, ItemTable.CRACKED_SWORD.code))

    t.false(StorageUtil.isSlotOccupied(storage, Storage.EQUIPMENT.id, Slots.ARM_L))

    t.false(StorageUtil.setSlot(storage, Storage.EQUIPMENT.id, Slots.ARM_L, -1))

    t.deepEqual(StorageUtil.createStorage(UnitType.PLAYER.id), storage)
    t.deepEqual(StorageUtil.createStorage(UnitType.MONSTER.id), storage)

    t.true(StorageUtil.isNodeValid(storage, Storage.EQUIPMENT.id))
    t.true(StorageUtil.isNodeValid(storage, Storage.INVENTORY.id))
    t.false(StorageUtil.isNodeValid())
    t.false(StorageUtil.isNodeValid(storage, 0))

    t.true(StorageUtil.isSlotValid(
        storage, Storage.EQUIPMENT.id, Storage.EQUIPMENT.size-1
    ))

    t.false(StorageUtil.isSlotValid(storage, Storage.EQUIPMENT.id, 0xff))
    t.false(StorageUtil.isSlotValid(storage, -1, Storage.EQUIPMENT.size))

    t.false(StorageUtil.isSlotOccupied(
        storage, Storage.EQUIPMENT.id, Storage.EQUIPMENT.size-1
    ))
    t.is(StorageUtil.getNode(storage, Storage.EQUIPMENT.id-1), null)

    t.false(StorageUtil.setSlot(storage, Storage.EQUIPMENT.id, Slots.HEAD, -1))
    t.true(StorageUtil.setSlot(storage, Storage.EQUIPMENT.id, Slots.HEAD, 1))

    t.true(StorageUtil.isSlotOccupied(storage, Storage.EQUIPMENT.id, Slots.HEAD))

    t.deepEqual(StorageUtil.getNode(storage, Storage.EQUIPMENT.id),
        {
            id: Storage.EQUIPMENT.id,
            size: Storage.EQUIPMENT.size,
            buffer: [ 0, 0, 1, 0, 0, 0, 0, 0 ]
        })

    t.is(StorageUtil.getSlot(storage, Storage.EQUIPMENT.id, 0), 0)
    t.is(StorageUtil.getSlot(storage, Storage.EQUIPMENT.id, Slots.HEAD), 1)
    t.false(StorageUtil.setSlot(storage, Storage.EQUIPMENT.id, Slots.HEAD, 1111))
    t.true(StorageUtil.setSlot(storage, Storage.EQUIPMENT.id, Slots.FEET, 1111))
})

