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

module.exports = SessionManager;

var util = require('util'),
    mongodb = require('mongodb'),
    crypto = require('crypto'),
    events = require('events');

util.inherits(SessionManager, events.EventEmitter);

function SessionManager(config) {

    var self = this,
        sessionConfig = config.$('sessions') || {};

    events.EventEmitter.call(self);

    self.collectionName_ = sessionConfig.collectionName || self.collectionName_;
    self.expiredTimeout_ = sessionConfig.expiredTimeout || self.expiredTimeout_;
    self.checkExpiredInterval_ = sessionConfig.checkExpiredInterval || self.checkExpiredInterval_;

    self.dbProvider_ = new neutrino.io.DbProvider(config);
    self.dbProvider_.on('error', function (error) {
        self.emit('error', error);
    });

    self.dbProvider_.getCollection(self.collectionName_, function (collection) {
        self.storage_ = collection;
        self.emit('storageReady');
    });

    self.on('storageReady', function () {
        self.isStorageReady_ = true;
    });

    self.checkExpiredIntervalHandle_ = setInterval(function () {
        self.checkExpired();
    }, self.checkExpiredInterval_);
}

/**
 * Is session storage ready.
 * @type {Boolean}
 */
SessionManager.prototype.isStorageReady_ = false;

/**
 * Name of session storage in database.
 * @type {String}
 * @private
 */
SessionManager.prototype.collectionName_ = neutrino.defaults.sessions.collectionName;

/**
 * Count of minutes before session will be destroyed.
 * @type {Number}
 * @private
 */
SessionManager.prototype.expiredTimeout_ = neutrino.defaults.sessions.expiredTimeout;

/**
 * Interval in milliseconds to collect garbage in session storage.
 * @type {Number}
 * @private
 */
SessionManager.prototype.checkExpiredInterval_ = neutrino.defaults.sessions.checkExpiredInterval;

/**
 * Database provider object.
 * @type {neutrino.io.DbProvider}
 * @private
 */
SessionManager.prototype.dbProvider_ = null;

//noinspection JSValidateJSDoc
/**
 * Session database collection.
 * @type {mongodb.Collection}
 * @private
 */
SessionManager.prototype.storage_ = null;

/**
 * Handle of garbage collector interval.
 * @type {*}
 * @private
 */
SessionManager.prototype.checkExpiredIntervalHandle_ = null;

/**
 * Create new session for user.
 * @param {Object} sessionObject New session object.
 * @param {function(Error,Object,String)} callback Session creation result handler.
 */
SessionManager.prototype.create = function (sessionObject, callback) {

    var self = this,
        now = new Date().getTime(),
        expiredDate = now + self.expiredTimeout_,
        execute = function () {
            sessionObject.expired = expiredDate;
            sessionObject.sid = self.createSessionId();
            self.storage_.insert(sessionObject, {safe:true}, function (error, objects) {

                if (error) {
                    self.emit('error', error);
                }

                var object = objects[0];

                callback(error, object, !error ? object.sid : null);

            });
        };

    if (self.isStorageReady_) {
        execute();
    } else {
        self.once('storageReady', execute);
    }
};

/**
 * Remove session of specified user.
 * @param {String} sessionId ID of session which need to remove..
 * @param {function(Error)} callback Operation result handler.
 */
SessionManager.prototype.remove = function (sessionId, callback) {

    var self = this,
        execute = function () {

            self.storage_.remove({sid:sessionId}, {safe:true}, function (error) {

                if (error) {
                    self.emit('error', error);
                }

                callback(error);

            });
        };

    if (self.isStorageReady_) {
        execute();
    } else {
        self.once('storageReady', execute);
    }
};

/**
 * Get session object for specified session ID.
 * @param {String} sessionId Session ID to get object.
 * @param {function(Error,Object)} callback Session object handler.
 */
SessionManager.prototype.get = function (sessionId, callback) {

    var self = this,
        execute = function () {

            self.storage_.findOne({sid:sessionId}, function (error, object) {

                if (error) {
                    self.emit('error', error);
                }

                callback(error, object);

            });
        };

    if (self.isStorageReady_) {
        execute();
    } else {
        self.once('storageReady', execute);
    }
};

/**
 * Set new session object for specified session ID.
 * @param {String} sessionId Session ID to set object.
 * @param {Object} setParameters Parameters to set.
 * @param {function(Error,Object)} callback
 */
SessionManager.prototype.set = function (sessionId, setParameters, callback) {

    var self = this,
        now = new Date().getTime(),
        expiredDate = now + self.expiredTimeout_,
        execute = function () {

            setParameters.expired = expiredDate;

            self.storage_.findAndModify({sid:sessionId}, [
                ['_id', 'asc']
            ], {$set:setParameters}, {new:true, upsert:false},
                function (error, object) {

                    if (error) {
                        self.emit('error', error);
                    }

                    callback(error, object);

                });

        };

    if (self.isStorageReady_) {
        execute();
    } else {
        self.once('storageReady', execute);
    }
};

/**
 * Get or set object for specified session ID.
 * @param {String} sessionId Session ID to set or get object.
 * @param {function(Error,Object)} callback Operation result handler.
 * @param {Object} setParameters Object to set for specified session ID (Optional).
 */
SessionManager.prototype.$ = function (sessionId, callback, setParameters) {

    var self = this;
    if (setParameters === undefined) {
        self.get(sessionId, callback);
        return;
    }

    self.set(sessionId, setParameters, callback);
};

/**
 * Remove expired sessions from storage.
 */
SessionManager.prototype.checkExpired = function () {

    var self = this,
        now = new Date(),
        execute = function () {
            self.storage_.remove({'expired':{$lte:now.getTime()}})
        };

    if (self.isStorageReady_) {
        execute();
    } else {
        self.once('storageReady', execute);
    }

};

/**
 * Stop removing expired sessions.
 */
SessionManager.prototype.stopCheckExpireInterval = function () {
    var self = this;
    clearInterval(self.checkExpiredIntervalHandle_);
};

/**
 * Create new unique session ID.
 * @return {String}
 */
SessionManager.prototype.createSessionId = function () {

    var now = new Date(),
        uniqueKey = util.format('%d:%d:%d', now.getTime(), Math.random(), Math.random()),
        hash = crypto.createHash('sha512');

    hash.update(uniqueKey, "utf8");
    return hash.digest('hex');

};