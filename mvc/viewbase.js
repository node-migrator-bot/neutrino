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
 * @param {String} name Name of view.
 * @constructor
 */
function ViewBase(config, name) {

    var self = this;

    events.EventEmitter.call(self);
    self.setMaxListeners(0);

    self.name = name;

}

/**
 * Current view name.
 * @type {String}
 */
ViewBase.prototype.name = '';

/**
 * Show error message on client.
 * @param {Error} error Exception object.
 * @param {String} sessionId User session ID.
 * @param {String} requestId User request ID.
 */
ViewBase.prototype.showError = function (error, sessionId, requestId) {

    var self = this;
    self.emit('showError', error.message, sessionId, requestId);

};

/**
 * Show model on client.
 * @param {neutrino.mvc.ModelBase} model Model object.
 * @param {String} sessionId User session ID.
 * @param {String} requestId User request ID.
 */
ViewBase.prototype.showModel = function (model, sessionId, requestId) {

    var self = this;
    self.emit('showModel', model, sessionId, requestId);

};

/**
 * Show method invoke result.
 * @param {String} methodName Model method name.
 * @param {*} result Invoked method result.
 * @param {String} sessionId User session ID.
 * @param {String} requestId User request ID.
 */
ViewBase.prototype.invokeResult = function (methodName, result, sessionId, requestId) {

    var self = this;
    self.emit('invokeResult', methodName, result, sessionId, requestId);

};

/**
 * Update value on client.
 * @param {String} propertyName Name of model's property.
 * @param {*} oldValue Old property value.
 * @param {*} newValue New property value.
 * @param {String} sessionId User session ID.
 */
ViewBase.prototype.updateValue = function (propertyName, oldValue, newValue, sessionId) {

    var self = this;
    self.emit('updateValue', propertyName, oldValue, newValue, sessionId);

};

/**
 * Send edit request for model property.
 * @param {String} propertyName Name of model's property.
 * @param {*} newValue New property value.
 * @param {String} sessionId User session ID.
 * @param {String} requestId User request ID.
 */
ViewBase.prototype.setValue = function (propertyName, newValue, sessionId, requestId) {

    var self = this;
    self.emit('setValue', propertyName, newValue, sessionId, requestId);

};

/**
 * Send model request.
 * @param {String} sessionId User session ID.
 * @param {String} requestId User request ID.
 */
ViewBase.prototype.getModel = function (sessionId, requestId) {

    var self = this;
    self.emit('modelRequest', sessionId, requestId);

};

//noinspection JSUnusedGlobalSymbols
/**
 * Send method invoke request.
 * @param {String} methodName Name of method.
 * @param {Array} args Method arguments.
 * @param {String} sessionId User session ID.
 * @param {String} requestId User request ID.
 */
ViewBase.prototype.invoke = function (methodName, args, sessionId, requestId) {

    var self = this;
    self.emit('invoke', methodName, args, sessionId, requestId);

};

/**
 * Send subscribe signal and send session object.
 * @param {String} sessionId User session ID.
 * @param {String} requestId User request ID.
 */
ViewBase.prototype.subscribe = function (sessionId, requestId) {

    var self = this;
    self.emit('subscribe', sessionId, requestId);

};

/**
 * Send unsubscribe signal and send session object.
 * @param {String} sessionId User session ID.
 * @param {String} requestId User request ID.
 */
ViewBase.prototype.unsubscribe = function (sessionId, requestId) {

    var self = this;
    self.emit('unsubscribe', sessionId, requestId);

};
