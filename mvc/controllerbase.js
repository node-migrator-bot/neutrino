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
module.exports = ControllerBase;

var util = require('util'),
    events = require('events');

util.inherits(ControllerBase, events.EventEmitter);

/**
 * Implements all base controller actions and validate methods.
 * @param {neutrino.core.Config} config Object with current configuration.
 * @param {String} name Name of controller.
 * @param {neutrino.mvc.ModelBase} model Controller's model.
 * @param {neutrino.mvc.ViewBase} view View connected with controller.
 * @constructor
 */
function ControllerBase(config, name, model, view) {

    var self = this;

    events.EventEmitter.call(self);
    self.setMaxListeners(0);

    self.model_ = model;
    self.view_ = view;
    self.config_ = config;
    self.name = name;

    self.subscribers_ = {};

    self.on('error', function (error, sessionId, requestId) {
        if (!sessionId) return;
        self.view_.showError(error, sessionId, requestId);
    });

    self.view_.on('setValue', function (propertyName, newValue, sessionId, requestId) {
        self.setValue(propertyName, newValue, sessionId, requestId);
    });

    self.view_.on('subscribe', function (sessionId, requestId) {
        self.subscribe(sessionId, requestId);
    });

    self.view_.on('unsubscribe', function (sessionId, requestId) {
        self.unsubscribe(sessionId, requestId);
    });

    self.view_.on('modelRequest', function (sessionId, requestId) {
        self.getModel(sessionId, requestId);
    });

    self.view_.on('invoke', function (methodName, args, sessionId, requestId) {
        self.invoke(methodName, args, sessionId, requestId);
    });

    self.model_.on('changed', function (propertyName, oldValue, newValue) {
        self.modelUpdateHandler(propertyName, oldValue, newValue);
    });

    self.model_.on('error', function (error) {
        self.emit('error', error);
    });

}

/**
 * Current controller name.
 * @type {String}
 */
ControllerBase.prototype.name = '';

/**
 * Model of controller.
 * @type {neutrino.mvc.ModelBase}
 */
ControllerBase.prototype.model_ = null;

/**
 * View connected with controller.
 * @type {neutrino.mvc.ViewBase}
 */
ControllerBase.prototype.view_ = null;

//noinspection JSUnusedGlobalSymbols
/**
 * Current config object.
 * @type {neutrino.core.Config}
 * @private
 */
ControllerBase.prototype.config_ = null;

/**
 * Current subscribers hash table.
 * @type {Object}
 * @private
 */
ControllerBase.prototype.subscribers_ = null;

/**
 * Set new value for specified property of model.
 * @param {String} propertyName Property name to update.
 * @param {*} newValue New value of property.
 * @param {String} sessionId User session ID.
 * @param {String} requestId User request ID.
 */
ControllerBase.prototype.setValue = function (propertyName, newValue, sessionId, requestId) {

    var self = this,
        execute = function () {

            if (!(propertyName in self.model_)) {
                self.emit('error', Error('No property with such name'), sessionId, requestId);
                return;
            }

            if (neutrino.mvc.privateRegExp.test(propertyName)) {
                self.emit('error', Error('Can not get or set private properties'), sessionId, requestId);
                return;
            }

            var setValidatorName = util.format(neutrino.mvc.propertySetValidatorFormat, propertyName);

            // use set property validator if it exists
            if (setValidatorName in self) {

                self[setValidatorName](newValue, sessionId, function (error) {

                    if (error) {
                        self.emit('error', error, sessionId, requestId);
                    } else {
                        self.model_[propertyName].$(newValue);
                    }

                });

            } else {
                self.model_[propertyName].$(newValue);
            }
        };

    // use model access validator if it exists.
    if (neutrino.mvc.modelAccessValidatorName in self) {
        self[neutrino.mvc.modelAccessValidatorName](sessionId, function (error) {
            if (error) {
                self.emit('error', error, sessionId, requestId);
            } else {
                execute();
            }
        });
    } else {
        execute();
    }
};

//noinspection JSUnusedGlobalSymbols
/**
 * Invoke specified model method.
 * @param {String} methodName Name of model method.
 * @param {Array} args Method arguments.
 * @param {String} sessionId User session ID.
 * @param {String} requestId User request ID.
 */
