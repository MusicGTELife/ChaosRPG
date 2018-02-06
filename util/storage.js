const { ItemUtil } = require('./item')

const { Storage } = require('../storage')
const { StorageFlag } = require('../storageflags')
const { UnitType } = require('../unit')

class StorageUtil {
    static createStorage(unitType) {
        let valid = ({
            [UnitType.PLAYER.id]: true,
            [UnitType.MONSTER.id]: true,
        })[unitType] || false

        if (!valid)
            return null

        let storage = [ {
            id: Storage.EQUIPMENT.id,
            size: Storage.EQUIPMENT.size,
            buffer: new Array(Storage.EQUIPMENT.size).fill(0)
        } ]

        if (UnitType.PLAYER.id === unitType) {
            storage.push({
                id: Storage.INVENTORY.id,
                size: Storage.INVENTORY.size,
                buffer: new Array(Storage.INVENTORY.size).fill(0)
            })
        }

        return storage
    }

    static isNodeValid(storage, nodeId) {
        if (!storage)
            return false

        // check if the node id is valid
        let valid = ({
            [Storage.EQUIPMENT.id]: true,
            [Storage.INVENTORY.id]: true
        })[nodeId] || false

        if (!valid)
            return false

        // check if the storage contains a buffer of the requested node id
        return !!storage.find(e => e.id === nodeId)
    }

    static getNode(storage, nodeId) {
        if (!StorageUtil.isNodeValid(storage, nodeId))
            return null

        return storage.find(e => e.id === nodeId)
    }

    static isSlotValid(storage, nodeId, slot) {
        if (!StorageUtil.isNodeValid(storage, nodeId))
            return false

        let node = StorageUtil.getNode(storage, nodeId)
        if (node && slot >= 0 && slot < node.size)
            return true

        return false
    }

    static isSlotOccupied(storage, nodeId, slot) {
        if (!StorageUtil.isSlotValid(storage, nodeId, slot))
            return false

        return StorageUtil.getSlot(storage, nodeId, slot) !== 0
    }

    static canEquipItemTypeInSlot(storage, nodeId, slot, itemCode) {
        if (!StorageUtil.isSlotValid(storage, nodeId, slot))
            return false

        let itemTableEntry = ItemUtil.getItemTableEntry(itemCode)
        if (!itemTableEntry)
            return false

        if (nodeId === Storage.EQUIPMENT.id) {
            let flags = Storage.EQUIPMENT.descriptor[slot]
            return (flags & itemTableEntry.storage_flag) !== 0
        } else if (nodeId == Storage.INVENTORY.id) {
            let flags = Storage.INVENTORY.descriptor[slot]
            return (flags & itemTableEntry.storage_flag) !== 0
        }

        return false
    }

    static canEquipInSlot(storage, nodeId, slot) {
        if (!StorageUtil.isSlotValid(storage, nodeId, slot))
            return false

        if (StorageUtil.isSlotOccupied(storage, nodeId, slot))
            return false

        return true
    }

    static getSlot(storage, nodeId, slot) {
        if (!StorageUtil.isSlotValid(storage, nodeId, slot))
            return 0

        let node = StorageUtil.getNode(storage, nodeId)
        if (node && node.buffer)
            return node.buffer[slot]

        return 0
    }

    static setSlot(storage, nodeId, slot, itemId) {
        if (!StorageUtil.isSlotValid(storage, nodeId, slot))
            return false

        if (itemId < 0)
            return false

        let node = StorageUtil.getNode(storage, nodeId)
        if (node && node.buffer) {
            if (node.buffer[slot] !== 0)
                return false

            node.buffer[slot] = itemId
            return true
        }

        return false
    }
}

module.exports = { StorageUtil }
