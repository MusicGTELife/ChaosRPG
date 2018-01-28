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

    static isNodeValid(storage, node) {
        // check if the node id is valid
        let valid = ({
            [Storage.EQUIPMENT.id]: true,
            [Storage.INVENTORY.id]: true
        })[node] || false

        if (!valid)
            return false

        // check if the storage contains a buffer of the requested node id
        storage.map(e => {
            if (e.id === node)
                valid = true
        })

        return valid
    }

    static getNode(storage, node) {
        if (!StorageUtil.isNodeValid(storage, node))
            return []

        return storage.find(e => e.id === node)
    }

    static isSlotValid(storage, nodeId, slot) {
        if (!StorageUtil.isNodeValid(storage, nodeId))
            return false

        let node = StorageUtil.getNode(storage, nodeId)
        if (node != [] && slot >= 0 && slot < node.size)
            return true

        return false
    }

    static isSlotOccupied(storage, node, slot) {
        if (!StorageUtil.isSlotValid(storage, node, slot))
            return false

        const value = StorageUtil.getSlot(storage, node, slot)
        return value !== 0
    }

    static getSlot(storage, node, slot) {
        if (!StorageUtil.isSlotValid(storage, node, slot))
            return 0

        let buffer = StorageUtil.getNode(storage, node)
        if (buffer)
            return buffer[slot]

        return 0
    }
}

module.exports = { StorageUtil }
