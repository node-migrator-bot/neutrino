/* 
 * neutrino
 *
 * Copyright (c) 2012 Denis Rechkunov and project contributors.
 *
 * neutrino's license follows:
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge, 
 * publish, distribute, sublicense, and/or sell copies of the Software, 
 * and to permit persons to whom the Software is furnished to do so, 
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.

 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS 
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, 
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 * 
 * This license applies to all parts of neutrino that are not externally
 * maintained libraries.
 */
module.exports = ModelBase;

var util = require('util'),
    events = require('events');

util.inherits(ModelBase, events.EventEmitter);

/**
 * Create new instance of neutrino base model.
 * @param {Object} propertyConfig Object which describes model properties.
 * @param {String} name Name of model.
 * @param {neutrino.core.Config} config Neutrino config object.
 * @constructor
 */
function ModelBase(config, name, propertyConfig) {
    var self = this;

    if (!propertyConfig || typeof propertyConfig !== 'object') {
        throw new Error('Property config must be specified');
    }

    events.EventEmitter.call(self);

    self.setMaxListeners(0);
    self.config_ = config;
    self.name = name;

    self.on('change', function (propertyName, oldValue, newValue, syncRequired) {
        self.changeHandler_(propertyName, oldValue, newValue, syncRequired);
    });


    self.deserialize(propertyConfig);

}

//noinspection JSUnusedGlobalSymbols
/**
 * Current neutrino config object.
 * @type {neutrino.core.Config}
 * @private
 */
ModelBase.prototype.config_ = null;

/**
 * Current model name.
 * @type {String}
 */
ModelBase.prototype.name = '';

/**
 * Serialize model to object.
 * @return {Object}
 */
//noinspection JSUnusedGlobalSymbols
ModelBase.prototype.serialize = function () {

    var self = this,
        modelObject = {};

    for (var key in self) {
        //noinspection JSUnfilteredForInLoop
        if (self[key] instanceof neutrino.mvc.Property) {
            //noinspection JSUnfilteredForInLoop
            modelObject[key] = self[key].$();
        }
    }

    return modelObject;
};

/**
 * Deserialize model from object.
 * @param {Object} modelObject Model object which describes properties.
 */
ModelBase.prototype.deserialize = function (modelObject) {

    var self = this,
        oldValue;

    for (var removeKey in self) {
        //noinspection JSUnfilteredForInLoop
        if (self[removeKey] instanceof neutrino.mvc.Property) {
            //noinspection JSUnfilteredForInLoop
            delete self[removeKey];
        }
    }

    for (var key in modelObject) {
        if (!modelObject.hasOwnProperty(key)) {
            continue;
        }

        oldValue = self[key] && self[key] instanceof neutrino.mvc.Property ?
            self[key].$() :
            null;

        self[key] = new neutrino.mvc.Property(key, modelObject[key]);
        self[key].on('changed', function (name, oldValue, newValue) {
            self.emit('changed', name, oldValue, newValue);
        });

        self.emit('changed', key, oldValue, self[key].$(), false);
    }

};

ModelBase.prototype.dataMessageHandler = function (data) {

    var self = this;
    self.emit('data', data);

};

ModelBase.prototype.syncMessageHandler = function (data) {

    var self = this;

    if (!data || !data.modelName || data.modelName !== self.name) {
        return;
    }

    if (!data.propertyName ||
        !(data.propertyName in self) ||
        !(self[data.propertyName] instanceof neutrino.mvc.Property)) {
        return;
    }

    var oldValue = self[data.propertyName].$();
    self[data.propertyName].$(data.newValue, false);
    self.emit('change', data.propertyName, oldValue, data.newValue, false);
};

/**
 * Handle all model properties changes and send sync messages.
 * @param {String} propertyName Model property name.
 * @param {*} oldValue Old value of property.
 * @param {*} newValue New value of property.
 * @param {Boolean} syncRequired Is sync required (optional).
 * @private
 */
ModelBase.prototype.changeHandler_ = function (propertyName, oldValue, newValue, syncRequired) {

    var self = this;

    if (syncRequired === undefined || syncRequired === true) {
        self.emit('sendSync', {
            modelName:self.name,
            propertyName:propertyName,
            oldValue:oldValue,
            newValue:newValue
        });
    }
};