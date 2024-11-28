const amqp=require('amqplib')
const {defLogger } =require('./logger.js')
const logger=defLogger
const exchange = "info_exg";
const {createAccount} =require("./database.js")
let channel;


async function rabbitmqListen(queue){
  try {
		if (!channel) {
			console.warn("Channel is not established")
			throw new Error("Channel is not established")
		}
		channel.prefetch(1)
		await channel.consume(queue, (message) => {
      if (message !== null) {
        const routingKey = message.fields.routingKey;
        const content = JSON.parse(message.content.toString());
        if (routingKey.startsWith('message-account.create-account')) {
          const account_holder_id=content.customer_id
          const account_holder_name=content.customer_username
          const account_number=generateAccountNumber()
          createAccount(account_holder_id,account_holder_name,account_number).then(()=>{
            logger.info(`created account for ${account_holder_name}`)
            sendMessage(JSON.stringify({
              account_holder_id,
              account_number
          }),'message-customer.update-accno')
            channel.ack(message)
          }).catch((err)=>{
            logger.error(err.message)
            channel.nack(message, false, false);
          })
          return
      }
      channel.nack(message, false, false);
    
    }
    }, { noAck: false });
  }catch(err){
    logger.error(err.message)

  }  
}

function generateAccountNumber(){
  return '11009'+(Math.floor(Math.random() * 90000) + 10000);
}

function sendMessage(message,routingKey){
    if(channel){
  channel.publish(exchange, routingKey, Buffer.from(message), {
    persistent: true,
    // messageId,
    // mandatory: true,
  });}
}

async function startMQConnection(){
    try{
        logger.info("Trying to connect to RabbitMQ....");
        const connection = await amqp.connect("amqp://user:password@rabbitmq");
        channel = await connection.createChannel();  
        await channel.assertExchange(exchange, "topic", { durable: true });
        await channel.assertQueue('message-customer', {durable: true});
        await channel.bindQueue('message-customer', exchange, 'message-customer.#')
        await channel.assertQueue('message-account', { durable: true });
    await channel.bindQueue('message-account', exchange, 'message-account.#')
        logger.info("Connected to RabbitMQ.");
        
      
        process.once('SIGINT', () => {
          connection.close();
        });
        } catch (error) {
              console.warn(error);
              logger.error(error.message);
              if (error.message.includes("connect ECONNREFUSED")) {
                  setTimeout(() => startMQConnection(), 50000);
              } else if (error.message.includes("Channel is not established.")) {
                  setTimeout(() => startMQConnection(), 50000);
              }
          }
}

module.exports={
    sendMessage,
    startMQConnection,
    rabbitmqListen
}