const MonsterClass = { }
MonsterClass.UNDEAD =           0x01
MonsterClass.BEAST =            0x02
MonsterClass.HUMANOID =         0x03
MonsterClass.ETHEREAL =         0x04
MonsterClass.DEMON =            0x05

const UndeadClass = { }
UndeadClass.SKELETON =          0x01
UndeadClass.ZOMBIE =            0x02
UndeadClass.REMAINS =           0x03

const BeastClass = { }
BeastClass.MAMMAL =             0x01
BeastClass.WINGED =             0x02
BeastClass.ARTHROPOD =          0x03

const HumanoidClass = { }
HumanoidClass.BANDIT =          0x01
HumanoidClass.TAKEN =           0x02
HumanoidClass.DARKSWORN =       0x03

const EtherealClass = { }
EtherealClass.SPRITE =          0x01
EtherealClass.GHOST =           0x02
EtherealClass.WIZARD =          0x03

const DemonClass = { }
DemonClass.SERVANT =            0x01
DemonClass.GHOUL =              0x02
DemonClass.COMMANDER =          0x03

module.exports = {
    MonsterClass,
    UndeadClass, BeastClass, HumanoidClass, EtherealClass, DemonClass
}
