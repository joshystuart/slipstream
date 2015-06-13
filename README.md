# Slipstream: Parallel Queue Processing

![Slipstream: X-Men](https://s3-ap-southeast-2.amazonaws.com/pixy-marketing/github/slipstream.jpg)

Slipstream provides simple parallel queue (SQS, Redis, etc) processing.

### Install

```
npm install slipstream --save
```

### Example

```javascript
var Queue = require('slipstream').Queue;
var Sqs = require('slipstream').providers.Sqs;

var queue = new Queue({
        batchSize: 5, //every connection to the provider will request 5 messages
        concurrency: 10, //we can process 10 messages at a time
        provider: new Sqs({
            region: 'us-west-1',
            accessKeyId: 'your access id',
            secretAccessKey: 'your access key',
            queueUrl: 'sqs queue url'
        })
    });
    
queue.on(queue.EVENTS.ERROR, function(err) {
    //There was an error processing the queue
});

queue.on(queue.EVENTS.QUEUE_PROCESSED, function(messages) {
    //The queue has been processed
    
    //do some other function on the messages
});

queue.on(queue.EVENTS.MESSAGE_RECEIVED, function(message, done) {
    //do some processing on a message
    var data = message.data;
    
    done();
});

queue.process();
```

### Tests

```
npm test
```
