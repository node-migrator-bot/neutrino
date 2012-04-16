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
/**
 * @fileoverview neutrino config storage implementation.
 * This depend on
 * path
 * @author denis.rechkunov@gmail.com (Denis Rechkunov)
 */

module.exports = Config;

var path = require('path');

/**
 * Read-only config storage.
 * @constructor
 * @param {string | object} config Path to config file or config object.
 */
function Config(config) {

    var self = this;

    self.configObj_ = {};

    // if config is a string then load file from path
    // if it's already object then save it
    // else it's empty object
    if (config && typeof(config) === 'string') {

        if (!path.existsSync(config)) {

            throw new Error('Config "' + config + '" not found!');
        }

        var configPath = path.resolve(config);
        self.configObj_ = require(configPath); // user-defined config

    } else if (config && typeof(config) === 'object') {
        self.configObj_ = config;
    }
}

/**
 * Protected config object.
 * @type {object}
 * @private
 */
Config.prototype.configObj_ = null;

/**
 * Function for fast accessing to config parameter.
 * @param {string} key Parameter name.
 */
Config.prototype.$ = function (key) {
    var self = this;
    return self.configObj_[key];
};

/**
 * Returns true if specified key is a name of existing parameter.
 * @param {string} key Name of parameter.
 */
Config.prototype.exists = function (key) {
    var self = this;
    return key in self.configObj_;
};