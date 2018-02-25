const { SecureRNG } = require('./rng')

const { getExperienceForLevel } = require('./experience')

const { UnitType } = require('./unit')
const { StatTable } = require('./stattable')
const { Unit: UnitModel } = require('./models')
const { Storage } = require('./storage')
const { MonsterRarity } = require('./monsterrarity.js')
const { MonsterTable } = require('./monstertable')

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

CombatEventType.BLOCK = { id: 0x20, name: "Blocked" }

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
            physical: this.physical, magic: this.magic
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
    constructor(game, guild) {
        this.inCombat = false
        this.game = game
        this.guild = guild

        this.unitA = null
        this.unitB = null

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

    // FIXME move this somewhere else
    static getFightMonsterRarity(value) {
        if (value >= MonsterRarity.SUPERBOSS.rarity)
            return MonsterRarity.SUPERBOSS
        else if (value >= MonsterRarity.BOSS.rarity)
            return MonsterRarity.BOSS
        else if (value >= MonsterRarity.UNIQUE.rarity)
            return MonsterRarity.UNIQUE
        else if (value >= MonsterRarity.RARE.rarity)
            return MonsterRarity.RARE
        else if (value >= MonsterRarity.MAGIC.rarity)
            return MonsterRarity.MAGIC

        return MonsterRarity.COMMON
    }

    async getUnitsForCombat(online) {
        let rngCtx = this.game.secureRng.getContext('combat')
        if (!rngCtx) {
            console.log('unable to get combat RNG context')
            return null
        }

        if (!online || online.length < 1) {
            console.log('not enough online players, skipping combat')
            return null
        }

        if (online.length > 1)
            online = SecureRNG.shuffleSequence(rngCtx, online)

        await Promise.all(online.map(async u => {
            //if (!UnitUtil.isAlive(u)) {
                // NOTE just temporary
                console.log('resurrecting player unit')
                StatUtil.setStat(u.stats, StatTable.UNIT_HP.id,
                    StatUtil.getStat(u.stats, StatTable.UNIT_HP_MAX.id).value)

                u = await UnitModel.findOneAndUpdate(
                    { id: u.id },
                    { stats: u.stats },
                    { new: true }
                )
            //}
        }))

        let units = []
        units.push(online.pop())

        let pvp = false
        const wantPvp = SecureRNG.getRandomInt(rngCtx, 0, 127) === 127
        if (wantPvp) {
            online.map(o => {
                const diff = Math.abs(o.level-units[0].level)
                const range = Math.round(units[0].level * 0.1)+1
                if (!pvp && diff <= range) {
                    pvp = true
                    units.push(o)
                }
            })
        }

        if (pvp) {
            console.log('pvp combat selected')
        } else {
            console.log('monster combat selected')

            const settings = await this.game.gameDb.getSettings()
            const monsterRngCtx = this.game.secureRng.getContext('monster')
            if (!monsterRngCtx) {
                console.log('unable to get monster RNG context')
                return null
            }

            let magic = SecureRNG.getRandomInt(rngCtx, 0, MonsterRarity.SUPERBOSS.rarity)
            const monsterRarity = CombatContext.getFightMonsterRarity(magic)

            let shuffledTable = SecureRNG.shuffleSequence(monsterRngCtx, Object.values(MonsterTable))

            // generate a monster
            const range = 1 + Math.round(units[0].level * 0.1)
            const code = shuffledTable.shift().code
            const diff = SecureRNG.getRandomInt(rngCtx, -(range*2), range)
            const level = Math.max(1, units[0].level+diff)

            console.log(`creating level ${level} ${monsterRarity.name}(${magic}) monster for combat`)

            const monsterData = this.game.monster.generate(monsterRngCtx, code, level, monsterRarity.id)
            if (!monsterData) {
                console.log('failed creating a monster')
                return null
            }
            const monster = await this.game.unit.prepareGeneratedUnit(monsterData, settings)
            units.push(monster)
        }

        return units
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

        let baseAtk = SU.getStat(this.attacker.stats, ST.UNIT_BASE_ATK.id)
        let baseMAtk = SU.getStat(this.attacker.stats, ST.UNIT_BASE_MATK.id)
        let atk = SU.getStat(this.attacker.stats, ST.UNIT_ATK.id)
        let matk = SU.getStat(this.attacker.stats, ST.UNIT_MATK.id)
        let acc = SU.getStat(this.attacker.stats, ST.UNIT_ACCURACY.id)
        let attackReact = SU.getStat(this.attacker.stats, ST.UNIT_REACTION.id)

        let def = SU.getStat(this.defender.stats, ST.UNIT_DEF.id)
        let mdef = SU.getStat(this.defender.stats, ST.UNIT_MDEF.id)
        let block = SU.getStat(this.defender.stats, ST.UNIT_BLOCK.id)
        let defendReact = SU.getStat(this.defender.stats, ST.UNIT_REACTION.id)

        // Unsure if I'll do dodge yet, but is so, it will be based on reaction
        let attackReactRoll = SecureRNG.getRandomInt(this.rngCtx, 0, attackReact.value)
        let defendReactRoll = SecureRNG.getRandomInt(this.rngCtx, 0, defendReact.value)

        let blocked = false
        if (block.value) {
            let magic  = SecureRNG.getRandomInt(this.rngCtx, 0, 100)
            if (magic < block.value)
                blocked = true
        }
        console.log('block', block.value)

        if (blocked) {
            console.log('blocked', this.attacker.name, this.defender.name)

            eventType = CombatEventType.BLOCK.id
            let event = new CombatEvent(this.attacker, this.defender, eventType)
            events.push(event)
            return events
        }

        // Resolve damage dealt, we scale each attack type down according to the
        // units accuracy roll
        let pAcc = this.getHitAccuracyRoll(this.attacker, acc.value)/100
        atk.value = Math.ceil((baseAtk.value + baseAtk.value*atk.value/100)*pAcc)
        let pCrit = false
        if (atk.value && pAcc > 0.99) {
            pCrit = true
            console.log('phys crit', atk.value)
            const roll = SecureRNG.getRandomInt(this.rngCtx, acc.value, 10000)
            atk.value = Math.round(atk.value*(1+roll/10000))
            console.log('phys crit2', atk.value, roll/10000)
        }

        pAcc = this.getHitAccuracyRoll(this.attacker, acc.value)/100
        matk.value = Math.ceil((baseMAtk.value + baseMAtk.value*matk.value/100)*pAcc)
        let mCrit = false
        if (matk.value && pAcc > 0.99) {
            mCrit = true
            console.log('magic crit', matk.value)
            const roll = SecureRNG.getRandomInt(this.rngCtx, acc.value, 10000)
            matk.value = Math.round(matk.value*(1+roll/10000))
            console.log('magic crit2', matk.value, roll/10000)
        }

        let physDmg = this.resolveDamageDealt(atk, def)
        let magicDmg = this.resolveDamageDealt(matk, mdef)
        let dmg = new Damage(
            { damage: physDmg, is_crit: pCrit },
            { damage: magicDmg, is_crit: mCrit }
        )

        UnitUtil.applyDamage(this.defender, physDmg+magicDmg)
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

        let deathEvent = CombatEventType.MONSTER_DEATH.id
        if (defIsPlayer)
            deathEvent = CombatEventType.PLAYER_DEATH.id

        let eventType = deathEvent
        let event = new CombatEvent(this.attacker, this.defender, eventType)
        events.push(event)

        if (defIsPlayer) {
            // TODO add experience deduction on player and a small chance of
            // item loss on death
            this.inCombat = false
            return events
        }

        // okay, a monster has died, give experience and drop items
        let nextLevelXp = getExperienceForLevel(this.attacker.level+1)
        let currXp = PlayerUtil.getExperience(this.attacker)
        let exp = MonsterUtil.getExperienceReward(this.defender)

        this.attacker = await PlayerUtil.applyExperience(this.attacker, exp)
        event = new CombatEvent(this.attacker, this.defender, CombatEventType.PLAYER_EXPERIENCE.id, exp)
        events.push(event)

        if (currXp+exp >= nextLevelXp) {
            PlayerUtil.applyLevelGain(this.attacker)

            eventType = CombatEventType.PLAYER_LEVEL.id
            event = new CombatEvent(this.attacker, this.defender, eventType)
            events.push(event)
        }

        let monsterItems = await this.game.unit.getItems(this.defender)
        if (!monsterItems) {
            this.inCombat = false
            return events
        }

        // Drop items
        let equipped = false
        await Promise.all(monsterItems.map(async i => {
            let magic = SecureRNG.getRandomInt(this.rngCtx, 0, 9)
            if (magic !== 9) {
                return this.game.gameDb.removeItem(i)
            }

            let slots = StorageUtil.getValidSlotsForItem(this.attacker.storage, i)
                .filter(st => StorageUtil.canEquipInSlot(this.attacker.storage, st.id, st.slot))
            if (!slots) {
                return this.game.gameDb.removeItem(i)
            }

            let slot = slots.find(st => st.id === Storage.INVENTORY.id)
            if (!slot) {
                return this.game.gameDb.removeItem(i)
            }

            console.log('will drop item', i)

            i.owner = this.attacker.id
            let equipSuccess = this.game.unit.equipItem(this.attacker, null, i, slot.id, slot.slot)
            if (!equipSuccess) {
                console.log('unable to equip item in empty inv slot')
                this.game.gameDb.removeItem(i)
                process.exit(1)

                // no storage slot available, the item burns
            }

            eventType = CombatEventType.MONSTER_ITEM_DROP.id
            event = new CombatEvent(this.attacker, this.defender, eventType, i)
            events.push(event)

            //console.log('saving item to player')

            return i.save()
        }))

        await this.game.gameDb.removeUnit(this.defender)
        this.inCombat = false

        this.attacker.markModified('stats')
        this.attacker.markModified('storage')
        this.attacker.markModified('descriptor')
        await this.attacker.save()

        return events
    }

    resolveDamageDealt(attack, defense) {
        //const pDef = defense.value/100
        let dmg = Math.ceil(attack.value*attack.value / (attack.value+defense.value*0.5))
        if (dmg < 0) {
            console.log('negative damage', dmg, attack, defense)
            process.exit()
        }

        if (attack.value === 0 && defense.value === 0) {
            return 0
        }

        return dmg
    }

    getHitAccuracyRoll(unit, accuracy) {
        // Scale attack down according to accuracy roll
        let pAcc = SecureRNG.getRandomInt(this.rngCtx, accuracy, 10000)
        let acc = Math.max(1, pAcc/100)

        //console.log(`acc roll ${UnitUtil.getName(unit)} ${accuracy} ${pAcc} ${acc}`)
        return acc
    }
}

module.exports = { CombatType, CombatContext, Damage, DamageType, CombatEventType }
