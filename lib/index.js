/**
 * Module dependencies
 */

module.exports = {
    Queue: require('./queue'),
    Message: require('./message'),
    providers: {
        Sqs: require('./providers/sqs')
    }
};
