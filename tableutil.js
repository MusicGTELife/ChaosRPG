const Table = {
    create(createEntryFunc) {
        let table = { 'createEntry': createEntryFunc }
        Table.hide(table, 'createEntry')

        return table
    },

    hide(obj, key) {
        Object.defineProperty(obj, key, { 'enumerable': false })
    }
}

module.exports = { Table }
