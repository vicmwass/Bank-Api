const pino =require('pino')
const pretty =require( 'pino-pretty')

const defLogger = pino(pretty())
const infoLogger=pino(pino.destination('./app.log'))

defLogger.level = process.env.LOG_LEVEL || 'trace'
infoLogger.level = process.env.LOG_LEVEL || 'trace'

module.exports ={
    defLogger,infoLogger
}
  