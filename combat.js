const { SecureRNG } = require('./rng')

const { UnitType } = require('./unit')
const { StatTable } = require('./stattable')

const { StatUtil } = require('./util/stats')
const { UnitUtil } = require('./util/unit')
const { PlayerUtil } = require('./util/player')

const SU = StatUtil
const ST = StatTable

const CombatType = { }
CombatType.RANGED = { id: 0x10, name: "Ranged" }
CombatType.MELEE = { id: 0x20, name: "Hand to hand"}
CombatType.SPELL = { id: 0x30, name: "Spell"}

const CombatEventType = { }
CombatEventType.MONSTER_DAMAGE = { id: 0x01, name: "Monster Damaged" }
CombatEventType.MONSTER_DEATH = { id: 0x02, name: "Monster Death" }
CombatEventType.MONSTER_ITEM_DROP = { id: 0x03, name: "Player Dropped Item" }

CombatEventType.PLAYER_DAMAGE = { id: 0x10, name: "Player Damaged" }
CombatEventType.PLAYER_DEATH = { id: 0x11, name: "Player Death" }
CombatEventType.PLAYER_ITEM_DROP = { id: 0x12, name: "Monster Dropped Item" }

CombatEventType.PLAYER_LEVEL = { id: 0x13, name: "Player Leveled" }
CombatEventType.PLAYER_EXPERIENCE = { id: 0x14, name: "Player Gained Experience" }

const DamageType = { }
DamageType.PHYSICAL =       0x01
DamageType.MAGIC =          0x02

class Damage {
    constructor(physical, magic) {
        this.physical = physical
        this.magic = magic
    }

    getDamage() {
        return {
            physical, magic
        }
    }
}

class CombatEvent {
    constructor(attacker, defender, type, data) {
        this.attacker = attacker
        this.defender = defender
        this.type = type
        this.data = data
    }

    getResult() {
        return {
            attacker, defender, type, data
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
        if (!UnitUtil.isAlive(this.unitA)) {
            console.log('unit is dead, but was expected to be alive')
            return null
        }

        if (!UnitUtil.isAlive(this.unitB)) {
            console.log('unit is dead, but was expected to be alive')
            return null
        }

        this.setFirstAttacker()

        // resolve attack
        let events = []
        let result = await this.resolveAttack()
        if (!result) {
            console.log('failed to resolve attack')
            return results
        }
        events = events.concat(result)
        if (events.find(e =>
                e.type === CombatEventType.PLAYER_DEATH ||
                e.type === CombatEventType.MONSTER_DEATH)) {

            return events
        }

        // toggle attacker
        this.swapAttacker()

        // resolve the counter-attack
        result = await this.resolveAttack()
        if (!result) {
            console.log('failed to resolve counter-attack')
            return results
        }
        events = events.concat(result)

        return events
    }

    async resolveAttack() {
        if (!this.isAttackerSet())
            return null

        const defIsPlayer = this.defender.type === UnitType.PLAYER.id
        let events = [ ]
        let eventType = null

        let baseAtk = SU.getStat(this.attacker.stats, ST.UNIT_BASE_ATK.id)
        let baseMAtk = SU.getStat(this.attacker.stats, ST.UNIT_BASE_MATK.id)
        let atk = SU.getStat(this.attacker.stats, ST.UNIT_ATK.id)
        let matk = SU.getStat(this.attacker.stats, ST.UNIT_MATK.id)
        let acc = SU.getStat(this.attacker.stats, ST.UNIT_ACCURACY.id)

        let def = SU.getStat(this.defender.stats, ST.UNIT_DEF.id)
        let mdef = SU.getStat(this.defender.stats, ST.UNIT_MDEF.id)

        // Resolve damage dealt, we scale each attack type down according to the
        // units accuracy roll
        let pAcc = this.getHitAccuracyRoll(this.attacker, acc)/100
        atk.value = Math.floor(baseAtk.value + baseAtk.value*atk.value/100)*1+pAcc
        let physDmg = this.resolveDamageDealt(atk, def)

        pAcc = this.getHitAccuracyRoll(this.attacker, acc)/100
        matk.value = Math.floor(baseMAtk.value + baseMAtk.value*matk.value/100)*1+pAcc
        let magicDmg = this.resolveDamageDealt(matk, mdef)

        let dmg = new Damage(physDmg, magicDmg)
        await UnitUtil.applyDamage(this.defender, physDmg+magicDmg)

        eventType = CombatEventType.MONSTER_DAMAGE
        if (defIsPlayer)
            eventType = CombatEventType.PLAYER_DAMAGE

        let event = new CombatEvent(this.attacker, this.defender, eventType, dmg)
        events.push(event)

        //console.log(`attacker did ${physDmg+magicDmg} (${physDmg}:${magicDmg}) damage`)

        if (!UnitUtil.isAlive(this.defender)) {
            eventType = CombatEventType.MONSTER_DEATH
            if (defIsPlayer)
                eventType = CombatEventType.PLAYER_DEATH

            event = new CombatEvent(this.attacker, this.defender, eventType)
            events.push(event)

            if (!defIsPlayer) {
                console.log('pre xp apply')
                let exp = 50 // FIXME hardcoded for now
                await PlayerUtil.applyExperience(this.attacker, exp)
                console.log('post xp apply')

                event = new CombatEvent(this.attacker, this.defender, CombatEventType.PLAYER_EXPERIENCE, exp)
                events.push(event)
            }
        }

        return events
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

module.exports = { CombatType, CombatContext, Damage, DamageType, CombatEventType }
