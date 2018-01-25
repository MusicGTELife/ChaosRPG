const { MaterialClass, MaterialTier } = require('./material.js')

const MaterialTable = { }

MaterialTable.createEntry = (materialClass, tiers) => {
    let material = {
        material_class: materialClass,
        tiers: tiers
    }

    return material;
}

MaterialTable.CLOTH = createEntry(MaterialClass.CLOTH, [
    { tier: 0x01, name: "Hemp" },
    { tier: 0x02, name: "Cotton" },
    { tier: 0x03, name: "Wool" },
    { tier: 0x04, name: "Linen" },
    { tier: 0x05, name: "Jute" },
    { tier: 0x06, name: "Silk" }
])

MaterialTable.LEATHER = createEntry(MaterialClass.LEATHER, [
    { tier: 0x01, name: "Rawhide Leather" },
    { tier: 0x02, name: "Goat Skin" },
    { tier: 0x03, name: "Deer Skin" },
    { tier: 0x04, name: "Shark Skin" },
    { tier: 0x05, name: "Lizard Skin" },
    { tier: 0x06, name: "Dragon Scale" }
])

MaterialTable.CRYSTAL = createEntry(MaterialClass.CRYSTAL, [
    { tier: 0x01, name: "Quartz" },
    { tier: 0x02, name: "Jade" },
    { tier: 0x03, name: "Sapphire" },
    { tier: 0x04, name: "Emerald" },
    { tier: 0x05, name: "Topaz" },
    { tier: 0x06, name: "Diamond" }
])

MaterialTable.METAL = createEntry(MaterialClass.METAL, [
    { tier: 0x01, name: "Copper" },
    { tier: 0x02, name: "Bronze" },
    { tier: 0x03, name: "Iron" },
    { tier: 0x04, name: "Steel" },
    { tier: 0x05, name: "Chromium" },
    { tier: 0x06, name: "Carbide" }
])

module.exports = { MaterialTable }
