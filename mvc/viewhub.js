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
module.exports = ViewHub;

var util = require('util'),
    events = require('events');

util.inherits(ViewHub, events.EventEmitter);

//noinspection JSUnusedLocalSymbols
/**
 * Create new instance of server view - client view bridge.
 * @param {neutrino.core.Config} config Neutrino config object.
 * @constructor
 */
function ViewHub(config) {

    var self = this;

    events.EventEmitter.call(self);
}

//noinspection JSUnusedLocalSymbols
/**
 * Send model object to client.
 * @param {String} viewName View title.
 * @param {Object} model Model object.
 * @param {String} sessionId User session ID.
 */
ViewHub.prototype.sendModel = function (viewName, model, sessionId) {

};

//noinspection JSUnusedLocalSymbols
/**
 * Send error message to client.
 * @param {String} viewName View title.
 * @param {String} errorMessage Error text message.
 * @param {String} sessionId User session ID.
 */
ViewHub.prototype.sendError = function (viewName, errorMessage, sessionId) {

};

//noinspection JSUnusedLocalSymbols
/**
 * Send new value for client view.
 * @param {String} viewName View title.
 * @param {String} propertyName Changed property name.
 * @param {*} oldValue Old property value.
 * @param {*} newValue New property value.
 * @param {String} sessionId User session ID.
 */
ViewHub.prototype.sendNewValue = function (viewName, propertyName, oldValue, newValue, sessionId) {

};

//noinspection JSUnusedLocalSymbols
/**
 * Send invoke result to client view.
 * @param {String} viewName View title.
 * @param {String} methodName Name of invoked method.
 * @param {*} result Result of method invoke.
 * @param {String} sessionId User session ID.
 * @param {String} requestId User request ID.
 */
ViewHub.prototype.sendInvokeResult = function (viewName, methodName, result, sessionId, requestId) {

};