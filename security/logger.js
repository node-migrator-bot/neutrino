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
 * @fileoverview neutrino logger implementation.
 * This depend on
 * util,
 * path,
 * fs,
 * @author denis.rechkunov@gmail.com (Denis Rechkunov)
 */

module.exports = Logger;

var util = require('util'),
    path = require('path'),
    neutrino = require('../index.js');
fs = require('fs');

/**
 * Create new instance of neutrino logger.
 * @param {neutrino.core.Config} config neutrino config object.
 * @constructor
 *
 */
function Logger(config) {

    if (!config) {
        throw new Error('Config object is undefined!');
    }

    var self = this,
        loggerConfig = config.$('logger') || {};

    self.charset_ = config.$('charset') || self.charset_;
    self.levelsString_ = loggerConfig.level || self.levelsString_;

    self.initialize_(loggerConfig);

}

/**
 * Current logger levels string.
 * @type {string}
 */
Logger.prototype.levelsString_ = neutrino.defaults.logger.levels;

/**
 * Current level configuration.
 * @type {string}
 */
Logger.prototype.levels_ = {
    debug:false,
    error:false,
    warn:false,
    trace:false
};

/**
 * Current logger charset.
 * @type {string}
 */
Logger.prototype.charset_ = neutrino.defaults.charset;

/**
 * Generate functions and variables for each log level.
 * @param {object} loggerConfig Logger configuration object.
 */
Logger.prototype.initialize_ = function (loggerConfig) {

    var self = this;

    // generate functions for each log level
    var testRegExp;
    for (var key in self.levels_) {

        if (!self.levels_.hasOwnProperty(key)) {
            continue;
        }

        testRegExp = new RegExp('.*' + key + '.*', 'i');
        self.levels_[key] = testRegExp.test(self.levelsString_);

        self[key + 'Path_'] = loggerConfig[key] ?
            path.resolve(loggerConfig[key]) :
            path.resolve(neutrino.defaults.logger[key]);

        self[key] = new Function('message', 'this.write_("' + key + '",message);');

    }
};

//noinspection JSUnusedGlobalSymbols
/**
 * Write log message to console and file.
 * @param {string} level Type of message which specify log file path.
 * @param {string} message Log message.
 */
Logger.prototype.write_ = function (level, message) {

    var self = this;

    if (!self.levels_[level]) {
        return;
    }

    var now = new Date(),
        nowUtc = now.toUTCString(),

        logFilePath = self[level + 'Path_']
            .replace('%y', now.getUTCFullYear())
            .replace('%m', now.getUTCMonth() + 1)
            .replace('%d', now.getUTCDate())
            .replace('%h', now.getUTCHours()),
        logFolderPath = path.dirname(logFilePath),

        toConsole = util.format('%s - %s: PID %d. %s',
            nowUtc,
            level,
            process.pid,
            message instanceof Error ? message.stack : message);

    if (level == 'error') {

        console.error(toConsole);

    } else {

        console.log(toConsole);
    }

    // TODO replace with fs.exists in node API version 0.8
    path.exists(logFolderPath, function (exists) {

        if (!exists) {
            return;
        }

        var logFile = fs.createWriteStream(path.resolve(logFilePath), {flags:'a', encoding:self.charset_});
        logFile.end(toConsole + '\n');

    });
};