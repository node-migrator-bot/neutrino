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

var neutrino = require('../index.js'),
    config = new neutrino.core.Config(),
    randomValue = Math.random(),
    createdSessionId,
    sessionManager1 = new neutrino.security.SessionManager(config),
    sessionManager2 = new neutrino.security.SessionManager(config);

exports['Create session'] = function (test) {
    test.expect(3);
    var toAdd = {
        user:'test',
        key:randomValue
    };
    sessionManager1.create(toAdd, function (error, object, sessionId) {
        test.ifError(error);
        test.deepEqual(object.user, 'test');
        test.deepEqual(object.key, randomValue);
        createdSessionId = sessionId;
        test.done();
    });
};

exports['Get session'] = function (test) {
    test.expect(3);
    sessionManager2.$(createdSessionId, function (error, object) {
        test.ifError(error);
        test.deepEqual(object.user, 'test');
        test.deepEqual(object.key, randomValue);
        test.done();
    });
};

exports['Set value to session'] = function (test) {
    test.expect(6);
    sessionManager1.$(createdSessionId, function (error, object) {
        test.ifError(error);
        test.deepEqual(object.user, 'test2');
        test.deepEqual(object.key, randomValue);
        sessionManager2.$(createdSessionId, function (error, object) {
            test.ifError(error);
            test.deepEqual(object.user, 'test2');
            test.deepEqual(object.key, randomValue);
            test.done();
        });
    }, {user:'test2'});
};

exports['Remove session'] = function (test) {
    test.expect(3);
    sessionManager1.remove(createdSessionId, function (error) {
        test.ifError(error);
        sessionManager2.get(createdSessionId, function (error, object) {
            test.ifError(error);
            test.deepEqual(object, null);
            test.done();
        });
    });
};