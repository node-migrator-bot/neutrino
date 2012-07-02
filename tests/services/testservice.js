module.exports = TestService;

var util = require('util'),
    events = require('events');

util.inherits(TestService, events.EventEmitter);

function TestService() {

    var self = this;

    events.EventEmitter.call(self);

    self.timeout = setTimeout(function () {

        self.emit(neutrino.cluster.Master.events.eventServiceData, 'test', {

            message:'testMessage'

        });

    }, 500);
}