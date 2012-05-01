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

module.exports = ViewBase;

var util = require('util'),
    events = require('events');

util.inherits(ViewBase, events.EventEmitter);

//noinspection JSUnusedLocalSymbols
/**
 * Create new instance of neutrino base view
 * @param {neutrino.core.Config} config Neutrino config object.
 * @constructor
 */
function ViewBase(config) {

    var self = this;

    events.EventEmitter.call(self);
    self.setMaxListeners(0);

}

/**
 * Show error message on client.
 * @param {Error} error Exception object.
 * @param {Object} sessionObject User session object.
 */
ViewBase.prototype.showError = function (error, sessionObject) {

    var self = this;
    self.emit('showError', error.message, sessionObject);

};

/**
 * Show model on client.
 * @param {neutrino.mvc.ModelBase} model Model object.
 * @param {Object} sessionObject User session object.
 */
ViewBase.prototype.showModel = function (model, sessionObject) {

    var self = this;
    self.emit('showModel', model, sessionObject);

};

/**
 * Show property value on client.
 * @param {String} propertyName Model property name.
 * @param {*} value Current model property value.
 * @param {Object} sessionObject User session object.
 */
ViewBase.prototype.showValue = function (propertyName, value, sessionObject) {

    var self = this;
    self.emit('showValue', propertyName, value, sessionObject);

};

/**
 * Update value on client.
 * @param {String} propertyName Name of model's property.
 * @param {*} oldValue Old property value.
 * @param {*} newValue New property value.
 * @param {Object} sessionObject User session object.
 */
ViewBase.prototype.updateValue = function (propertyName, oldValue, newValue, sessionObject) {

    var self = this;
    self.emit('updateValue', propertyName, oldValue, newValue, sessionObject);

};

/**
 * Send edit request for model property.
 * @param {String} propertyName Name of model's property.
 * @param {*} newValue New property value.
 * @param {Object} sessionObject User session object.
 */
ViewBase.prototype.edit = function (propertyName, newValue, sessionObject) {

    var self = this;
    self.emit('edit', propertyName, newValue, sessionObject);

};

/**
 * Send model request.
 * @param {Object} sessionObject
 */
ViewBase.prototype.getModel = function (sessionObject) {

    var self = this;
    self.emit('modelRequest', sessionObject);

};

/**
 * Send value request.
 * @param {String} propertyName Name of property.
 * @param {Object} sessionObject
 */
ViewBase.prototype.getValue = function (propertyName, sessionObject) {

    var self = this;
    self.emit('valueRequest', propertyName, sessionObject);

};

/**
 * Send subscribe signal and send session object.
 * @param {Object} sessionObject User session object.
 */
ViewBase.prototype.subscribe = function (sessionObject) {

    var self = this;
    self.emit('subscribe', sessionObject);

};

/**
 * Send unsubscribe signal and send session object.
 * @param {Object} sessionObject User session object.
 */
ViewBase.prototype.unsubscribe = function (sessionObject) {

    var self = this;
    self.emit('unsubscribe', sessionObject);

};
