module.exports = Test;

var util = require('util');
util.inherits(Test, neutrino.mvc.ModelBase);

function Test(config) {

    neutrino.mvc.ModelBase.call(this, config, 'test', {
        test:'testValue'
    });
}

//noinspection JSUnusedGlobalSymbols
Test.prototype.testMethod = function (callback, returnValue) {
    callback(returnValue);
};

//noinspection JSUnusedGlobalSymbols
Test.prototype.privateTest_ = function (callback, returnValue) {
    callback(returnValue);
};

Test.prototype.sendToServiceTest = function (serviceName, dataValue) {
    var self = this;
    self.emit(neutrino.mvc.ModelBase.events.sentToService, serviceName, dataValue);
};