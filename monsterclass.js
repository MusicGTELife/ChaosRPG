const MonsterClass = { }
MonsterClass.UNDEAD =           0x01
MonsterClass.BEAST =            0x01 << 1
MonsterClass.HUMANOID =         0x01 << 2
MonsterClass.ETHEREAL =         0x01 << 3
MonsterClass.DEMON =            0x01 << 4

module.exports = { MonsterClass }
