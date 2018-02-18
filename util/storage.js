const { ItemUtil } = require('./item')

const { Storage, Slots } = require('../storage')
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

        let storage = [
            {
                id: Storage.EQUIPMENT.id,
                size: Storage.EQUIPMENT.size,
                buffer: new Array(Storage.EQUIPMENT.size).fill(0)
            }, {
                id: Storage.INVENTORY.id,
                size: Storage.INVENTORY.size,
                buffer: new Array(Storage.INVENTORY.size).fill(0)
            }
        ]

        return storage
    }

    static getStorageTableEntry(id) {
        return Object.values(Storage).find(s => s.id === id)
    }

    static getStorageSlotDescriptor(nodeId, slotId) {
        let entry = StorageUtil.getStorageTableEntry(nodeId)
        if (!entry)
            return null

        return entry.descriptor.find(sd => sd.id === slotId)
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

        return storage.find(e => e.id === nodeId) || null
    }

    static getSlotIndexFromId(nodeId, slotId) {
        let entry = StorageUtil.getStorageTableEntry(nodeId)
        if (!entry)
            return -1

        const slot = entry.descriptor.findIndex(sd => sd.id === slotId)
        return slot
    }

    static isSlotValid(storage, nodeId, slotId) {
        if (!StorageUtil.isNodeValid(storage, nodeId))
            return false

        const node = StorageUtil.getNode(storage, nodeId)
        const slot = StorageUtil.getSlotIndexFromId(nodeId, slotId)
        if (slot < 0 || slot > node.size-1)
            return false

        return true
    }

    static isSlotOccupied(storage, nodeId, slotId) {
        if (!StorageUtil.isSlotValid(storage, nodeId, slotId))
            return false

        return StorageUtil.getSlot(storage, nodeId, slotId) !== 0
    }

    static getSlot(storage, nodeId, slotId) {
        if (!StorageUtil.isSlotValid(storage, nodeId, slotId))
            return 0

        let node = StorageUtil.getNode(storage, nodeId)
        if (node && node.buffer) {
            let slot = StorageUtil.getSlotIndexFromId(nodeId, slotId)
            if (slot < 0)
                return 0

            return node.buffer[slot]
        }

        return 0
    }

    static setSlot(storage, nodeId, slotId, itemId) {
        if (!StorageUtil.isSlotValid(storage, nodeId, slotId))
            return false

        if (itemId < 0)
            return false

        let node = StorageUtil.getNode(storage, nodeId)
        if (node && node.buffer) {
            let slot = StorageUtil.getSlotIndexFromId(nodeId, slotId)
            if (slot < 0)
                return false

            if (node.buffer[slot] !== 0)
                return false

            node.buffer[slot] = itemId
            return true
        }

        return false
    }

    static getSlotTypeForItem(storage, item) {
        if ((item.storage_flag & StorageFlag.HEAD) !== 0)
            return StorageFlag.HEAD

        if ((item.storage_flag & StorageFlag.BODY) !== 0)
            return StorageFlag.BODY

        if ((item.storage_flag & StorageFlag.HANDS) !== 0)
            return StorageFlag.HANDS

        if ((item.storage_flag & StorageFlag.FEET) !== 0)
            return StorageFlag.FEET

        if ((item.storage_flag & StorageFlag.ARM_R) !== 0)
            return StorageFlag.ARM_R

        if ((item.storage_flag & StorageFlag.ARM_L) !== 0)
            return StorageFlag.ARM_L

        if ((item.storage_flag & StorageFlag.NECK) !== 0)
            return StorageFlag.NECK

        if ((item.storage_flag & StorageFlag.WRIST) !== 0)
            return StorageFlag.WRIST

        if ((item.storage_flag & StorageFlag.FINGER) !== 0)
            return StorageFlag.FINGER

        if ((item.storage_flag & StorageFlag.INVENTORY) !== 0)
            return StorageFlag.INVENTORY

        console.log('unable to match flag', ItemUtil.getName(item.code))
        process.exit(1)

        return StorageFlag.INVALID
    }

    static getValidSlotsForItem(storage, item) {
        if (!storage)
            return []

        if (!item)
            return []

        let out = []

        Object.values(Storage).map(e => {
            let slots = e.descriptor
                .filter(d => (d.flags & item.storage_flag) !== 0)
                .map(d => ({ id: e.id, slot: d.id}))

            out = out.concat(slots)
        })

        //console.log('slots', out)

        return out
    }

    static canEquipItemTypeInSlot(storage, nodeId, slotId, itemCode) {
        if (!StorageUtil.isSlotValid(storage, nodeId, slotId))
            return false

        const itemTableEntry = ItemUtil.getItemTableEntry(itemCode)
        if (!itemTableEntry)
            return false

        let slotDesc = StorageUtil.getStorageSlotDescriptor(nodeId, slotId)
        if (!slotDesc)
            return false

        return (itemTableEntry.storage_flag & slotDesc.flags) !== 0
    }

    static canEquipInSlot(storage, nodeId, slotId) {
        if (!StorageUtil.isSlotValid(storage, nodeId, slotId))
            return false

        if (StorageUtil.isSlotOccupied(storage, nodeId, slotId))
            return false

        return true
    }
}

module.exports = { StorageUtil }
