const StorageFlag = { }
StorageFlag.ARM_R =             0x01
StorageFlag.ARM_L =             0x01 << 0x01
StorageFlag.HEAD =              0x01 << 0x02
StorageFlag.HANDS =             0x01 << 0x03
StorageFlag.FEET =              0x01 << 0x04
StorageFlag.BODY =              0x01 << 0x05
StorageFlag.NECK =              0x01 << 0x06
StorageFlag.FINGER =            0x01 << 0x07
StorageFlag.WRIST =             0x01 << 0x08
StorageFlag.CHARM =             0x01 << 0x10
StorageFlag.ANY =               0x01 << 0x19

StorageFlag.ARM =               StorageFlag.ARM_R | StorageFlag.ARM_L

module.exports = { StorageFlag }
