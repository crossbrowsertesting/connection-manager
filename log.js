function timestamp(){
    return new Date().toISOString()
}

class Logger{

    constructor(currentLevel){

        this.levels = ['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'OFF']

        this.changeLevel(currentLevel)


    }

    changeLevel(newLevel){

        if (typeof newLevel === 'undefined'){
            // default to INFO level
            newLevel = "INFO"
        }

        if (typeof newLevel === 'string'){
            newLevel = this.levels.indexOf(newLevel.toUpperCase())
        }         

        // make sure our log level is valid
        if (newLevel < 0) {
            // level not found -- use most verbose
            newLevel = 0
        } else if (newLevel > this.levels.length - 1) {
            // level beyond ERROR specified -- use least verbose
            newLevel = this.levels.length - 1
        }
        
        this.currentLevel = newLevel
    }

    _log(level, logLinesIterable){
        // the pad is to make the log entries line up for all log levels
        let logstr = `${timestamp()} [${level.padStart(5)}] - ${logLinesIterable.join(' ')}`
        if (this.levels.indexOf(level) >= this.currentLevel){
            console.log(logstr)
        }
    }

    trace(...logLinesIterable){
        this._log('TRACE', logLinesIterable)
    }

    debug(...logLinesIterable){
        this._log('DEBUG', logLinesIterable)
    }

    info(...logLinesIterable){
        this._log('INFO', logLinesIterable)
    }

    warn(...logLinesIterable){
        this._log('WARN', logLinesIterable)
    }

    error(...logLinesIterable){
        this._log('ERROR', logLinesIterable)
    }

}

module.exports = Logger
