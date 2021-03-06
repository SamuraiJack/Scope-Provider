Role('Scope.Provider.Role.WithDOM', {

    requires    : [ 'getDocument', 'create', 'getPreload', 'isAlreadySetUp', 'setViewportSize' ],

    has : {
        useStrictMode   : true,

        sourceURL               : null,
        crossOriginFailed       : false,

        innerHtmlHead   : null,
        innerHtmlBody   : null,

        minViewportSize : null,

        parentWindow    : function () { return window },
        scopeId         : function () { return Math.round(Math.random() * 1e10) },

        failOnResourceLoadError     : false,

        //                init function
        attachToOnError : function () {

            // returns the value of the attribute
            // the "handler" argument is no longer used, its now being taken from the __ONERROR__ handler every time
            return function (window, scopeId, handler, preventDefault, failOnResourceLoadError) {
                handler     = (window.opener || window.parent).Scope.Provider.__ONERROR__[ scopeId  ]

                if (failOnResourceLoadError && ("ErrorEvent" in window)) {
//                    if (window.ErrorEvent.__SIESTA_HOOK_INSTALLED__) return

                    // http://stackoverflow.com/questions/8504673/how-to-detect-on-page-404-errors-using-javascript
                    window.addEventListener('error', handler, true)

//                    window.ErrorEvent.__SIESTA_HOOK_INSTALLED__ = true
                } else {
                    var prevHandler         = window.onerror
                    if (prevHandler && prevHandler.__SP_MANAGED__) return

                    // this, "managed" handler is basically a wrapper around the current value in the "__ONERROR__" hash
                    window.onerror = function (message, url, lineNumber) {
                        // prevent recursive calls if other authors politely has not overwrite the handler and call it
                        if (handler.__CALLING__) return

                        handler.__CALLING__ = true

                        prevHandler && prevHandler.apply(this, arguments)

                        handler.apply(this, arguments)

                        handler.__CALLING__ = false

                        // in FF/IE need to return `true` to prevent default action
                        if (preventDefault !== false) return window.WebKitPoint ? false : true
                    }

                    window.onerror.__SP_MANAGED__ = true
                }
            }
        },

        // this is a "cached" onerror handler - a handler which was provided before the scope
        // has started the creation process - should be installed ASAP in the creation process
        // to allow catching of the exceptions in the scope with `sourceURL`
        cachedOnError   : null
    },


    override : {

        cleanup : function () {
            var onErrorHandler  = this.cachedOnError

            this.cachedOnError  = null

            // can throw exceptions for cross-domain case
            try {
                var scope       = this.scope

                if (scope.ErrorEvent /*&& scope.ErrorEvent.__SIESTA_HOOK_INSTALLED__*/) scope.removeEventListener('error', onErrorHandler)

                scope.onerror  = null
            } catch (e) {
            }

            this.SUPERARG(arguments)

            this.scope          = null
        }
    },


    methods : {

        cleanupHanlders : function () {
            var scopeProvider   = this.parentWindow.Scope.Provider
            var scopeId         = this.scopeId

            delete scopeProvider.__ONLOAD__[ scopeId ]
            delete scopeProvider.__ONERROR__[ scopeId ]
            delete scopeProvider.__FAILED_PRELOAD__[ scopeId ]
        },


        getHead : function () {
            return this.getDocument().getElementsByTagName('head')[ 0 ]
        },


        installOnErrorHandler : function (handler) {
            if (this.crossOriginFailed) return

            if (!this.isAlreadySetUp()) throw "Scope should be already set up"

            this.attachToOnError(this.scope, this.scopeId, handler, false, this.failOnResourceLoadError)
        },


        addOnErrorHandler : function (handler, preventDefault) {
            if (this.crossOriginFailed) return

            handler.__SP_MANAGED__  = true

            this.cachedOnError      = handler

            var scopeId     = this.scopeId

            this.parentWindow.Scope.Provider.__ONERROR__[ scopeId ] = handler

            var attachToOnError = ';(' + this.attachToOnError.toString() + ')(window, '
                + scopeId
                + ', (window.opener || window.parent).Scope.Provider.__ONERROR__[ ' + scopeId + ' ], '
                + preventDefault + ', '
                + this.failOnResourceLoadError
            + ');'

            if (this.isAlreadySetUp())
                this.runCode(attachToOnError)
            else {
                // this is a fallback - run the "attachToOnError" from inside of scope
                this.getPreload().unshift({
                    type        : 'js',
                    content     : attachToOnError,
                    unordered   : true
                })
            }
        },


        addSeedingToPreload : function () {
            var preload             = this.getPreload()

            if (this.seedingCode) preload.unshift({
                type            : 'js',
                content         : this.seedingCode
            })

            if (this.seedingScript) preload.push({
                type            : 'js',
                url             : this.seedingScript,
                isEcmaModule    : this.seedingScriptIsEcmaModule
            })
        },


        setup : function (callback) {
            var isIE                = 'v' == '\v' || Boolean(this.parentWindow.msWriteProfilerMark)
//            var isOpera             = Object.prototype.toString.call(this.parentWindow.opera) == '[object Opera]'
            var hasInlineScript     = false

            Joose.A.each(this.getPreload(), function (preloadDesc) {
                // IE will execute the inline scripts ASAP, this might be not what we want (inline script might be need executed only after some url script)
                // its however ok in some cases (like adding `onerror` handler
                // such inline scripts should be marked with `unordered` - true
                if (preloadDesc.type == 'js' && preloadDesc.content && !preloadDesc.unordered) {
                    hasInlineScript = true

                    return false
                }
            })

            var me          = this

            var cont        = function (e) {
                callback && callback(me, me.parentWindow.Scope.Provider.__FAILED_PRELOAD__[ me.scopeId ], e)
            }

            this.parentWindow.Scope.Provider.__FAILED_PRELOAD__[ this.scopeId ] = {}

            if (this.sourceURL || isIE && hasInlineScript) {
                this.addSeedingToPreload()

                this.setupIncrementally(cont)

            } else {
                // for sane browsers just add the seeding code and seeding script to preloads
                if (!isIE) this.addSeedingToPreload()

                // seeding scripts are included only for sane browsers (not IE)
                this.setupWithDocWrite(cont, isIE)
            }
        },


        setupWithDocWrite : function (callback, needToSeed) {
            var html        = []
            var me          = this

            Joose.A.each(this.getPreload(), function (preloadDesc) {

                if (preloadDesc.type == 'js')
                    html.push(
                        me.getScriptTagString(preloadDesc.url, preloadDesc.content, preloadDesc.isEcmaModule)
                    )

                else if (preloadDesc.type == 'css')
                    html.push(
                        me.getLinkTagString(preloadDesc.url, preloadDesc.content)
                    )

                else throw "Incorrect preload descriptor " + preloadDesc
            })

            // no need to wait for DOM ready - we'll overwrite it anyway
            this.create()

            var scopeId              = this.scopeId

            this.parentWindow.Scope.Provider.__ONLOAD__[ scopeId ]    = function () {
                var cont = function () { callback && callback() }

                // sane browsers - seeding code and script has been already added
                if (!needToSeed) { cont(); return }

                // our beloved IE - manually seeding the scope

                if (me.seedingCode) me.runCode(me.seedingCode, null)

                if (me.seedingScript)
                    me.runScript(me.seedingScript, cont, me.seedingScriptIsEcmaModule)
                else
                    cont()
            }

            var doc             = this.getDocument()

            doc.open()

            doc.write([
                this.useStrictMode ? '<!DOCTYPE html>' : '',
                '<html style="width: 100%; height: 100%; margin : 0; padding : 0;">',
                    '<head>',
                        this.innerHtmlHead || '',
                        html.join(''),
                    '</head>',

                    // delay here is for IE9 - the "onerror" handlers of the <script> tags are fired _after_ <body> onload otherwise
                    '<body style="margin : 0; padding : 0; width: 100%; height: 100%" onload="setTimeout(function () { (window.opener || window.parent).Scope.Provider.__ONLOAD__[' + scopeId + ']() }, 0)">',
                        this.innerHtmlBody || '',
                    '</body>',
                '</html>'
            ].join(''))

            doc.close()

            // Chrome (Webkit?) will clear the `onerror` after "doc.open()/.close()" so need to re-install it
            if (me.cachedOnError) me.installOnErrorHandler(me.cachedOnError)
        },


        setupIncrementally : function (callback) {
            var me      = this

            // here the "onerror" should be included early in the "preloads"
            this.create(function (me, e) {
                if (e) {
                    callback && callback(e)
                    return
                }

                if (!me.sourceURL) {
                    var doc     = me.getDocument()

                    if (me.innerHtmlHead) {
                        var head    = me.getHead()

                        // IE9 throws exception when accessing innerHTML of the <head> - its read only
                        try {
                            head.innerHTML  = me.innerHtmlHead
                        } catch (e) {
                            var div         = doc.createElement('div')

                            div.innerHTML   = me.innerHtmlHead

                            for (var i = 0; i < div.children.length; i++) head.appendChild(div.children[ i ])
                        }
                    }

                    if (me.innerHtmlBody) doc.body.innerHTML = me.innerHtmlBody
                }

                var loadScripts     = function (preloads, callback) {

                    var cont = function () {
                        // cleanup can happen in the middle of setup
                        if (me.scope) loadScripts(preloads, callback)
                    }

                    if (!preloads.length)
                        callback && callback()
                    else {
                        var preloadDesc     = preloads.shift()

                        if (preloadDesc.url)
                            me.runScript(preloadDesc.url, cont, preloadDesc.isEcmaModule)
                        else
                            if (preloadDesc.type == 'js')
                                me.runCode(preloadDesc.content, cont, preloadDesc.isEcmaModule)
                            else {
                                me.addStyleTag(preloadDesc.content)

                                cont()
                            }
                    }
                }

                // cleanup can happen in the middle of setup
                if (me.scope) loadScripts(me.getPreload().slice(), callback)
            })
        },


        getScriptTagString : function (url, text, isEcmaModule) {
            var type    = isEcmaModule ? 'module' : 'text/javascript',
                res     = '<script type="' + type + '"'

            var onerror = '(window.opener || window.parent).Scope.Provider.__FAILED_PRELOAD__[ scopeId ][ url ] = true'

            onerror     = onerror.replace(/scopeId/, "'" + this.scopeId + "'").replace(/url/, "'" + url + "'")

            if (url)
                res     += ' src="' + url + '" onerror="' + onerror + '"></script>'
            else
                res     += '>' + text.replace(/<\/script>/gi, '\\x3C/script>') + '</script>'

            return res
        },


        getLinkTagString : function (url, text) {
            if (url) return '<link href="' + url + '" rel="stylesheet" type="text/css" />'

            if (text) return '<style>' + text + '</style>'
        },



        loadCSS : function (url, callback) {
            var doc         = this.getDocument()
            var link        = doc.createElement('link')

            link.type       = 'text/css'
            link.rel        = 'stylesheet'
            link.href       = url

            var hasOnLoad   = false

            if ('onload' in link) {
                hasOnLoad   = true

                link.onload = function () {
                    link.onload     = null

                    if (callback) callback()

                    callback        = null
                    link            = null
                }
            }

            this.getHead().appendChild(link)

            if (!hasOnLoad) {
                var hasContinued    = false

                var cont            = function () {
                    // just in case some crazy JS engine calls `onerror` even after node removal
                    if (hasContinued) return
                    hasContinued    = true
                    clearTimeout(forcedTimeout)

                    if (callback) callback()

                    doc.body.removeChild(img)
                }

                var forcedTimeout   = setTimeout(cont, 30000)

                var img             = doc.createElement('img')

                img.onerror         = cont

                doc.body.appendChild(img)

                img.src             = url
            }
        },


        runCode : function (text, callback, isEcmaModule) {
            if (this.crossOriginFailed) {
                callback && callback()

                return
            }

            this.getHead().appendChild(this.createScriptTag(text, null, null, null, isEcmaModule))

            callback && callback()
        },


        runScript : function (url, callback, isEcmaModule) {
            if (this.crossOriginFailed) {
                callback && callback()

                return
            }

            var scopeId     = this.scopeId

            if (this.isCSS(url))
                this.loadCSS(url, callback)
            else {
                var onerror = function () {
                    this.onerror    = null

                    var doc         = this.ownerDocument
                    var win         = doc.defaultView || doc.parentWindow

                    ;(win.opener || win.parent).Scope.Provider.__FAILED_PRELOAD__[ scopeId ][ url ] = true

                    callback()
                }

                this.getHead().appendChild(this.createScriptTag(null, url, callback, onerror, isEcmaModule))
            }
        },


        createScriptTag : function (text, url, callback, errback, isEcmaModule) {
            var node = this.getDocument().createElement("script")

            node.setAttribute("type", isEcmaModule ? 'module' : 'text/javascript')

            if (url) node.setAttribute("src", url)

            if (text) node.text = text

            if (callback)
                node.onload = node.onreadystatechange = function () {
                    if (!node.readyState || node.readyState == "loaded" || node.readyState == "complete" || node.readyState == 4 && node.status == 200) {
                        node.onload = node.onreadystatechange = null

                        //surely for IE6..
                        if ('v' == '\v')
                            setTimeout(callback, 0)
                        else
                            callback()
                    }
                }

            if (errback) node.onerror = errback

            return node
        },


        addStyleTag : function (text) {
            var document    = this.getDocument()
            var node        = document.createElement('style')

            node.setAttribute("type", "text/css")

            var head = document.getElementsByTagName('head')[0]
            head.appendChild(node)

            if (node.styleSheet) {   // IE
                node.styleSheet.cssText = text
            } else {                // the world
                node.appendChild(document.createTextNode(text))
            }
        }
    }
})


