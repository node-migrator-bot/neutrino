module.exports = TestService;

var util = require('util'),
    events = require('events');

util.inherits(TestService, events.EventEmitter);

function TestService() {

    var self = this;

    events.EventEmitter.call(self);

}

TestService.prototype.handleData = function (data) {

    var self = this;
    self.emit('data', {
        message:data
    });

};