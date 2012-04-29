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

    self.view_.on('edit', function (propertyName, newValue) {
        try {
            self.setValue(propertyName, newValue);
        } catch (e) {
            self.view_.showError(e);
        }
    });

    self.model_.on('changed', function (propertyName, oldValue, newValue) {
        if (!neutrino.mvc.privateCondition.test(propertyName)) {
            self.view_.updateValue(propertyName, oldValue, newValue);
        }
    });

    self.model_.on('modelRequest', function () {
        self.getModel();
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

/**
 * Set new value for specified property of model.
 * @param {String} propertyName Property name to update.
 * @param {*} newValue New value of property.
 */
ControllerBase.prototype.setValue = function (propertyName, newValue) {

    var self = this;

    if (neutrino.mvc.privateCondition.test(propertyName)) {
        throw new Error('Can not show or edit private properties');
    }

    if (!(propertyName in self.model_)) {
        throw new Error('No property with such name');
    }

    var validatorName = util.format('%sValidator', propertyName);

    if (validatorName in self) {
        // validator must raise an exception if new value is not valid.
        self[validatorName](newValue);
    }

    self.model_[propertyName].$(newValue);

};

/**
 * Get model object with public properties.
 */
ControllerBase.prototype.getModel = function () {

    var self = this,
        model = {};

    for (var key in self.model_) {

        //noinspection JSUnfilteredForInLoop
        if (neutrino.mvc.privateCondition.test(key)) {
            continue;
        }
        //noinspection JSUnfilteredForInLoop
        if (self.model_[key] instanceof neutrino.mvc.Property) {
            //noinspection JSUnfilteredForInLoop
            model[key] = self.model_[key].$();
        }
    }
    self.view_.showModel(model);
};