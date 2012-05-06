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
module.exports = DbProvider;
var mongodb = require('mongodb'),
    util = require('util'),
    events = require('events');

util.inherits(DbProvider, events.EventEmitter);

function DbProvider(config) {

    var self = this,
        dbConfig = config.$('database') || {};

    events.EventEmitter.call(self);

    var host = dbConfig.host || neutrino.defaults.database.host,
        port = dbConfig.port || neutrino.defaults.database.port,
        name = dbConfig.name || neutrino.defaults.database.name,
        options = dbConfig.options || neutrino.defaults.database.options,
        serverOptions = dbConfig.serverOptions || neutrino.defaults.database.serverOptions,
        user = dbConfig.user || neutrino.defaults.database.user,
        password = dbConfig.password || neutrino.defaults.database.password,
        server = new mongodb.Server(host, port, serverOptions);

    self.on('open', function (error, client) {
        self.openHandler_(user, password, error, client);
    });

    self.on('auth', function (error, object) {
        self.authHandler_(error, object);
    });

    self.on('close', function () {
        self.closeHandler_();
    });

    self.db_ = new mongodb.Db(name, server, options);

    self.db_.on('close', function () {
        self.emit('close');
    });

    self.db_.open(function (error, client) {
        self.emit('open', error, client);
    });
}

DbProvider.prototype.db_ = null;

DbProvider.prototype.isAuth_ = false;

DbProvider.prototype.dbClient_ = null;

DbProvider.prototype.authHandler_ = function (error, result) {

    var self = this;

    if (error) self.errorHandler_(error);

    self.isAuth_ = result;
};

DbProvider.prototype.openHandler_ = function (user, password, error, client) {

    var self = this;

    if (error) self.errorHandler_(error);

    self.dbClient_ = client;

    self.db_.authenticate(user, password, function (error, result) {
        self.emit('auth', error, result);
    });

};

DbProvider.prototype.closeHandler_ = function () {

    var self = this;

    self.dbClient_ = null;
    self.isAuth_ = false;

};

DbProvider.prototype.errorHandler_ = function (error) {

    var self = this;

    self.emit('error', error);

};

DbProvider.prototype.getCollection = function (name, callback) {

    var self = this,
        resultHandler = function () {

            var collection = new mongodb.Collection(self.dbClient_, name);
            callback(collection);

        };

    if (self.dbClient_ && self.isAuth_) {
        resultHandler();
    }

    self.once('error', function () {
        callback(null);
    });

    self.once('auth', function () {
        resultHandler();
    });

};

DbProvider.prototype.close = function () {

    var self = this;
    self.db_.close();

};