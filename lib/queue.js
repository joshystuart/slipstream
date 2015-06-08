/**
 * @author Josh Stuart <joshstuartx@gmail.com>
 */

var EventEmitter = require('events').EventEmitter;
var async = require('async');
var util = require('util');
var debug = require('debug');
var log = debug('slipstream:queue');
var pluralize = require('pluralize');

var events = {
    MESSAGE_RECEIVED: 'message_received',
    MESSAGE_PROCESSED: 'message_processed',
    MESSAGE_DELETING: 'message_deleting',
    MESSAGE_DELETED: 'message_deleted',
    QUEUE_PROCESSED: 'queue_processed',
    ERROR: 'error'
};

/**
 * @param {Object} options
 * @param {Number} options.batchSize The number of messages from the queue per request.
 * @param {Number} options.concurrency The number of jobs allowed concurrently.
 * @param {Object} options.provider The queue provider eg. SQS, Redis etc.
 * @param {Number} options.shutdownRetryWait The period to wait per attempt at shutting down gracefully (ie. letting
 *     the connections drain).
 * @param {Number} options.shutdownMaxWait The total time to wait to shut down gracefully.
 * @constructor
 */
function Queue(options) {
    this.batchSize = options.batchSize || 1;
    this.concurrency = options.concurrency || 1;
    this.provider = options.provider;
    this.shutdownRetryWait = options.shutdownRetryWait || 500;
    this.shutdownMaxWait = options.shutdownMaxWait || 10000;
    this.inProgress = false;
    this.isStopped = false;
    this.numberInQueue = 0;

    this.EVENTS = events;

    //init graceful shutdown
    process.on('SIGINT', this.shutdown);

}

util.inherits(Queue, EventEmitter);

/**
 * Process the Queue by calling the {@link Provider#getMessages).
 */
Queue.prototype.process = function() {
    if (!this.inProgress && !this.isStopped) {
        log('Processing');
        this.inProgress = true;

        this.provider.getMessages(this.batchSize, processMessages.bind(this));
    } else {
        log('The queue is in process or stopped');
    }
};

/**
 * Stop the queue, but allow the current connections to drain.
 */
Queue.prototype.stop = function() {
    log('Stop queue');
    this.isStopped = false;
};

/**
 * Start the queue.
 */
Queue.prototype.start = function() {
    log('Start queue');
    this.isStopped = true;
    this.process();
};

/**
 * Handle the shutdown gracefully.
 */
Queue.prototype.shutdown = function() {
    log('Waiting for the queue to empty');

    var currentWait = 0;
    this.stop();

    async.whilst(
        function() {
            log('There are ' + this.numberInQueue + ' ' + pluralize('message', this.numberInQueue) +
                ' still in the queue');
            return this.numberInQueue > 0 || currentWait > this.shutdownMaxWait;
        }.bind(this),
        function(callback) {
            log('Waiting ' + this.shutdownRetryWait / 1000 + 'seconds before trying again');

            currentWait += this.shutdownRetryWait;

            //wait then try again.
            setTimeout(callback, this.shutdownRetryWait);
        }.bind(this),
        function() {
            log('Stopping queue');
            process.exit(0);
        });
};

/**
 * Process the messages found by the Provider.
 *
 * @param err
 * @param messages
 */
function processMessages(err, messages) {
    if (!err && messages && messages.length > 0) {
        log('Received ' + messages.length + ' ' + pluralize('message', messages.length));

        this.numberInQueue += messages.length;

        async.each(messages, processMessage.bind(this), function() {
            this.emit(events.QUEUE_PROCESSED, messages);
            this.inProgress = false;
            this.process();
        }.bind(this));
    } else {
        this.inProgress = false;
        if (err) {
            log('Error while receiving messages');
            this.emit(events.ERROR, err);
        } else {
            log('Received no messages');
            this.emit(events.QUEUE_PROCESSED, []);
            this.process();
        }
    }
}

/**
 * Process the message using emit, then delete the message once completed.
 *
 * @param message
 * @param cb
 */
function processMessage(message, cb) {
    log('Processing message', message);

    async.series([
            function(done) {
                //process
                this.emit(events.MESSAGE_RECEIVED, message, done);
            }.bind(this),
            function(done) {
                deleteMesage.bind(this)(message, done);
            }.bind(this)
        ],
        function(err) {
            if (err) {
                this.emit(events.ERROR, err);
            } else {
                this.emit(events.MESSAGE_PROCESSED, message);
            }

            cb();
        }.bind(this));
}

/**
 * Delete the message from the queue.
 *
 * @param message
 * @param cb
 */
function deleteMesage(message, cb) {
    log('Deleting message', message);

    this.emit(events.MESSAGE_DELETING, message);
    this.provider.deleteMessage(message, function(err) {
        if (err) {
            this.emit(events.ERROR, err);
        } else {
            this.emit(events.MESSAGE_DELETED, message);
        }

        this.numberInQueue--;
        if (typeof cb === 'function') {
            cb();
        }
    }.bind(this));
}

module.exports = Queue;
