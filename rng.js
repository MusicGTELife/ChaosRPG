function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min
}

function getRandomShuffle(seq) {
    return seq.map(a => [Math.random(), a])
        .sort((a, b) => a[0] - b[0])
        .map((a) => a[1])
}

module.exports = { getRandomInt, getRandomShuffle }
