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

    self.on('error', function (error, sessionId) {
        if (!sessionId) return;
        self.view_.showError(error, sessionId);
    });

    self.view_.on('edit', function (propertyName, newValue, sessionId) {
        self.setValue(propertyName, newValue, sessionId);
    });

    self.view_.on('subscribe', function (sessionId) {
        self.subscribe(sessionId);
    });

    self.view_.on('unsubscribe', function (sessionId) {
        self.unsubscribe(sessionId);
    });

    self.view_.on('modelRequest', function (sessionId) {
        self.getModel(sessionId);
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

ControllerBase.prototype.subscribers_ = null;

/**
 * Set new value for specified property of model.
 * @param {String} propertyName Property name to update.
 * @param {*} newValue New value of property.
 * @param {Object} sessionId User session ID.
 */
ControllerBase.prototype.setValue = function (propertyName, newValue, sessionId) {

    var self = this,
        execute = function () {

            if (!(propertyName in self.model_)) {
                self.emit('error', Error('No property with such name'), sessionId);
            }

            if (neutrino.mvc.propertyPrivateRegExp.test(propertyName)) {
                self.emit('error', Error('Can not get or set private properties'), sessionId);
            }

            var setValidatorName = util.format(neutrino.mvc.propertySetValidatorFormat, propertyName);

            // use set property validator if it exists
            if (setValidatorName in self) {

                self[setValidatorName](newValue, sessionId, function (error) {

                    if (error) {
                        self.emit('error', error, sessionId);
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
                self.emit('error', error, sessionId);
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
 * Get current model property value.
 * @param {String} propertyName Name of model property.
 * @param {Object} sessionId User session ID.
 */
ControllerBase.prototype.getValue = function (propertyName, sessionId) {

    var self = this,
        execute = function () {

            if (!(propertyName in self.model_)) {
                throw new Error('No property with such name');
            }

            if (neutrino.mvc.propertyPrivateRegExp.test(propertyName)) {
                throw new Error('Can not get or set private properties');
            }

            var getValidatorName = util.format(neutrino.mvc.propertyGetValidatorFormat, propertyName);

            if (getValidatorName in self) {
                self[getValidatorName](sessionId, function (error) {
                    if (error) {
                        self.emit('error', error, sessionId);
                    } else {
                        self.view_.showValue(propertyName, self.model_[propertyName].$(), sessionId);
                    }
                });
            } else {
                self.view_.showValue(propertyName, self.model_[propertyName].$(), sessionId);
            }

        };

    // use model access validator if it exists.
    if (neutrino.mvc.modelAccessValidatorName in self) {
        self[neutrino.mvc.modelAccessValidatorName](sessionId, function (error) {
            if (error) {
                self.emit('error', error, sessionId);
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
 * @param {Object} sessionId User session ID.
 */
ControllerBase.prototype.getModel = function (sessionId) {

    var self = this,
        model = {},
        execute = function () {

            var modelObject = self.model_.serialize();

            for (var key in modelObject) {

                if (!modelObject.hasOwnProperty(key)) {
                    continue;
                }

                if (neutrino.mvc.propertyPrivateRegExp.test(key)) {
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
            self.view_.showModel(model, sessionId);
        };

    if (neutrino.mvc.modelAccessValidatorName in self) {

        self[neutrino.mvc.modelAccessValidatorName](sessionId, function (error) {
            if (error) {
                self.emit('error', error, sessionId);
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
    if (neutrino.mvc.propertyPrivateRegExp.test(propertyName)) {
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

ControllerBase.prototype.subscribe = function (sessionId) {

    var self = this;

    if (!sessionId) {
        return;
    }

    self.subscribers_[sessionId] = true;

};

ControllerBase.prototype.unsubscribe = function (sessionId) {

    var self = this;

    if (!sessionId) {
        return;
    }

    delete self.subscribers_[sessionId];

};
