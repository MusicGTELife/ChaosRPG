const { Storage } = require('../storage')
const { UnitType } = require('../unit')

class StorageUtil {
    static createStorage(unitType) {

        let player = ({
            [UnitType.PLAYER.id]: true,
        })[unitType] || false

        const storage = [
            {
                id: Storage.EQUIPMENT.id,
                size: Storage.EQUIPMENT.size,
                buffer: new Array(Storage.EQUIPMENT.size).fill(0)
            }
        ]

        if (player) {
            storage.push({
                id: Storage.INVENTORY.id,
                size: Storage.INVENTORY.size,
                buffer: new Array(Storage.INVENTORY.size).fill(0)
            })
        }

        return storage
    }

    static isNodeValid(storage, nodeId) {
        // check if the node id is valid
        let valid = ({
            [Storage.EQUIPMENT.id]: true,
            [Storage.INVENTORY.id]: true
        })[nodeId] || false

        if (!valid)
            return false

        // check if the storage contains a buffer of the requested node id
        storage.map(e => {
            if (e.id === nodeId)
                valid = true
        })

        return valid
    }

    static getNode(storage, nodeId) {
        if (!StorageUtil.isNodeValid(storage, nodeId))
            return null

        let node = storage.find(e => e.id === nodeId)
        return node
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

        const value = StorageUtil.getSlot(storage, nodeId, slot)
        return value !== null
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
            return null

        let buffer = StorageUtil.getNode(storage, nodeId)
        console.log('buffer', buffer)
        if (buffer)
            return buffer[slot]

        return null
    }

    static setSlot(storage, nodeId, slot, itemId) {
        storage.find(e => e.id === node)
        let b = StorageUtil.getNode(storage, nodeId)
    }
}

module.exports = { StorageUtil }
