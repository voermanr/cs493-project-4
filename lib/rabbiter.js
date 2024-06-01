const amqp = require('amqplib');
const rabbitmqHost = process.env.RABBITMQ_HOST;
const rabbitmqPort = process.env.RABBITMQ_PORT;

const rabbitmqUrl = `amqp://${rabbitmqHost}:${rabbitmqPort}`;

let _channel = null;
let _connectionPromise = null;

async function createChannel(queueName) {
    const connection = await amqp.connect(rabbitmqUrl);
    const channel = await connection.createChannel();

    await channel.assertQueue(queueName);
    return channel;
}

async function getChannel(queueName='image') {
    if (_channel) {
        //console.log('\t>rabbiter >> giving you an established channel');
        return _channel;
    }

    if (!_connectionPromise) {
        _connectionPromise = (async () => {
            let retries = 0;
            while (retries < 30) {
                try {
                    _channel = await createChannel(queueName);
                    //process.stdout.write('connected :).\n')
                    return _channel;
                } catch (err) {
                    retries += 1;
                    if (retries === 1) {
                        //process.stdout.write('Failed to connect to rabbitmq..');
                    }
                    //process.stdout.write('.');
                    await new Promise((res) => setTimeout(res, 500));
                }
            }
            throw new Error('Failed to connect to rabbitmq :(');
        })();
    }

    return _connectionPromise;
}

module.exports = getChannel;
