Class('Scope.Provider.IFrame', {
    
    isa     : Scope.Provider,
    
    does    : Scope.Provider.Role.WithDOM,
    
    
    have : {
        iframe          : null,
        cls             : null,
        
        performWrap     : false,
        wrapCls         : null,
        wrapper         : null,
        
        // should be inside of the `wrapper` el
        iframeParentEl  : null,
        parentEl        : null,
        
        cleanupDelay    : 1000
    },
    

    methods : {
        
        getDocument : function () {
            return this.iframe.contentWindow.document
        },
        
        
        setViewportSize : function (width, height) {
            var iframe              = this.iframe
            
            if (!iframe) return
            
            iframe.style.width      = width + 'px'
            iframe.style.height     = height + 'px'
        },
        
        
        create : function (onLoadCallback) {
            var me                  = this
            var doc                 = this.parentWindow.document
            var iframe              = this.iframe = doc.createElement('iframe')
            
            var minViewportSize     = this.minViewportSize
            
            iframe.className        = this.cls || ''
            iframe.style.width      = (minViewportSize && minViewportSize.width || 1024) + 'px'
            iframe.style.height     = (minViewportSize && minViewportSize.height || 768) + 'px'
            iframe.setAttribute('frameborder', 0)
            
            if (this.name) iframe.setAttribute('name', this.name)

            var ignoreOnLoad        = false    
            
            var callback = function () {
                if (ignoreOnLoad) return
                
                if (iframe.detachEvent) 
                    iframe.detachEvent('onload', callback)
                else
                    iframe.onload = null
                    
                try {
                    var headContent = me.getHead().innerHTML
                    
                    onLoadCallback && onLoadCallback(me)
                } catch (e) {
                    // cross-origin exception
                    me.crossOriginFailed    = true
                    
                    onLoadCallback && onLoadCallback(me, e)
                }
            }
            
            if (iframe.attachEvent) 
                iframe.attachEvent('onload', callback)
            else
                iframe.onload   = callback
            
            iframe.src = this.sourceURL || 'about:blank'
            
            if (this.performWrap) {
                var wrapper             = this.wrapper
                
                if (!wrapper) {
                    wrapper             = this.wrapper = doc.createElement('div')
                    wrapper.className   = this.wrapCls || ''
                }
                
                ;(this.iframeParentEl || wrapper).appendChild(iframe)
                
                // no required anymore, since whole wrapper will be removed
                this.iframeParentEl     = null
            } 
            
            ;(this.parentEl || doc.body).appendChild(wrapper || iframe)
            
            var scope       = this.scope = iframe.contentWindow
            
            // dances with tambourine around the IE (probably for some old version, remove one day)
            if ('v' == '\v' || Boolean(this.parentWindow.msWriteProfilerMark)) {
                try {
                    var scopeDoc    = this.getDocument()
                    // only ignore the 1st call to callback when there is a `sourceURL` config
                    // which will later be assigned to `iframe.src` and will trigger a new iframe loading
                    if (this.sourceURL) ignoreOnLoad = true
                    
                    scopeDoc.open()
                    scopeDoc.write([
                        this.useStrictMode ? '<!DOCTYPE html>' : '',
                        '<html style="width: 100%; height: 100%; margin : 0; padding : 0;">',
                            '<head>',
                            '</head>',
                            '<body style="margin : 0; padding : 0; width: 100%; height: 100%">',
                            '</body>',
                        '</html>'
                    ].join(''))
                    scopeDoc.close()
                    
                    ignoreOnLoad = false
                } catch (e) {
                    // cross-origin exception
                    me.crossOriginFailed    = true
                }
                
                iframe.onreadystatechange = function () {
                    if (iframe.readyState == 'complete') iframe.onreadystatechange = null
                    
                    // trying to add the "early" onerror handler on each "readyState" change
                    // for some mystical reasons can't use `me.installOnErrorHandler` need to inline the call
                    if (me.cachedOnError && !me.crossOriginFailed) me.attachToOnError(scope, me.scopeId, me.cachedOnError)
                }
                
                if (this.sourceURL) iframe.src = this.sourceURL
            }
            
            // trying to add the "early" onerror handler - installing it in this stage will only work in FF 
            // (other browsers will clear on varios stages)
            if (me.cachedOnError) me.installOnErrorHandler(me.cachedOnError)
        },
        
        
        cleanup : function () {
            var wrapper     = this.wrapper || this.iframe
            var iframe      = this.iframe
            var me          = this
            
            // remove this property one more time, because sometimes it is not cleared in IE
            // (seems "onreadystatechange" is not fired)
            iframe.onreadystatechange   = null
            
            wrapper.style.display    = 'none'
            
            var onUnloadChecker = function () {
                if (!window.onunload) window.onunload = function () { return 'something' }
            }
            
            // add the `onunload` handler if there's no any - attempting to prevent browser from caching the iframe
            // trying to create the handler from inside of the scope
            this.runCode(';(' + onUnloadChecker.toString() + ')();')

            this.iframe     = null
            this.scope      = null
            this.wrapper    = null

            if (me.beforeCleanupCallback) me.beforeCleanupCallback()
            me.beforeCleanupCallback    = null
            
            if (!me.crossOriginFailed)
                // chaging the page, triggering `onunload` and hopefully preventing browser from caching the content of iframe
                iframe.src      = 'javascript:false'
            
            // wait again before removing iframe from the DOM, as recommended by some online sources
            setTimeout(function () {
                ;(me.parentEl || me.parentWindow.document.body).removeChild(wrapper)
                
                wrapper     = null
                iframe      = null
                
                me.parentEl = null
                
                me.cleanupHanlders()
                
                if (me.cleanupCallback) me.cleanupCallback()
                me.cleanupCallback  = null
                
            }, me.cleanupDelay)
        }
    }
})

/**

Name
====

Scope.Provider.IFrame - scope provider, which uses the iframe.


SYNOPSIS
========

        var provider = new Scope.Provider.IFrame()
        
        provider.setup(function () {
        
            if (provider.scope.SOME_GLOBAL == 'some_value') {
                ...
            }
            
            provider.runCode(text, callback)
            
            ...
            
            provider.runScript(url, callback)
            
            ...
            
            provider.cleanup()        
        })


DESCRIPTION
===========

`Scope.Provider.IFrame` is an implementation of the scope provider, which uses the iframe, 
to create a new scope.


ISA
===

[Scope.Provider](../Provider.html)


DOES
====

[Scope.Provider.Role.WithDOM](Role/WithDOM.html)



GETTING HELP
============

This extension is supported via github issues tracker: <http://github.com/SamuraiJack/Scope-Provider/issues>

You can also ask questions at IRC channel : [#joose](http://webchat.freenode.net/?randomnick=1&channels=joose&prompt=1)
 
Or the mailing list: <http://groups.google.com/group/joose-js>
 


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