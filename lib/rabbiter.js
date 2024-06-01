const amqp = require('amqplib');
const rabbitmqHost = process.env.RABBITMQ_HOST;
const rabbitmqPort = process.env.RABBITMQ_PORT;

const rabbitmqUrl = `amqp://${rabbitmqHost}:${rabbitmqPort}`;

let _connection = null;
let _channel = null;

async function getChannel(queueName='image') {
    if (!_connection && !_channel) {
        let retries = 0;
        while (retries < 30) {
            try {
                _connection = await amqp.connect(rabbitmqUrl);
                _channel = await _connection.createChannel();
                console.log('rabbitmqUrl:', rabbitmqUrl);
                _channel.assertQueue(queueName, {durable: false});
                console.log('\t>rabbitmq >> making a new channel')
                return _channel;
            }
            catch (err) {
                retries += 1;
                console.log('Failed to connect to rabbitmq...retrying in 500 ms')
                await new Promise((res) => setTimeout(res, 500));
            }
        }
        throw new Error('Failed to connect to rabbitmq :(');
    }
    else {
        console.log('\t>rabbiter >> giving you an established channel')
        return _channel;
    }
}

module.exports = getChannel