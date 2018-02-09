const { StatTable } = require('./stattable')
const { Storage, Slots } = require('./storage')

const { StatUtil } = require('./util/stats')
const { StorageUtil } = require('./util/storage')

const CombatType = { }
CombatType.RANGED = { id: 0x10, name: "Ranged" }
CombatType.MELEE = { id: 0x20, name: "Hand to hand"}
CombatType.SPELL = { id: 0x30, name: "Spell"}

class CombatContext {
    constructor(game, unitA, unitB) {
        this.game = game
        this.unitA = unitA
        this.unitB = unitB

        this.attacker = null
        this.defender = null
    }

    // returns true if successfully
    setAttacker(id) {
        if (id !== this.unitA.id && id !== this.unitB.id)
            return false

        const isA = id === this.unitA.id

        if (isA) {
            this.attacker = this.unitA
            this.defender = this.unitB
        } else {
            this.attacker = this.unitB
            this.defender = this.unitA
        }

        return true
    }

    isAttackerSet() {
        return this.attacker !== null && this.defender !== null
    }

    swapAttacker() {
        if (!this.isAttackerSet())
            return false

        const isA = this.attacker.id === this.unitA.id

        if (isA) {
            this.attacker = this.unitB
            this.defender = this.unitA
        } else {
            this.attacker = this.unitA
            this.defender = this.unitB
        }

        return true
    }

    async resolveAttack() {
        if (!this.isAttackerSet())
            return false

        const combatType = await this.getCombatType(this.attacker)
        if (combatType === CombatType.MELEE) {
            let atk = StatUtil.getStat(this.attacker.stats, StatTable.UNIT_ATK.id)
            let def = StatUtil.getStat(this.defender.stats, StatTable.UNIT_DEF.id)

            if (atk.value === 0 && def.value === 0)
                return true

            let dmg = Math.floor(atk.value*atk.value / (atk.value+def.value))
            console.log(`${dmg} dmg attacker -> defender`)
            if (dmg > 0) {
                StatUtil.setStat(this.defender.stats, StatTable.UNIT_HP.id,
                    StatUtil.getStat(this.defender.stats, StatTable.UNIT_HP.id).value-dmg)
            }
        }

        return true
    }

    async getCombatType(unit) {
            let armR = StorageUtil.getSlot(unit.storage, Storage.EQUIPMENT.id, Slots.ARM_R)
            let armL = StorageUtil.getSlot(unit.storage, Storage.EQUIPMENT.id, Slots.ARM_L)

            let combatType = CombatType.MELEE

            if (armR === 0 && armL === 0)
                return combatType

            let unitItems = await this.game.gameDb.getUnitItems(unit.id)

            let itemArmR = unitItems.find(i => i.id === armR)
            let itemArmL = unitItems.find(i => i.id === armL)

            console.log(armR, armL, itemArmR, itemArmL)

            return combatType
        }
}

module.exports = { CombatType, CombatContext }
