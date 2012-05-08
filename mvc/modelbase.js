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

    var self = this,
        mvcConfig = config.$('mvc') || {};

    if (!propertyConfig || typeof propertyConfig !== 'object') {
        throw new Error('Property config must be specified');
    }

    events.EventEmitter.call(self);
    self.setMaxListeners(0);

    self.modelsCollectionName_ = mvcConfig.modelsCollectionName || self.modelsCollectionName_;
    self.config_ = config;
    self.name = name;

    self.on('changed', function (propertyName, oldValue, newValue, syncRequired) {
        self.changeHandler_(propertyName, oldValue, newValue, syncRequired);
    });

    self.dbProvider_ = new neutrino.io.DbProvider(config);

    self.on('storageReady', function () {
        self.isStorageReady_ = true;
    });

    self.dbProvider_.getCollection(self.modelsCollectionName_, function (collection) {
        self.storage_ = collection;
        self.emit('storageReady');
    });

    self.applyPropertyConfig(propertyConfig);
    self.loadFromStorage_();

}

/**
 * Current models collection name.
 * @type {String}
 * @private
 */
ModelBase.prototype.modelsCollectionName_ = neutrino.defaults.mvc.modelsCollectionName;

/**
 * Current database provider.
 * @type {neutrino.io.DbProvider}
 * @private
 */
ModelBase.prototype.dbProvider_ = null;

//noinspection JSValidateJSDoc
/**
 * Current models storage.
 * @type {mongodb.Collection}
 * @private
 */
ModelBase.prototype.storage_ = null;

/**
 * Is models storage ready.
 * @type {Boolean}
 * @private
 */
ModelBase.prototype.isStorageReady_ = false;

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
        modelObject = {name:self.name};

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

    if (!modelObject) {
        return;
    }

    var self = this,
        oldValue;

    for (var key in modelObject) {

        if (!modelObject.hasOwnProperty(key)) {
            continue;
        }

        if (!(key in self) || !(self[key] instanceof neutrino.mvc.Property)) {
            continue;
        }

        oldValue = self[key].$();

        if (oldValue === modelObject[key]) {
            continue;
        }

        self[key].$(modelObject[key]);
    }
};

/**
 * Handle data messages.
 * @param {Object} data Data of message.
 */
ModelBase.prototype.dataMessageHandler = function (data) {

    var self = this;
    self.emit('data', data);

};

/**
 * Handle synchronization messages.
 * @param {Object} data Synchronization data.
 */
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

    if (oldValue === data.newValue) {
        return;
    }

    self[data.propertyName].set(data.newValue, false);
    self.emit('changed', data.propertyName, oldValue, data.newValue, false);
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

        self.editInStorage_(propertyName, newValue);
        self.emit('sendSync', {
            modelName:self.name,
            propertyName:propertyName,
            oldValue:oldValue,
            newValue:newValue
        });
    }
};

/**
 * Apply model property configuration with default values.
 * @param {Object} propertyConfig Property configuration.
 */
ModelBase.prototype.applyPropertyConfig = function (propertyConfig) {

    var self = this;

    for (var key in propertyConfig) {

        if (!propertyConfig.hasOwnProperty(key)) {
            continue;
        }

        self[key] = new neutrino.mvc.Property(key, propertyConfig[key]);
        self[key].on('changed', function (name, oldValue, newValue) {
            self.emit('changed', name, oldValue, newValue);
        });

    }

};

/**
 * Load model object from models storage.
 * @private
 */
ModelBase.prototype.loadFromStorage_ = function () {

    var self = this,
        execute = function () {
            self.storage_.findOne({name:self.name}, function (error, modelObject) {
                if (error) {
                    self.emit('error', error);
                    return;
                }

                if (!modelObject) {
                    self.saveToStorage_();
                } else {
                    self.deserialize(modelObject);
                }
                self.emit('modelLoaded');
            });
        };

    if (self.isStorageReady_) {
        execute();
    } else {
        self.once('storageReady', execute);
    }

};

/**
 * Save current model state to models storage.
 * @private
 */
ModelBase.prototype.saveToStorage_ = function () {

    var self = this,
        modelObject = self.serialize(),
        execute = function () {
            self.storage_.insert(modelObject, {safe:true}, function (error, object) {

                if (error) {
                    self.emit('error', error);
                    return;
                }
                if (object) {
                    self.emit('modelSaved');
                }
            });
        };

    if (self.isStorageReady_) {
        execute();
    } else {
        self.once('storageReady', execute);
    }

};

/**
 * Edit model value in saved model storage.
 * @param {String} propertyName Name of property.
 * @param {*} newValue New value of property.
 * @private
 */
ModelBase.prototype.editInStorage_ = function (propertyName, newValue) {

    var setParameters = {};
    setParameters[propertyName] = newValue;

    var self = this,
        execute = function () {
            self.storage_.findAndModify({name:self.name}, [
                ['_id', 'desc']
            ], {$set:setParameters},
                function (error, object) {
                    if (error) {
                        self.emit('error', error);
                        return;
                    }
                    if (object) {
                        self.emit('propertySaved', propertyName, newValue);
                    }
                });
        };

    if (self.isStorageReady_) {
        execute();
    } else {
        self.once('storageReady', execute);
    }

};