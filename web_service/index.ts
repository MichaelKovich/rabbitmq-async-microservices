import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import amqp, {Connection, Channel} from 'amqplib';
require('dotenv').config();

const app = express();
app.use(helmet());
app.use(express.json());
app.use(cors());

interface DataToConsume {
  connection: Connection;
  channel: Channel;
}

interface DataToPublish {
  routingKey: string;
  exchangeName: string;
  data: {};
}

// Simulate Request IDs
let lastRequestId = 1;

// RabbitMQ Connection String
const messageQueueConnectionString: any = process.env.CLOUDAMQP_URL;

// Handle the Request
app.post('/api/v1/processData', async (req, res) => {
  // Save Request ID and Increment
  let requestId = lastRequestId;
  lastRequestId++;

  // Connect to Rabbit MQ and Create a Channel
  let connection = await amqp.connect(messageQueueConnectionString);
  let channel = await connection.createConfirmChannel();

  // Publish the Data to Rabbit MQ
  let requestData = req.body.data;

  const dataToPublish = {
    routingKey: 'request',
    exchangeName: 'processing',
    data: {requestId, requestData}
  };

  await publishToChannel(channel, dataToPublish);

  console.log('Published a request message, requestId:', requestId);

  // Send the Request id in the Response
  res.send({requestId});
});

// Utility Function to Publish Messages to a Channel
const publishToChannel = (channel: any, dataToPublish: DataToPublish) => {
  const {routingKey, exchangeName, data} = dataToPublish;

  return new Promise((resolve, reject) => {
    channel.publish(
      exchangeName,
      routingKey,
      Buffer.from(JSON.stringify(data), 'utf-8'),
      {persistent: true},
      function(err: Error, ok: any) {
        if (err) {
          return reject(err);
        }

        resolve();
      }
    );
  });
};

const listenForResults = async () => {
  // Connect to Rabbit MQ
  let connection = await amqp.connect(messageQueueConnectionString);

  // Create a Channel and Prefetch 1 Message at a Time
  let channel = await connection.createChannel();
  await channel.prefetch(1);

  // Start Consuming Messages
  const dataToConsume = {
    connection,
    channel
  };

  await consume(dataToConsume);
};

// Consume Messages from RabbitMQ
const consume = (dataToConsume: DataToConsume) => {
  const {connection, channel} = dataToConsume;

  return new Promise((resolve, reject) => {
    channel.consume('processing.results', async (msg: any) => {
      // Parse Message
      let msgBody = msg.content.toString();
      let data = JSON.parse(msgBody);
      let requestId = data.requestId;
      let processingResults = data.processingResults;
      console.log(
        'Received a result message, requestId:',
        requestId,
        'processingResults:',
        processingResults
      );

      // Acknowledge Message as Received
      await channel.ack(msg);
    });

    // Handle Connection Closed
    connection.on('close', (err: Error) => {
      return reject(err);
    });

    // Handle Errors
    connection.on('error', (err: Error) => {
      return reject(err);
    });
  });
};

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Dr. Crane is listening on ${port}!`));

// Listen for Results on RabbitMQ
listenForResults();
