class TimePeriod {
    static getPeriodId(timestamp) {
        return Math.floor(timestamp / 1000 / 60 / 60)
    }
}

module.exports = { TimePeriod }
