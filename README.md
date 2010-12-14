If links in this document aren't work correctly, [try to open it from here](http://samuraijack.github.com/Scope-Provider)

Name
====

Scope.Provider - cross-platform JavaScript scope provider


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
        

INSTALLATION
============

From `npm`:
    
    > [sudo] npm install scope-provider         


SETUP
=====

In NodeJS:

    require('scope-provider')
    
    var provider = new Scope.Provider.NodeJS()
    
    provider.setup(function () {
        ...
    })
    
In browsers (assuming you've completed the 3.1 item from this [document](http://joose.github.com/Joose/doc/html/Joose/Manual/Installation.html)):

    <script type="text/javascript" src="/jsan/Task/Scope/Provider/Core.js"></script>
    <script type="text/javascript">
    
        var provider = new Scope.Provider.IFrame()
        
        provider.setup(function () {
            ...
        })
    </script>
    

DESCRIPTION
===========

`Scope.Provider` distribution implements cross-platform (browser/NodeJS) creation of the new JavaScript scope.
By itself, `Scope.Provider` is an abstract class, all concrete work is delegated to its subclasses:

[Scope.Provider.IFrame](Provider/IFrame.html)

[Scope.Provider.Window](Provider/Window.html)

[Scope.Provider.NodeJS](Provider/NodeJS.html)



ATTRIBUTES
==========

### scope

> `Object scope`

> A newly created scope (usually `window` in browsers and `global` in NodeJS)


METHODS
=======

### setup

> `setup(Function callback)`

> Set up a new scope. Scope will be ready in the provided callback. Callback will receive an instance of `Scope.Provider` as the
1st argument


### runCode

> `runCode(String text, Function callback)`

> Run a code, presented with `text` argument, in the previously created scope. Code will be ran by the time of the 
`callback` function called. Callback won't receive any arguments.


### runScript

> `runScript(String url, Function callback)`

> Run a code, in script on the `url`, in the previously created scope. Code will be ran by the time of the 
`callback` function called. Callback won't receive any arguments.


### cleanup

> `cleanup()`

> Releases any resources, used during scope creation.


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
