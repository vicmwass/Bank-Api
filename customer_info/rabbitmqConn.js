const amqp = require('amqplib')
const { defLogger } = require('./logger.js')
const logger = defLogger
const exchange = "info_exg";
const { readCustomer, updateCustomer } = require("./database.js")
let channel;


async function rabbitmqListen(queue) {
  try {
    if (!channel) {
      console.warn("Channel is not established")
      throw new Error("Channel is not established")
    }
    channel.prefetch(1)
    await channel.consume(queue, async (message) => {
      try {
        if (message !== null) {
          const routingKey = message.fields?.routingKey;
          const content = JSON.parse(message.content.toString());
          if (routingKey.startsWith('message-customer.update-accno')) {
            const result = await readCustomer(content.account_holder_id)
            if (result == undefined) {
              throw new Error("customer does not exist")
            } else {
              const firstname = result.firstname
              const lastname = result.lastname
              const username = result.username
              const email = result.email
              const account_balance = result.account_balance
              const account_number = content.account_number
              await updateCustomer(content.account_holder_id, username, firstname, lastname, email, account_balance, account_number)
              logger.info(`updated account number for ${content.account_holder_id}`)
              channel.ack(message)
            }
          } else if (routingKey.startsWith('message-customer.withdraw-amount')) {
            const content = JSON.parse(message.content.toString());
            const { account_holder_id, amount } = content
            await updateAccountAmount(account_holder_id,amount, false)
            channel.ack(message)
          }else if (routingKey.startsWith('message-customer.added-amount')) {
            const content = JSON.parse(message.content.toString());
            const { account_holder_id, amount } = content
            await updateAccountAmount(account_holder_id,amount, true)
            channel.ack(message)
          }else channel.nack(message, false, false);
        } else channel.nack(message, false, false);
      } catch (error) {
        logger.error(error.message)
        channel.nack(message, false, false);
      }

    }, { noAck: false });
  } catch (err) {
    logger.error(err.message)
  }

}

async function updateAccountAmount(account_holder_id, amount, isAddition) {
  try {
    const result = await readCustomer(account_holder_id)
    if (result == undefined) {
      throw new Error("customer does not exist")
    } else {
      const firstname = result.firstname
      const lastname = result.lastname
      const username = result.username
      const email = result.email
      const account_balance = isAddition ? result.account_balance + amount : result.account_balance - amount
      const account_number = result.account_number
      await updateCustomer(account_holder_id, username, firstname, lastname, email, account_balance, account_number)
      logger.info(`updated account amount for ${account_holder_id} to ${account_balance}`)
    }
  } catch (error) {
    logger.error(error.message)
    throw new Error("could not update customer amount due to database issue")
  }
}



function sendMessage(message, routingKey) {
  if (channel) {
    channel.publish(exchange, routingKey, Buffer.from(message), {
      persistent: true,});
      // messageId,
      // mandatory: true,
  }
 
  
}

async function startMQConnection() {
  try {
    logger.info("Trying to connect to RabbitMQ....");
    const connection = await amqp.connect("amqp://user:password@rabbitmq");
    channel = await connection.createChannel();
    await channel.assertExchange(exchange, "topic", { durable: true });
    await channel.assertQueue('message-account', { durable: true });
    await channel.bindQueue('message-account', exchange, 'message-account.#')
    await channel.assertQueue('message-customer', { durable: true });
    await channel.bindQueue('message-customer', exchange, 'message-customer.#')
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

module.exports = {
  sendMessage,
  startMQConnection,
  rabbitmqListen
}