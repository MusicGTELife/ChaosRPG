// okay break this into storage locations and storage flags
const StorageFlag = { }
StorageFlag.INVALID =           0x00
StorageFlag.INVENTORY =         0x01
StorageFlag.ARM_R =             0x01 << 0x01
StorageFlag.ARM_L =             0x01 << 0x02
StorageFlag.HEAD =              0x01 << 0x03
StorageFlag.HANDS =             0x01 << 0x04
StorageFlag.FEET =              0x01 << 0x05
StorageFlag.BODY =              0x01 << 0x06
StorageFlag.NECK =              0x01 << 0x07
StorageFlag.FINGER =            0x01 << 0x08
StorageFlag.WRIST =             0x01 << 0x09

StorageFlag.ANY =               0x01 << 0x19

StorageFlag.ARM =               StorageFlag.ARM_R | StorageFlag.ARM_L

module.exports = { StorageFlag }
