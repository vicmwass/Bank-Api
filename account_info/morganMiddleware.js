const morgan =require('morgan')
const {infoLogger ,defLogger} =require('./logger.js')
const logger=infoLogger
const logger2=defLogger

const morganFormat = `
{    "method": ":method",    "url": ":url",    "status": ":status",    "response-time": ":response-time",    "ip_addr": ":remote-addr"}`

function messageHandler (message) {
  const data= JSON.parse(message.trim())
  logger.info('Request received '+message.trim())
  logger2.info(`Request received :: ${data.method} ${data.url} status:${data.status} from_ip:${data.ip_addr}`)
}

const morganMiddleware = morgan(
  morganFormat,
  {
    stream: { write: messageHandler }
  }
)

module.exports=morganMiddleware
