import amqp from 'amqplib';
require('dotenv').config();

// RabbitMQ Connection String
const messageQueueConnectionString: any = process.env.CLOUDAMQP_URL;

const setup = async () => {
  console.log('Setting up RabbitMQ Exchanges/Queues...');

  try {
    // Connect to RabbitMQ Instance
    let connection = await amqp.connect(messageQueueConnectionString);

    // Create a Channel
    let channel = await connection.createChannel();

    // Create Exchange
    await channel.assertExchange('processing', 'direct', {durable: true});

    // Create Queues
    await channel.assertQueue('processing.requests', {durable: true});
    await channel.assertQueue('processing.results', {durable: true});

    // Bind Queues
    await channel.bindQueue('processing.requests', 'processing', 'request');
    await channel.bindQueue('processing.results', 'processing', 'result');

    console.log('Setup Complete!');
    process.exit();
  } catch (err) {
    console.log('Setup Failure...');
    console.log('Error: ', err);
    process.exit();
  }
};

setup();
