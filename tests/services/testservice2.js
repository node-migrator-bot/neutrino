module.exports = TestService;

var util = require('util'),
    events = require('events');

util.inherits(TestService, events.EventEmitter);

function TestService() {

    var self = this;

    events.EventEmitter.call(self);

}

TestService.prototype.handleData = function (modelName, data) {

    var self = this;
    self.emit(neutrino.cluster.Master.events.eventServiceData, modelName, {message:data});

};