/**
 * @author Josh Stuart <joshstuartx@gmail.com>
 */

var _ = require('lodash');
var AWS = require('aws-sdk');
var Message = require('../message');
var debug = require('debug');
var log = debug('slipstream:provider:sqs');
var pluralize = require('pluralize');

/**
 *
 * @constructor
 */
function Sqs(options) {
    this.sqs = options.sqs || new AWS.SQS({
            accessKeyId: options.accessKeyId || '',
            secretAccessKey: options.secretAccessKey || '',
            region: options.region || 'eu-west-1'
        });
    this.queueUrl = options.queueUrl;
    this.visibilityTimeout = options.visibilityTimeout || 120;
    this.waitTimeSeconds = options.waitTimeSeconds || 20;
}

Sqs.prototype.getMessages = function(numMessages, cb) {
    log('Getting ' + numMessages + ' ' + pluralize('message', numMessages));

    var options = {
        QueueUrl: this.queueUrl,
        VisibilityTimeout: this.visibilityTimeout,
        WaitTimeSeconds: this.waitTimeSeconds,
        MaxNumberOfMessages: numMessages || 1
    };

    this.sqs.receiveMessage(options, function(err, response) {
        if (response && response.Messages && response.Messages.length > 0) {
            log('Received ' + response.Messages.length + ' ' + pluralize('message', response.Messages.length));
            cb(err, getMessages(response.Messages));
        } else {
            cb(err, []);
        }
    });
};

/**
 *
 * @param message
 * @param cb
 */
Sqs.prototype.deleteMessage = function(message, cb) {
    log('Deleting message', message);

    var options = {
        QueueUrl: this.queueUrl,
        ReceiptHandle: message.id
    };

    this.sqs.deleteMessage(options, cb);
};

/**
 * Iterates through and converts to queue {@link Message}.
 *
 * @param messages
 * @returns {Array}
 */
function getMessages(messages) {
    var parsedMessages = [];
    _.forEach(messages, function(message) {
        log('Parsing message', message);
        parsedMessages.push(new Message(message.ReceiptHandle, getMessageBody(message.Body)));
    });

    return parsedMessages;
}

/**
 * Attempts to parse the message body to create an object, otherwise returns a string.
 *
 * @param message
 * @returns {Object, String}
 */
function getMessageBody(body) {
    try {
        return JSON.parse(body);
    } catch (e) {
        return body;
    }
}

module.exports = Sqs;

