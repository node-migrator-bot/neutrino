module.exports = TestService;

var util = require('util'),
    events = require('events');

util.inherits(TestService, events.EventEmitter);

function TestService() {

    var self = this;

    events.EventEmitter.call(self);

    self.timeout = setTimeout(function () {

        self.emit('data', 'test', {

            message:'testMessage'

        });

    }, 500);
}