ControllerBase.prototype.invoke = function (methodName, args, sessionId, requestId) {

    var self = this,
        execute = function () {

            if (!(methodName in self.model_) || typeof(self.model_[methodName]) !== 'function') {
                self.emit('error', new Error('No method with such name'), sessionId, requestId);
                return;
            }

            if (neutrino.mvc.privateRegExp.test(methodName)) {
                self.emit('error', new Error('Can not invoke private methods'), sessionId, requestId);
                return;
            }

            var invokeValidatorName = util.format(neutrino.mvc.methodInvokeValidatorFormat, methodName),

                methodCallback = function (result) {
                    self.view_.invokeResult(methodName, result, sessionId, requestId);
                },
                methodArgs = [methodCallback].concat(args),

                validatorCallback = function (error) {

                    if (error) {
                        self.emit('error', error, sessionId, requestId);
                    } else {
                        self.model_[methodName].apply(self.model_, methodArgs);
                    }
                },
                validatorArgs = [sessionId, validatorCallback].concat(args);


            if (invokeValidatorName in self) {
                self[invokeValidatorName].apply(self, validatorArgs);
            } else {
                self.model_[methodName].apply(self.model_, methodArgs);
            }

        };

    // use model access validator if it exists.
    if (neutrino.mvc.modelAccessValidatorName in self) {
        self[neutrino.mvc.modelAccessValidatorName](sessionId, function (error) {
            if (error) {
                self.emit('error', error, sessionId, requestId);
            } else {
                execute();
            }
        });
    } else {
        execute();
    }
};

/**
 * Get model object with public properties.
 * @param {String} sessionId User session ID.
 * @param {String} requestId User request ID.
 */
ControllerBase.prototype.getModel = function (sessionId, requestId) {

    var self = this,
        model = {},
        execute = function () {

            var modelObject = self.model_.serialize();

            for (var key in modelObject) {

                if (!modelObject.hasOwnProperty(key)) {
                    continue;
                }

                if (neutrino.mvc.privateRegExp.test(key)) {
                    continue;
                }

                var getValidatorName = util.format(neutrino.mvc.propertyGetValidatorFormat, key);

                if (getValidatorName in self) {
                    // because key is mutable we must use immediate function
                    (function (currentKey) {
                        self[getValidatorName](sessionId, function (error) {
                            if (!error) {
                                model[currentKey] = modelObject[currentKey];
                            }
                        });
                    })(key);

                } else {
                    model[key] = modelObject[key];
                }

            }
            //TODO solve asynchronous validator issue
            self.view_.showModel(model, sessionId, requestId);
        };

    if (neutrino.mvc.modelAccessValidatorName in self) {

        self[neutrino.mvc.modelAccessValidatorName](sessionId, function (error) {
            if (error) {
                self.emit('error', error, sessionId, requestId);
            } else {
                execute();
            }
        });

    } else {
        execute();
    }

};

/**
 * Send to all subscribers update value message.
 * @param {String} propertyName Name of model property.
 * @param {*} oldValue Old property value.
 * @param {*} newValue New property value.
 */
ControllerBase.prototype.modelUpdateHandler = function (propertyName, oldValue, newValue) {

    var self = this;
    if (neutrino.mvc.privateRegExp.test(propertyName)) {
        return;
    }

    var getValidatorName = util.format(neutrino.mvc.propertyGetValidatorFormat, propertyName);

    for (var sessionId in self.subscribers_) {

        if (!self.subscribers_.hasOwnProperty(sessionId)) {
            continue;
        }

        if (getValidatorName in self) {
            // because sessionId is mutable we must use immediate function
            (function (sid) {
                self[getValidatorName](sessionId, function (error) {
                    if (error) {
                        self.emit('error', error, sid)
                    } else {
                        self.view_.updateValue(propertyName, oldValue, newValue, sid);
                    }
                });
            })(sessionId);
        } else {
            self.view_.updateValue(propertyName, oldValue, newValue, sessionId);
        }
    }

};

//noinspection JSUnusedLocalSymbols
/**
 * Subscribe user to model update.
 * @param {String} sessionId User session ID.
 * @param {String} requestId User session ID>
 */
ControllerBase.prototype.subscribe = function (sessionId, requestId) {

    var self = this;

    if (!sessionId) {
        return;
    }

    self.subscribers_[sessionId] = true;

};

//noinspection JSUnusedLocalSymbols
/**
 * Unsubscribe user from model update.
 * @param {String} sessionId User session ID.
 * @param {String} requestId User request ID.
 */
ControllerBase.prototype.unsubscribe = function (sessionId, requestId) {

    var self = this;

    if (!sessionId) {
        return;
    }

    delete self.subscribers_[sessionId];

};
