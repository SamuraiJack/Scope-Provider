Class('Scope.Provider', {

    /*VERSION,*/

    has     : {
        name                : null,

        launchId            : null,

        scope               : null,

        seedingCode         : null,
        seedingScript       : null,
        seedingScriptIsEcmaModule : false,

        preload             : {
            is      : 'ro',
            init    : Joose.I.Array
        },

        cleanupCallback         : null,
        beforeCleanupCallback   : null
    },


    methods : {

        isCSS : function (url) {
            return /\.css(\?.*)?$/i.test(url)
        },


        isAlreadySetUp : function () {
            return Boolean(this.scope)
        },


        addPreload : function (preloadDesc) {
            if (this.isAlreadySetUp()) throw new Error("Can't use `addPreload` - scope is already setup. Use `runCode/runScript` instead")

            if (typeof preloadDesc == 'string')

                if (this.isCSS(preloadDesc))
                    preloadDesc = {
                        type        : 'css',
                        url         : preloadDesc
                    }
                else
                    preloadDesc = {
                        type        : 'js',
                        url         : preloadDesc
                    }
            else

                if (preloadDesc.text)
                    preloadDesc = {
                        type        : 'js',
                        content     : preloadDesc.text
                    }

            if (!preloadDesc.type) throw new Error("Preload descriptor must have the `type` property")

            this.preload.push(preloadDesc)
        },


        addOnErrorHandler : function (handler, callback) {
            throw "Abstract method `addOnErrorHandler` of Scope.Provider called"
        },


        create : function () {
            throw "Abstract method `create` of Scope.Provider called"
        },


        setup : function (callback) {
            throw "Abstract method `setup` of Scope.Provider called"
        },


        cleanup : function (callback) {
            throw "Abstract method `cleanup` of Scope.Provider called"
        },


        runCode : function (text, callback) {
            throw "Abstract method `runCode` of Scope.Provider called"
        },


        runScript : function (url, callback) {
            throw "Abstract method `runScript` of Scope.Provider called"
        }
    }
})


Scope.Provider.__ONLOAD__   = {}
Scope.Provider.__ONERROR__  = {}
Scope.Provider.__FAILED_PRELOAD__  = {}