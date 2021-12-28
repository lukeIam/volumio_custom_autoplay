'use strict';

var libQ = require('kew');
var fs = require('fs-extra');
var config = new (require('v-conf'))();
var exec = require('child_process').exec;
var execSync = require('child_process').execSync;


module.exports = customAutoplay;
function customAutoplay(context) {
    var self = this;

    this.context = context;
    this.commandRouter = this.context.coreCommand;
    this.logger = this.context.logger;
    this.configManager = this.context.configManager;

}

customAutoplay.prototype.triggerAutoPlay = function (playCommand) {
    var self = this;
    self.logger.info('Triggering Custom Autoplay');

    self.commandRouter.replaceAndPlay(playCommand).then(function (e) {
        self.logger.info('Triggering Custom Autoplay: success reported');
    }).fail(function (e) {
        self.logger.error('Error Triggering Custom Autoplay: ' + e);
    }).fin(function () {
        setTimeout(function () { 
            var status = self.commandRouter.volumioGetState()["status"];
            if (status != "play" && self.retryCounter > 0) {
                self.logger.warn('Triggering Custom Autoplay: status wrong (' + status + '!=play). remaining retries: ' + self.retryCounter);
                self.retryCounter--;
                setTimeout(function () { self.triggerAutoPlay(playCommand) }, 1000);
            }
            else {
                self.logger.info('Triggering Custom Autoplay: success checked');
            }
        }, 5000);
    });

}

customAutoplay.prototype.onVolumioStart = function () {
    var self = this;
    var defer = libQ.defer();

    self.logger.info('Here we go');
    self.loadConfig();

    self.retryCounter = 100;

    var enabled = self.config.get('enabled') || false;
    var playCommand = self.config.get('playCommand') || "";

    if (!enabled) {
        self.logger.info('Custom Autoplay disabled: skipping');
    }
    else if (playCommand == "") {
        self.logger.info('Custom Autoplay command not set: skipping');
    }
    else{
        setTimeout(function () { self.triggerAutoPlay(JSON.parse(playCommand)) }, 1000);
    }
    defer.resolve();

    return defer.promise;
}

customAutoplay.prototype.onStart = function () {
    var self = this;
    var defer = libQ.defer();

    // Once the Plugin has successfull started resolve the promise
    defer.resolve();

    return defer.promise;
};

customAutoplay.prototype.onStop = function () {
    var self = this;
    var defer = libQ.defer();

    // Once the Plugin has successfull stopped resolve the promise
    defer.resolve();

    return defer.promise;
};

customAutoplay.prototype.onRestart = function () {
    var self = this;
    // Optional, use if you need it
};


// Configuration Methods -----------------------------------------------------------------------------
customAutoplay.prototype.loadConfig = function () {
    var self = this;
    var configFile = this.commandRouter.pluginManager.getConfigurationFile(this.context, 'config.json');
    self.config = new (require('v-conf'))();
    self.config.loadFile(configFile);
};

customAutoplay.prototype.saveConfig = function () {
    var self = this;
    self.config.save();
};
customAutoplay.prototype.setUIConfig = function (data) {
    var defer = libQ.defer();
    var self = this;
    self.logger.info('Custom Autoplay: Saving Config');
    self.loadConfig();
    var enabled = data['enabled'] || false;
    var playCommand = data['playCommand'] || "";
    self.config.set('enabled', enabled);
    self.config.set('playCommand', playCommand);
    self.saveConfig();
    self.logger.info('Custom Autoplay: Config Saved');
    this.commandRouter.pushToastMessage('success', 'custom_autoplay', this.commandRouter.getI18nString("TRANSLATE.CAP_SETTINGS_UPDATED"));
    defer.resolve()
    return defer.promise;
};

customAutoplay.prototype.getUIConfig = function () {
    var defer = libQ.defer();
    var self = this;

    var lang_code = this.commandRouter.sharedVars.get('language_code');

    self.commandRouter.i18nJson(__dirname + '/i18n/strings_' + lang_code + '.json',
        __dirname + '/i18n/strings_en.json',
        __dirname + '/UIConfig.json')
        .then(function (uiconf) {
            self.loadConfig();
            uiconf.sections[0].content[0].value = self.config.get('enabled') || false;
            uiconf.sections[0].content[1].value = self.config.get('playCommand') || "";

            defer.resolve(uiconf);
        })
        .fail(function () {
            defer.reject(new Error());
        });

    return defer.promise;
};

customAutoplay.prototype.getConfigurationFiles = function () {
    return ['config.json'];
}

