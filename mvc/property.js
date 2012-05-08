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

module.exports = Property;

var util = require('util'),
    events = require('events');

util.inherits(Property, events.EventEmitter);

/**
 * Create new instance of observable property.
 * @param {String} name Name of property.
 * @param {*} value Begin value of property.
 * @constructor
 */
function Property(name, value) {
    var self = this;

    events.EventEmitter.call(self);

    self.name_ = name;
    self.set(value);
}

/**
 * Property name.
 * @type {String}
 * @private
 */
Property.prototype.name_ = null;

/**
 * Property value.
 * @type {*}
 * @private
 */
Property.prototype.value_ = null;

/**
 * Set new value of property.
 * @param {*} newValue New value for property.
 * @param {Boolean} observable Is this change observable (optional).
 */
Property.prototype.set = function (newValue, observable) {
    var self = this,
        oldValue = self.value_;

    if (newValue === oldValue) {
        return;
    }

    self.value_ = newValue;

    if (observable === undefined || observable === true) {
        self.emit('changed', self.name_, oldValue, newValue);
    }
};

/**
 * Get current value of property.
 * @return {*}
 */
Property.prototype.get = function () {
    var self = this;
    return self.value_;
};

/**
 * Get current value of property or set new.
 * @param {*} newValue New value of property.
 * @return {*}
 */
Property.prototype.$ = function (newValue) {
    var self = this;

    if (newValue !== undefined) {
        self.set(newValue);
    }

    return self.get();
};