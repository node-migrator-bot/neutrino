#neutrino - framework for distributed web-service development.

##Description

The main aim of the project is to solve a scaling issue for node.js web-services. Node.js has an implementation of cluster but it's only locally on one physical machine.

Neutrino gives ability to create web-service which is distributed geographically on different physical or virtual servers around the world. Also neutrino can automatically balance your cluster and synchronize state of its worker nodes it also uses safe protocol for communication using key pair and TLS (optional). As a main data storage it uses MongoDB which also have a good scaling features.

Project is now on begin stage of development but has great plans.

##Project development

To be a contributor of this project, please read [Google JavaScript Style Guide](http://google-styleguide.googlecode.com/svn/trunk/javascriptguide.xml) and follow the guide instructions before commit or pull request. To document new code please use [JsDoc toolkit](http://code.google.com/p/jsdoc-toolkit/) and its [tag reference](http://code.google.com/p/jsdoc-toolkit/wiki/TagReference).

Denis Rechkunov <denis.rechkunov@gmail.com>