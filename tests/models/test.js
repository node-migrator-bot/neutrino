module.exports = Test;

var util = require('util');
util.inherits(Test, neutrino.mvc.ModelBase);

function Test(config) {

    neutrino.mvc.ModelBase.call(this, config, 'test', {
        test:'testValue'
    });
}