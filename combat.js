const { SecureRNG } = require('./rng')

const { StatTable } = require('./stattable')

const { StatUtil } = require('./util/stats')
const { UnitUtil } = require('./util/unit')

const SU = StatUtil
const ST = StatTable

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
        this.damage = [ ]
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

        this.rngCtx = this.game.secureRng.getContext('combat')
        if (!this.rngCtx) {
            throw new Error('Unable to get combat RNG context')
        }
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

    setFirstAttacker() {
        let reactA = SU.getStat(this.unitA.stats, ST.UNIT_REACTION.id)
        let reactB = SU.getStat(this.unitB.stats, ST.UNIT_REACTION.id)

        let magicA = SecureRNG.getRandomInt(this.rngCtx, 0, reactA.value)
        let magicB = SecureRNG.getRandomInt(this.rngCtx, 0, reactB.value)

        if (magicA > magicB) {
            this.setAttacker(this.unitA.id)
        } else {
            this.setAttacker(this.unitB.id)
        }

        return true
    }

    async resolveRound() {
        if (SU.getStat(this.unitA.stats, ST.UNIT_HP.id).value <= 0) {
            console.log('unit is dead, but was expected to be alive')
            return null
        }

        if (SU.getStat(this.unitB.stats, ST.UNIT_HP.id).value <= 0) {
            console.log('unit is dead, but was expected to be alive')
            return null
        }

        this.setFirstAttacker()

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

        let result = new CombatResult(this.attacker, this.defender)

        let baseAtk = SU.getStat(this.attacker.stats, ST.UNIT_BASE_ATK.id)
        let baseMAtk = SU.getStat(this.attacker.stats, ST.UNIT_BASE_MATK.id)
        let atk = SU.getStat(this.attacker.stats, ST.UNIT_ATK.id)
        let matk = SU.getStat(this.attacker.stats, ST.UNIT_MATK.id)
        let acc = SU.getStat(this.attacker.stats, ST.UNIT_ACCURACY.id)

        let def = SU.getStat(this.defender.stats, ST.UNIT_DEF.id)
        let mdef = SU.getStat(this.defender.stats, ST.UNIT_MDEF.id)

        // Scale attack down according to accuracy roll
        let pAcc = this.getHitAccuracyRoll(this.attacker, acc)/100
        atk.value = Math.floor(baseAtk.value + baseAtk.value*atk.value/100)
        atk.value *= pAcc
        let physDmg = this.resolveDamageDealt(atk, def)
        let dr = new Damage(DamageType.PHYSICAL, physDmg)
        result.damage.push(dr)

        pAcc = this.getHitAccuracyRoll(this.attacker, acc)/100
        matk.value = Math.floor(baseMAtk.value + baseMAtk.value*matk.value/100)
        matk.value *= pAcc
        let magicDmg = this.resolveDamageDealt(matk, mdef)
        dr = new Damage(DamageType.MAGIC, magicDmg)
        result.damage.push(dr)

        //console.log(`attacker did ${physDmg+magicDmg} (${physDmg}/${magicDmg}) damage`)

        await UnitUtil.takeDamage(this.defender, physDmg+magicDmg)
        if (SU.getStat(this.defender.stats, ST.UNIT_HP.id).value <= 0)
            result.fatal = true

        return result
    }

    resolveDamageDealt(attack, defense) {
        const pDef = defense.value/100
        let dmg = Math.ceil(attack.value*attack.value / (attack.value+pDef))
        if (dmg < 0) {
            console.log('negative damage', pDmg, atk)
            process.exit()
        }

        if (attack.value === 0 && defense.value === 0) {
            return 0
        }

        return dmg
    }

    getHitAccuracyRoll(unit, accuracy) {
        // Scale attack down according to accuracy roll
        let pAcc = Math.max(1, Math.floor(accuracy.value/100))
        let accMagic = SecureRNG.getRandomInt(this.rngCtx, pAcc, 100)

        //console.log(`acc roll ${UnitUtil.getName(unit)} ${accuracy} ${pAcc} ${accMagic}`)
        return accMagic
    }
}

module.exports = { CombatType, CombatContext, Damage, DamageType }
