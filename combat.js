const { StatTable } = require('./stattable')
const { Storage, Slots } = require('./storage')

const { StatUtil } = require('./util/stats')
const { StorageUtil } = require('./util/storage')

const CombatType = { }
CombatType.RANGED = { id: 0x10, name: "Ranged" }
CombatType.MELEE = { id: 0x20, name: "Hand to hand"}
CombatType.SPELL = { id: 0x30, name: "Spell"}

const DamageType = { }
DamageType.PHYSICAL =       0x01
DamageType.MAGIC =          0x02

class Damage {
    constructor(type, amount) {
        this.type = type
        this.amount = amount
    }

    getDamage() {
        return {
            type, amount
        }
    }
}

class CombatResult {
    constructor(attacker, defender, damage) {
        this.attacker = attacker
        this.defender = defender
        this.damage = damage
        this.fatal = false
    }

    getResult() {
        return {
            attacker, defender, damage, fatal
        }
    }
}

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

    async resolveRound() {
       // resolve attack
        let results = []
        let result = await this.resolveAttack()
        if (!result) {
            console.log('failed to resolve attack')
            return results
        }
        results.push(result)

        if (result.fatal)
            return results

        // toggle attacker
        this.swapAttacker()

        // resolve the counter-attack
        result = await this.resolveAttack()
        if (!result) {
            console.log('failed to resolve counter-attack')
            return results
        }
        results.push(result)

        return results
    }

    async resolveAttack() {
        if (!this.isAttackerSet())
            return null

        let result = new CombatResult(
            this.attacker, this.defender, new Damage(DamageType.PHYSICAL, 0)
        )

        const combatType = await this.getCombatType(this.attacker)
        if (combatType === CombatType.MELEE) {
            let atk = StatUtil.getStat(this.attacker.stats, StatTable.UNIT_ATK.id)
            let def = StatUtil.getStat(this.defender.stats, StatTable.UNIT_DEF.id)

            if (atk.value === 0 && def.value === 0) {
                return result
            }

            let dmg = Math.floor(atk.value*atk.value / (atk.value+def.value))
            if (dmg > 0) {
                StatUtil.setStat(this.defender.stats, StatTable.UNIT_HP.id,
                    StatUtil.getStat(this.defender.stats, StatTable.UNIT_HP.id).value-dmg)
            } else {
                console.log('negative damage', dmg, result)
                process.exit()
            }

            if (StatUtil.getStat(this.defender.stats, StatTable.UNIT_HP.id).value <= 0)
                result.fatal = true

            result.damage.amount = dmg
            console.log(`attacker did ${dmg} damage`)
        }

        return result
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
