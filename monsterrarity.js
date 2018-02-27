const MonsterRarity = { }
MonsterRarity.COMMON =      { 'id': 0x01, 'rarity': 0, 'name': 'Common' }
MonsterRarity.MAGIC =       { 'id': 0x02, 'rarity': 62500, 'name': 'Magic' }
MonsterRarity.RARE =        { 'id': 0x03, 'rarity': 64000, 'name': 'Rare' }
MonsterRarity.UNIQUE =      { 'id': 0x04, 'rarity': 65000, 'name': 'Unique' }
MonsterRarity.BOSS =        { 'id': 0x05, 'rarity': 65500, 'name': 'Boss' }
MonsterRarity.SUPERBOSS =   { 'id': 0x06, 'rarity': 65535, 'name': 'Super Boss' }

module.exports = { MonsterRarity }
