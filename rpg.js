const { Game } = require('./game')

async function init() {
        let game = new Game()

        console.log('running game')
        await game.run()
}

function syncinit() {
    init()
}

syncinit()
