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
 * @param {neutrino.mvc.ModelBase} model Controller's model.
 * @param {neutrino.mvc.ViewBase} view View connected with controller.
 * @constructor
 */
function ControllerBase(config, model, view) {

    var self = this;

    events.EventEmitter.call(self);
    self.setMaxListeners(0);

    self.model_ = model;
    self.view_ = view;
    self.config_ = config;

    self.subscribers_ = {};

    self.view_.on('edit', function (propertyName, newValue, sessionObject) {
        try {
            self.setValue(propertyName, newValue, sessionObject);
        } catch (e) {
            self.view_.showError(e, sessionObject);
        }
    });

    self.view_.on('subscribe', function (sessionObject) {
        self.subscribe(sessionObject);
    });

    self.view_.on('unsubscribe', function (sessionObject) {
        self.unsubscribe(sessionObject);
    });

    self.model_.on('changed', function (propertyName, oldValue, newValue) {
        self.modelUpdateHandler(propertyName, oldValue, newValue);
    });

    self.model_.on('modelRequest', function (sessionObject) {
        try {
            self.getModel(sessionObject);
        } catch (e) {
            self.view_.showError(e, sessionObject);
        }
    });

}

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
 * @param {Object} sessionObject User session object.
 */
ControllerBase.prototype.setValue = function (propertyName, newValue, sessionObject) {

    var self = this;

    if (!(propertyName in self.model_)) {
        throw new Error('No property with such name');
    }

    if (neutrino.mvc.propertyPrivateRegExp.test(propertyName)) {
        throw new Error('Can not get or set private properties');
    }

    var setValidatorName = util.format(neutrino.mvc.propertySetValidatorFormat, propertyName);

    if (setValidatorName in self) {
        // validator must raise an exception if new value is not valid.
        self[setValidatorName](newValue, sessionObject);
    }

    self.model_[propertyName].$(newValue);

};

/**
 * Get current model property value.
 * @param {String} propertyName Name of model property.
 * @param {Object} sessionObject User session object.
 */
ControllerBase.prototype.getValue = function (propertyName, sessionObject) {

    var self = this;

    if (neutrino.mvc.modelAccessValidatorName in self) {
        self[neutrino.mvc.modelAccessValidatorName](sessionObject);
    }

    if (!(propertyName in self.model_)) {
        throw new Error('No property with such name');
    }

    if (neutrino.mvc.propertyPrivateRegExp.test(propertyName)) {
        throw new Error('Can not get or set private properties');
    }

    var getValidatorName = util.format(neutrino.mvc.propertyGetValidatorFormat, propertyName);

    if (getValidatorName in self) {
        self[getValidatorName](sessionObject);
    }

    self.view_.showValue(propertyName, self.model_[propertyName].$(), sessionObject);
};

/**
 * Get model object with public properties.
 * @param {Object} sessionObject User session object.
 */
ControllerBase.prototype.getModel = function (sessionObject) {

    var self = this,
        model = {};

    if (neutrino.mvc.modelAccessValidatorName in self) {
        self[neutrino.mvc.modelAccessValidatorName](sessionObject);
    }

    var modelObject = self.model_.deserialize();

    for (var key in modelObject) {

        if (!modelObject.hasOwnProperty(key)) {
            continue;
        }

        if (neutrino.mvc.propertyPrivateRegExp.test(key)) {
            continue;
        }

        var getValidatorName = util.format(neutrino.mvc.propertyGetValidatorFormat, key);

        if (getValidatorName in self) {
            try {
                self[getValidatorName](sessionObject);
            } catch (e) {
                continue;
            }
        }

        modelObject[key] = modelObject[key];
    }
    self.view_.showModel(model, sessionObject);

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

    var getValidatorName = util.format(neutrino.mvc.propertyGetValidatorFormat, propertyName),
        sessionObject;

    for (var sessionId in self.subscribers_) {

        if (!self.subscribers_.hasOwnProperty(sessionId)) {
            continue;
        }

        sessionObject = self.subscribers_[sessionId];

        if (getValidatorName in self) {

            try {
                self[getValidatorName](sessionObject);
            } catch (e) {
                continue;
            }
        }

        self.view_.updateValue(propertyName, oldValue, newValue, sessionObject);
    }

};

ControllerBase.prototype.subscribe = function (sessionObject) {

    var self = this;

    if (!sessionObject.sid) {
        return;
    }

    self.subscribers_[sessionObject.sid] = sessionObject;

};

ControllerBase.prototype.unsubscribe = function (sessionObject) {

    var self = this;

    if (!sessionObject.sid) {
        return;
    }

    delete self.subscribers_[sessionObject.sid];

};
