
var Queue = require('../lib/queue');
var Sqs = require('../lib/providers/sqs');

var queue = new Queue({
    batchSize: 1,
    provider: new Sqs({
        region: 'us-west-1',
        accessKeyId: 'KEY',
        secretAccessKey: 'SECRET',
        queueUrl: 'URL'
    })
});

queue.on(queue.EVENTS.ERROR, function(err) {
    console.error(err);
});

queue.on(queue.EVENTS.QUEUE_PROCESSED, function() {
    console.log('Queue processed');
});

queue.on(queue.EVENTS.MESSAGE_RECEIVED, function(message, done) {
    console.log('Received message');

    //do some processing here

    setTimeout(done, 1000);
});

queue.process();