/**

Name
====

Scope.Provider.Role.WithDOM - role for scope provider, which uses `script` tag for running the code.


SYNOPSIS
========

        Class('Scope.Provider.IFrame', {

            isa     : Scope.Provider,

            does    : Scope.Provider.Role.WithDOM,

            ...
        })

DESCRIPTION
===========

`Scope.Provider.Role.WithDOM` requires the implementation of the `getDocument` method, which should return the
document into which the `script` tags will be created.

In return, this role provides the implementation of `runCode` and `runScript`.




GETTING HELP
============

This extension is supported via github issues tracker: <http://github.com/SamuraiJack/Scope-Provider/issues>

For general Joose questions you can also visit [#joose](http://webchat.freenode.net/?randomnick=1&channels=joose&prompt=1)
on irc.freenode.org or the forum at: <http://joose.it/forum>



SEE ALSO
========

Web page of this module: <http://github.com/SamuraiJack/Scope-Provider/>

General documentation for Joose: <http://joose.github.com/Joose>


BUGS
====

All complex software has bugs lurking in it, and this module is no exception.

Please report any bugs through the web interface at <http://github.com/SamuraiJack/Scope-Provider/issues>



AUTHORS
=======

Nickolay Platonov <nplatonov@cpan.org>





COPYRIGHT AND LICENSE
=====================

This software is Copyright (c) 2010 by Nickolay Platonov <nplatonov@cpan.org>.

This is free software, licensed under:

  The GNU Lesser General Public License, Version 3, June 2007

*/