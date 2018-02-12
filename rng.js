const crypto = require('crypto')
const assert = require('assert')

class SecureRNGContext {
    constructor(secret, counter) {
        if ((typeof secret) !== 'string')
            throw new TypeError('You must supply a string secret')

        if (counter !== undefined && (typeof counter) !== 'number')
            throw new TypeError('You must supply a numeric counter')

        if (secret === '')
            throw new Error('You must provide a secret value to seed the HMAC')

        this.secret = secret
        this.hmacBits = 256
        this.counter = counter || 0
        this.currentOffset = 0

        this.hmac = crypto.createHmac('sha256', secret).update(this.counter.toString())
            .digest()
    }
}

// operates on a SecureRNGContext
class SecureRNG {
    constructor() {
        this.contexts = new Map()
    }

    getContext(name) {
        return this.contexts.get(name)
    }

    addContext(ctx, name) {
        if (!SecureRNG.validateContext(ctx))
            throw new Error('invalid context')

        if (this.getContext(name))
            return false

        this.contexts.set(name, ctx)

        return true
    }

    removeContext(name) {
        if (!this.getContext(name))
            return false

        this.contexts.delete(name)

        return true
    }

    static validateContext(ctx) {
        // I hate javascript

        try {
            if (!(ctx instanceof SecureRNGContext))
                throw new TypeError('invalid context')

            if (!(ctx.hmac instanceof Buffer))
                throw new TypeError('invalid hmac')

            if (ctx.hmac.length*8 !== ctx.hmacBits)
                throw new Error(`invalid digest length ${ctx.hmac.length}`)
        } catch (e) {
            return false
        }

        return true
    }

    // TODO
    static getIntSequence(ctx, count, range, unique = false) {

    }

    static shuffleSequence(ctx, sequence, shuffles) {
        if (!SecureRNG.validateContext(ctx))
            throw new Error('invalid context')

        if (sequence.length < 2)
            throw new RangeError('sequence length must be greater than 1')

        if (sequence.length === 2) {
            let magic = SecureRNG.getRandomInt(ctx, 0, 1)
            console.log('magic', magic)
            if (magic === 0)
                return [ sequence[1], sequence[0] ]
            else
                return sequence
        }

        return sequence.map(a => [SecureRNG.getRandomInt(ctx, -127, 128), a])
            .sort((a, b) => a[0] - b[0])
            .map((a) => a[1])
    }

    static getRandomInt(ctx, min, max) {
        if (!SecureRNG.validateContext(ctx))
            throw new Error('invalid context')

        if (min >= max)
            throw new RangeError('min >= max')

        const range = max-min
        const bitsRequired = Math.ceil(Math.log2(range+1))

        let val = SecureRNG.getBits(ctx, bitsRequired)
        do {
            //console.log('out of range, reading next chunk', val.bits, range, ctx.currentOffset)
            ctx.currentOffset += 8
            val = SecureRNG.getBits(ctx, bitsRequired)

        } while(val.bits > range)

        ctx.currentOffset += val.read

        return max-range+val.bits
    }

    static getBits(ctx, num) {
        if (!SecureRNG.validateContext(ctx))
            throw new Error('invalid context')

        if (num > 48)
            throw new RangeError('You can parse at most 48 bits at a time')

        if (num < 1)
            throw new RangeError('You must parse at least 1 bit at a time')

        const bytesToRead = Math.ceil(num/8)
        if (ctx.currentOffset + bytesToRead*8 > ctx.hmacBits)
            SecureRNG.getNextHmac(ctx)

        // currently using byte level granularity reads, if the result exceeds
        // the requested range we simplytaking the first N characters and parsing the result
        const bitsRead = ctx.hmac.readUIntLE(ctx.currentOffset/8, bytesToRead)

        ctx.currentOffset += bytesToRead*8

        //console.log(`requested ${num}, read ${bytesToRead*8}`)

        return { requested: num, read: bytesToRead*8, bits: bitsRead }
    }

    static getNextHmac(ctx) {
        if (!SecureRNG.validateContext(ctx))
            throw new Error('invalid context')

        ctx.hmac = crypto.createHmac('sha256', ctx.secret)
            .update(ctx.counter.toString())
            .digest()

        ctx.currentOffset = 0
        ctx.counter++

        if (!SecureRNG.validateContext(ctx))
            throw new Error('invalid context')

        //console.log(`${ctx.hmac.toString()}-${ctx.counter}`)

        return ctx.hmac
    }
}

module.exports = { SecureRNGContext, SecureRNG }
