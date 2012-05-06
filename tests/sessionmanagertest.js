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


exports.sessionManagerTest = function (test) {

    var neutrino = require('../index.js'),
        config = new neutrino.core.Config(),
        randomValue = Math.random(),
        createdSessionId,
        sessionManager1 = new neutrino.security.SessionManager(config),
        sessionManager2 = new neutrino.security.SessionManager(config);


    startTest();

    function startTest() {
        createTest();
    }

    function createTest() {
        var toAdd = {
            user:'test',
            key:randomValue
        };
        sessionManager1.create(toAdd, function (error, object, sessionId) {
            test.ifError(error);
            test.deepEqual(object.user, 'test');
            test.deepEqual(object.key, randomValue);
            createdSessionId = sessionId;
            getTest('test', function () {
                setTest();
            });
        });
    }

    function getTest(user, callback) {

        sessionManager2.$(createdSessionId, function (error, object) {
            test.ifError(error);
            test.deepEqual(object.user, user);
            test.deepEqual(object.key, randomValue);
            callback();
        });
    }

    function setTest() {

        sessionManager1.$(createdSessionId, function (error, object) {
            test.ifError(error);
            test.deepEqual(object.user, 'test2');
            test.deepEqual(object.key, randomValue);
            getTest('test2', function () {
                removeTest();
            });
        }, {user:'test2'});
    }

    function removeTest() {
        sessionManager1.remove(createdSessionId, function (error) {
            test.ifError(error);
            sessionManager2.get(createdSessionId, function (error, object) {
                test.ifError(error);
                test.deepEqual(object, null);
                test.done();
            });
        });
    }

};
