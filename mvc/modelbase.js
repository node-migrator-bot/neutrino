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
 * @param {neutrino.core.Config} config Neutrino config object.
 * @constructor
 */
function ModelBase(config, propertyConfig) {
    var self = this;

    if (!propertyConfig || typeof propertyConfig !== 'object') {
        throw new Error('Property config must be specified');
    }

    events.EventEmitter.call(self);

    self.setMaxListeners(0);
    self.config_ = config;

    self.deserialize(propertyConfig);

}

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
 * Remove all properties from model.
 * @private
 */
ModelBase.prototype.removeProperties_ = function () {

    var self = this,
        oldValue;

    for (var key in self) {
        //noinspection JSUnfilteredForInLoop
        if (self[key] instanceof neutrino.mvc.Property) {
            //noinspection JSUnfilteredForInLoop
            oldValue = self[key].$();
            //noinspection JSUnfilteredForInLoop
            delete self[key];
            //noinspection JSUnfilteredForInLoop
            self.emit('changed', key, oldValue, null);
        }
    }

};

/**
 * Deserialize model from object.
 * @param {Object} modelObject Model object which describes properties.
 */
ModelBase.prototype.deserialize = function (modelObject) {

    var self = this,
        oldValue;

    self.removeProperties_();

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

        self.emit('changed', key, oldValue, self[key].$());
    }

};

//noinspection JSUnusedGlobalSymbols
/**
 * Current neutrino config object.
 * @type {neutrino.core.Config}
 * @private
 */
ModelBase.prototype.config_ = null;