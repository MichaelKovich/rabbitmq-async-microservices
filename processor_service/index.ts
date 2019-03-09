import amqp, {Channel, Connection} from 'amqplib';
require('dotenv').config();

interface DataToConsume {
  connection: Connection;
  channel: Channel;
  resultsChannel: Channel;
}

interface DataToPublish {
  routingKey: string;
  exchangeName: string;
  data: {
    requestId: string;
    processingResults: {};
  };
}

// RabbitMQ Connection String
const messageQueueConnectionString: any = process.env.CLOUDAMQP_URL;

const listenForMessages = async () => {
  // Connect to Rabbit MQ
  let connection = await amqp.connect(messageQueueConnectionString);

  // Create a Channel and Prefetch 1 Message at a Time
  let channel = await connection.createChannel();
  await channel.prefetch(1);

  // Create a Second Channel to Send Back the Results
  let resultsChannel = await connection.createConfirmChannel();

  // Start Consuming Messages
  await consume({connection, channel, resultsChannel});
};

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

// consume messages from RabbitMQ
const consume = (dataToConsume: DataToConsume) => {
  const {connection, channel, resultsChannel} = dataToConsume;

  return new Promise((resolve, reject) => {
    channel.consume('processing.requests', async function(msg: any) {
      // Parse Message
      let msgBody = msg.content.toString();
      let data = JSON.parse(msgBody);
      let requestId = data.requestId;
      let requestData = data.requestData;

      console.log('Received a request message, requestId: ', requestId);

      // Process Data
      let processingResults = await processMessage(requestData);

      // Publish Results to Channel
      const dataToPublish: DataToPublish = {
        exchangeName: 'processing',
        routingKey: 'result',
        data: {requestId, processingResults}
      };
      await publishToChannel(resultsChannel, dataToPublish);

      console.log('Published results for requestId: ', requestId);

      // Acknowledge Message as Processed Successfully
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

// Simulate Data Processing That Takes 5 Seconds
const processMessage = (requestData: string) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(requestData + '-processed');
    }, 5000);
  });
};

listenForMessages();
