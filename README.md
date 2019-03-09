# Asynchronous Microservices with RabbitMQ

Create a .env file with `CLOUDAMQP_URL` set to your connection string.

Run `yarn install` to install the project's dependencies and `yarn compile` to compile the application from TypeScript to JavaScript.

Run `node .dist/config_scripts` to connect to your RabbitMQ instance and create your channel, exchange, and queues.

Initialize the web service by running `node ./dist/web_service`.

`POST` to `http://localhost:4000/api/v1/processData` with the body `'{"data":"my-data"}'`.

Do this several times to build up a queue.

Now, kill the web service and initialize an instance of the processor service by running `node .dist/processor_service` After that's running, open a second instance simultaneously in a separate window. Both instances are now processing data.

Restart the web service and you'll see processed data being returned. The RabbitMQ queue is now empty.
