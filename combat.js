const { SecureRNG } = require('./rng')

const { getExperienceForLevel } = require('./experience')

const { UnitType } = require('./unit')
const { StatTable } = require('./stattable')
const { Unit: UnitModel } = require('./models')
const { Storage } = require('./storage')

const { StorageUtil } = require('./util/storage')
const { StatUtil } = require('./util/stats')
const { UnitUtil } = require('./util/unit')
const { PlayerUtil } = require('./util/player')
const { MonsterUtil } = require('./util/monster')

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
    constructor(game, guild, unitA, unitB) {
        this.game = game
        this.guild = guild

        this.unitA = unitA
        this.unitB = unitB

        this.attacker = null
        this.defender = null

        this.message = null

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

        this.unitA = await this.game.gameDb.getUnit(this.unitA.id)
        this.unitB = await this.game.gameDb.getUnit(this.unitB.id)

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
                e.type === CombatEventType.PLAYER_DEATH.id ||
                e.type === CombatEventType.MONSTER_DEATH.id)) {

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

        //this.defender = await this.game.gameDb.getUnit(this.defender.id)
        //this.attacker = await this.game.gameDb.getUnit(this.attacker.id)

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
        atk.value = Math.ceil((baseAtk.value + baseAtk.value*atk.value/100)*pAcc)
        let physDmg = this.resolveDamageDealt(atk, def)

        pAcc = this.getHitAccuracyRoll(this.attacker, acc)/100
        matk.value = Math.ceil((baseMAtk.value + baseMAtk.value*matk.value/100)*pAcc)
        let magicDmg = this.resolveDamageDealt(matk, mdef)

        let dmg = new Damage(physDmg, magicDmg)
        await UnitUtil.applyDamage(this.defender, physDmg+magicDmg)
        this.defender = await UnitModel.findOneAndUpdate({ id: this.defender.id },
            { stats: this.defender.stats },
            { new: true }
        )

        eventType = CombatEventType.MONSTER_DAMAGE.id
        if (defIsPlayer)
            eventType = CombatEventType.PLAYER_DAMAGE.id

        let event = new CombatEvent(this.attacker, this.defender, eventType, dmg)
        events.push(event)

        if (!UnitUtil.isAlive(this.defender))
            events = events.concat(await this.resolveDeath())
        //console.log(`attacker did ${physDmg+magicDmg} (${physDmg}:${magicDmg}) damage`)

        return events
    }

    async resolveDeath() {
        let events = [ ]

        let defIsPlayer = this.defender.type === UnitType.PLAYER.id

        let eventType = CombatEventType.MONSTER_DEATH.id
        if (defIsPlayer)
            eventType = CombatEventType.PLAYER_DEATH.id

        let event = new CombatEvent(this.attacker, this.defender, eventType)
        events.push(event)

        if (defIsPlayer) {
            // TODO add experience deduction on player and a small chance of
            // item loss on death
            return events
        }

        // okay, a monster has died, give experience and drop items
        let nextLevelXp = getExperienceForLevel(this.attacker.level+1)
        let currXp = PlayerUtil.getExperience(this.attacker)
        let exp = MonsterUtil.getExperienceReward(this.defender, this.attacker)

        this.attacker = await PlayerUtil.applyExperience(this.attacker, exp)
        event = new CombatEvent(this.attacker, this.defender, CombatEventType.PLAYER_EXPERIENCE.id, exp)
        events.push(event)

        if (currXp+exp > nextLevelXp) {
            PlayerUtil.applyLevelGain(this.attacker)

            eventType = CombatEventType.PLAYER_LEVEL.id
            event = new CombatEvent(this.attacker, this.defender, eventType)
            events.push(event)
        }

        let monsterItems = await this.game.unit.getItems(this.defender)
        if (!monsterItems)
            return events

        // Drop items
        let equipped = false
        await Promise.all(monsterItems.map(async i => {
            let magic = SecureRNG.getRandomInt(this.rngCtx, 0, 9)
            if (magic !== 9) {
                return this.game.gameDb.removeItem(i)
            }

            console.log('will drop item', i)

            let slots = StorageUtil.getValidSlotsForItem(this.attacker.storage, i)
                .filter(st => StorageUtil.canEquipInSlot(this.attacker.storage, st.id, st.slot))
            if (!slots) {
                return this.game.gameDb.removeItem(i)
            }

            let slot = slots.find(st => st.id === Storage.INVENTORY.id)
            if (!slot) {
                return this.game.gameDb.removeItem(i)
            }

            i.owner = this.attacker.id
            let equipSuccess = this.game.unit.equipItem(this.attacker, null, i, slot.id, slot.slot)
            if (!equipSuccess) {
                // no storage slot available, the item burns
                this.game.gameDb.removeItem(i)

                console.log('unable to equip item in empty inv slot')
                process.exit(1)
            }

            eventType = CombatEventType.MONSTER_ITEM_DROP.id
            event = new CombatEvent(this.attacker, this.defender, eventType, i)
            events.push(event)

            console.log('saving item to player')

            await i.save()
            this.attacker.markModified('stats')
            this.attacker.markModified('storage')
            this.attacker.markModified('descriptor')
            await this.attacker.save()
        }))

        console.log('resolveDeath update unit')
        /*
        await UnitModel.findOneAndUpdate({ id: this.attacker.id },
            { stats: this.attacker.stats, storage: this.attacker.storage },
            { new: true }, (err, res) => {
                if (err)
                    console.log('err', err)
                else {
                    console.log(
                        res.isModified(),
                        res.isModified('descriptor'),
                        res.isDirectModified('descriptor'),
                        err, res
                    )
                    this.attacker = res
                }
            }
        )*/

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
