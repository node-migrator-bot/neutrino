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

function SessionManager(config) {

}

/**
 * Database provider object.
 * @type {neutrino.io.DbProvider}
 * @private
 */
SessionManager.prototype.dbProvider_ = null;

/**
 * Get all active users.
 * @param {function(Array)} callback Sessions list handler.
 */
SessionManager.prototype.getSessionsList = function (callback) {

    callback([]);

};

/**
 * Create new session for user.
 * @param {String} username Name of user which need to create session.
 * @param {function(String)} callback Session creation result handler.
 */
SessionManager.prototype.createSession = function (username, callback) {

    callback('testSessionId');

};

/**
 * Remove session of specified user.
 * @param {String} sessionId ID of session which need to remove..
 * @param {function(Boolean)} callback Operation result handler.
 */
SessionManager.prototype.removeSession = function (sessionId, callback) {

    callback(true);

};

/**
 * Get session object for specified session ID.
 * @param {String} sessionId Session ID to get object.
 * @param {function(Object)} callback Session object handler.
 */
SessionManager.prototype.get = function (sessionId, callback) {


};

/**
 * Set new session object for specified session ID.
 * @param {String} sessionId Session ID to set object.
 * @param {function(Boolean)} callback
 * @param {Object} newSessionObject Object to set.
 */
SessionManager.prototype.set = function (sessionId, callback, newSessionObject) {


};

/**
 * Get or set object for specified session ID.
 * @param {String} sessionId Session ID to set or get object.
 * @param {function(Boolean|Object)} callback Operation result handler.
 * @param {Object} newSessionObject Object to set for specified session ID (Optional).
 */
SessionManager.prototype.$ = function (sessionId, callback, newSessionObject) {

    var self = this;
    if (newSessionObject === undefined) {
        self.get(sessionId, callback);
        return;
    }

    self.set(sessionId, callback, newSessionObject);
};