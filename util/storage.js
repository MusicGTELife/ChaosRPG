const { Storage } = require('../storage')
const { UnitType } = require('../unit')

class StorageUtil {
    static isNodeValid(storage, node) {
        // check if the node id is valid
        let valid = ({
            [Storage.EQUIPMENT.id]: true.
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
        if (!isNodeValid(storage. node))
            return []

        let node = storage.find(e => e.id === node)
        return node
    }

    static isSlotValid(storage, node, slot) {
        if (!StorageUtil.isNodeValid(storage, node))
            return false

        if (slot >= 0 && slot < storage.size)
            return true

        return false
    }

    static isSlotOccupied(storage, node, slot) {
        if (!isSlotValid(storage, node, slot))
            return false

        return true
    }

    static getSlot(storage, node, slot) {
        if (!isSlotValid)
            return 0
        let node = getNode(storage, node)
        if (node)
    }
}

module.exports = { StorageUtil }
