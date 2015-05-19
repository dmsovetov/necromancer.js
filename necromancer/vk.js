var url         = require( 'url' )
  , fs          = require( 'fs' )
  , qs          = require( 'querystring' )
  , async       = require( 'async' )
  , request     = require( 'request' )
  , cheerio     = require( 'cheerio' )
  , format      = require( 'util' ).format
  , colors		= require( 'colors' )
  , Antigate    = require( 'antigate' )
  , http        = require( './http' )

// ** random
function random( array ) {
    return array[Math.floor(Math.random()*array.length)]
}

// ** randomElements
function randomElements( array, count ) {
    while( array.length > count ) {
        var index = Math.floor( Math.random() * array.length )
        array.splice( index, 1 )
    }

    return array
}

// ** auth
function auth( id, login, password, callback ) {
    var result      = { /*cookie: null,*/ messages: 0 }
    var parser      = null
    var vk          = http.create( 'http://m.vk.com/' )

//    var host        = 'http://m.vk.com/'
//    var userAgent   = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.10; rv:33.0) Gecko/20100101 Firefox/33.0'

    // ** action
    result.action = function( url, callback ) {
        callback = callback ? callback : function() {}

        vk.get( url,
            function( err, body ) {
                if( err ) return callback( err )

                var error = hasError( body )
                if( error ) {
                    console.log( error )
                    return callback( error )
                }

                processCaptcha( body,
                    function( err, params ) {
                        if( err )    return callback( err )
                        if( params ) return vk.post( url, params, callback )

                        callback( err, body )
                    } )
            } )
    }

    // ** getFriendRequests
    result.getFriendRequests = function( callback ) {
        vk.get( 'friends?section=requests',
            function( err, body ) {
				if( err ) return callback( err )
				
                var $       = cheerio.load( body )
                var items   = $('a.def')
                var friends = []

                // ** Get all friend requests
                items.each(
                    function( i, element ) {
                        var action = $(element).attr( 'href' )
                        var query  = parseQuery( action )

                        if( query.from ) {
                            return
                        }

                        friends.push( action )
                    } )

                // ** Pass friends to callback
				callback( null, friends )
            } )
    }

    // ** getTotalFriends
    result.getTotalFriends = function( callback ) {
        vk.get( 'friends',
            function( err, body ) {
				if( err ) return callback( err )
				
                var $      = cheerio.load( body )
                var total  = parseCounter( $, '/friends?section=all' )
                var online = parseCounter( $, '/friends?section=online' )

                callback( null, { total: total, online: online } )
            } )
    }

    // ** getRandomFriendsOnline
    result.getRandomFriendsOnline = function( count, callback ) {
        // ** Load friends online
        result.getFriendsOnline(
            function( err, result ) {
                if( err ) return callback( err )
                result = randomElements( result, count )
                callback( null, result )
            } )
    }

    // ** getFriendsOnline
    result.getFriendsOnline = function( callback ) {
        var items = []

        // ** load
        function load( offset ) {
            vk.get( 'friends?section=online&offset=' + offset,
                function( err, body ) {
					if( err ) return callback( err )

					var friends = findLinksByClass( cheerio.load( body ), '.si_owner' )
					if( friends.length ) {
					    items = items.concat( friends )
					    load( offset + 20 )
					} else {
					    callback( null, items )
					}
                } )
        }

        load( 0 )
    }

    // ** readInbox
    result.readInbox = function( user, callback ) {
        vk.get( 'mail?act=show&peer=' + user,
            function( err, body ) {
                if( err ) return callback( err )

                var items = findTextByClass( cheerio.load( body ), '.mi_text' )

                callback( null, items )
            } )
    }

    // ** sendMessage
    result.sendMessage = function( user, message, callback ) {
        vk.get( 'mail?act=show&peer=' + user,
            function( err, body ) {
                if( err ) return callback( err )

                var $      = cheerio.load( body )
                var action = $('form#write_form').attr( 'action' )

                post( action, { message: message }, callback )
            } )
    }

    // ** cleanInbox
    result.cleanInbox = function( user, callback ) {
        vk.get( 'mail?act=flush_history&peer=' + user, callback )
    }

    // ** loadUnread
    result.loadUnread = function( callback ) {
        vk.get( 'mail',
            function( err, body ) {
                if( err ) return callback( err )

                var result = []
                var urls   = findLinksByClass( cheerio.load( body ), '.dialog_item.di_unread_inbox' )
                urls.forEach(
                    function( url ) {
                        var params  = parseQuery( url )
                        result.push( { user: params.peer, url: url } )
                    } )

                callback( null, result )
            } )
    }

    // ** joinTo
    result.joinTo = function( target, callback ) {
        vk.get( target,
            function( err, body ) {
                var $    = cheerio.load( body )
                var join = null

                $('a').each(
                    function( i, element ) {
                        var url = $(element).attr( 'href' )
                        if( !url ) {
                            return
                        }

                        var params = parseQuery( url )

                        if( params.act == 'enter' ) {
                            join = url
                        }
                    } )

                if( join ) {
                    get( join )
                }

                callback( join == null )
            } )
    }

    // ** like
    result.like = function( target, callback ) {
        vk.get( target,
            function( err, body ) {
                var $    = cheerio.load( body )
                var like = findLinksByUrl( $, '/like?act=add&' )

                if( like ) {
                    result.action( $(like).attr( 'href' ), callback )
                } else {
                    callback( true )
                }
            } )
    }

    // ** getUserAvatars
    result.getUserAvatars = function( target, callback ) {
        vk.get( 'album' + target + '_0',
            function( err, body ) {
                if( err ) return callback( err )

                var result = findLinksByClass( cheerio.load( body ), '.thumb_item.al_photo' )
                callback( null, result )
            } )
    }

    // ** getRandomPosts
    result.getRandomPosts = function( target, type, count, callback ) {
        // ** Load wall
        result.getPosts( target, type, count * 4,
            function( err, result ) {
                if( err ) return callback( err )

                // ** While there are to much posts - remove random elements from array
                result = randomElements( result, count )

                // ** Run a callback
                callback( null, result )
            } )
    }

    // ** clearSavedPhotos
    result.clearSavedPhotos = function( callback ) {
        parser.savedPhotos( id,
            function( err, results ) {
                if( err ) return callback( err )

                parser.deletePhotoUrl( results,
                    function( err, results ) {
                        if( err ) return callback( err )
                        async.mapSeries( results, result.action,
                            function( err, result ) {
                                setTimeout(
                                    function() {
                                        callback( err, result )
                                    }, 1100 )
                            } )
                    } )
            } )
    }

    // ** getAvatars
    result.getAvatars = function( target, type, count, callback ) {
        var result = []

        vk.get( 'album' + target + '_0',
            function( err, body ) {
                if( err ) return callback( err )

                var result = findLinksByClass( cheerio.load( body ), '.thumb_item.al_photo' )

                task.process( result, 1000,
                    function( item ) {
                        get( item,
                            function( err, body ) {
                                var $    = cheerio.load( body )
                                var like = findLinksByUrl( $, '/like?act=add&' )

                                if( like ) {
                                    result.action( $(like).attr( 'href' ), callback )
                                } else {
                                    callback( true )
                                }
                            } )
                    }, callback )
            } )
    }

    // ** getPosts
    result.getPosts = function( target, type, count, callback ) {
        var result  = []

        function load( url ) {
            vk.get( url,
                function( err, body ) {
                    if( err ) return callback( err )

                    var filter = { like: '/like?act=add&', share: '/like?act=publish&' }
                    var $      = cheerio.load( body )
                    var urls = findLinksByUrl( $, filter[type] )

                    result = result.concat( urls )

                    var next = $('a.show_more').attr( 'href' )
                    if( !next || result.length > count ) {
                        result.length = Math.min( count, result.length )

                        for( var i = 0; i < result.length; i++ ) {
                            result[i] = $(result[i]).attr( 'href' )
                        }

                        return callback( null, result )
                    }

                    load( next )
                } )
        }

        load( target )
    }

    // ** postToGroup
    result.postToGroup = function( group, data, callback ) {
        callback = callback ? callback : function() {}

        vk.get( group,
            function( err, body ) {
				if( err ) return callback( err )
				
                var $       = cheerio.load( body )
                var action  = $('form').attr( 'action' )

                if( !action ) return callback( new Error( group + ' is a read-only group' ) )

                var wall    = url.parse( action ).pathname.replace( '/', '' )
                var params  = { message: data.text }

                if( data.photo ) {
                    for( var i = 0; i < data.photo.length; i++ ) {
                        params['attach' + (i + 1) + '_type'] = 'photo'
                        params['attach' + (i + 1)]           = data.photo[i]
                    }
                }

                params.from_group = data.fromGroup

                vk.post( action, params,
                    function( err, body ) {
						if( err ) return callback( err )
						
                        var $            = cheerio.load( body )
                        var form         = $('form')
                        var captchaImage = $('img.captcha_img').attr( 'src' )
                        var params       = {}

                        form.children( 'input' ).each(
                            function( i, element ) {
                                params[$(element).attr( 'name' )] = $(element).attr( 'value' )
                            } )

                        if( captchaImage ) {
                            decodeCaptcha( captchaImage,
                                function( err, captcha ) {
									if( err ) return callback( err )

                                    params['captcha_key'] = captcha
                                    vk.post( action, params,
                                        function( err, body ) {
                                            callback( null )
                                        } )
                                } )
                        } else {
                            var $     = cheerio.load( body )
                            var error = $('.service_msg')
                            if( error.contents().length ) {
                                console.log( error )
                                callback( new Error( error.text() ) )
                            } else {
                                if( callback ) callback( null )
                            }
                        }
                    } )
            } )
    }

    // ** hasError
    function hasError( body ) {
        var $     = cheerio.load( body )
        var error = $('.service_msg.service_msg_warning')

        if( error.contents().length ) {
            return error.text()
        }

        return null
    }

    // ** decodeCaptcha
    function decodeCaptcha( captcha, callback ) {
        var ag = new Antigate( '80d262e12769a07ef859eadde15f7e15' )

        ag.processFromURL( vk.host + captcha,
            function( err, text, id ) {
                callback( err, text )
            } )
    }

    // ** parseCounter
    function parseCounter( $, url ) {
        var link    = findLinksByUrl( $, url )
        var counter = $(link).children( '.tab_counter' ).text()

        return parseFloat( counter.replace( ' ', '' ) )
    }

    // ** findLinksByUrl
    function findLinksByUrl( $, url ) {
        var links  = $('a')
        var result = []

        links.each(
            function( i, element ) {
                var link = $(element)
                var href = link.attr( 'href' )
                if( href && href.indexOf( url ) == 0 ) {
                    result.push( element )
                }
            } )

        return result
    }

    // ** findLinksByClass
    function findLinksByClass( $, cls, ignore ) {
        var result = []

        $('a' + cls).each(
            function( i, link ) {
                if( $(link).hasClass( ignore ) ) {
                    return
                }

                result.push( $(link).attr( 'href' ) )
            } )

        return result
    }

    // ** findTextByClass
    function findTextByClass( $, cls ) {
        var result = []

        $.root().find( cls ).each(
            function( i, element ) {
                result.push( $(element).text() )
            } )

        return result
    }

    // ** processCaptcha
    function processCaptcha( body, callback ) {
        if( !body ) {
            console.log( 'processCaptcha:error' )
            return callback( null, false )
        }

        var $            = cheerio.load( body )
        var form         = $('form')
        var captchaImage = $('img.captcha_img').attr( 'src' )
        var params       = {}

        // ** No captcha
        if( !captchaImage ) {
            return callback( null, false )
        }

        console.log( 'Decoding captcha...' )

        // ** Save hidden input parameters
        form.children( 'input' ).each(
            function( i, element ) {
                params[$(element).attr( 'name' )] = $(element).attr( 'value' )
            } )

        // ** Decode captcha
        decodeCaptcha( captchaImage,
            function( err, captcha ) {
                if( err ) return callback( err )

                params['captcha_key'] = captcha
                callback( null, params )
            } )

        return true
    }

    // ** parseQuery
    function parseQuery( action ) {
        return qs.parse( url.parse( action ).query )
    }

    // ** signin
    function signin() {
        request( vk.host,
            function( err, response, body ) {
                var $       = cheerio.load( body )
                var action  = $( 'form' ).attr( 'action' )
                var query   = parseQuery( action )
                var params  = { act: 'login', al_frame: 1, email: login, ip_h: query.ip_h, pass: password }
                var jar     = request.jar()

                request.post( { url: action, followAllRedirects: true, form: params, jar: jar },
                    function( err, res, body ) {
                        var cookies = res.headers['set-cookie']
                        result.cookie = cookies.join( '; ' )
                        vk.setCookie( result.cookie )
                        parser    = require( './parser' ).create( vk.cookie, vk.userAgent )

                        console.log( 'Authorized:', result.cookie )

                        callback( result, parser )
                    } )
            } )
    /*
        request( vk.host,
            function( err, response, body ) {
                var $       = cheerio.load( body )
                var action  = $( 'form' ).attr( 'action' )
                var query   = parseQuery( action )
                var params  = { act: 'login', al_frame: 1, email: login, ip_h: query.ip_h, pass: password }
                var jar     = request.jar()

                request.post( { url: action, followAllRedirects: true, form: params, jar: jar },
                    function( err, res, body ) {
                        var cookies = res.headers['set-cookie']
                        result.cookie = cookies[cookies.length - 1]
                        vk.setCookie( result.cookie )
                        parser    = require( './parser' ).create( result.cookie, userAgent )

                        console.log( 'Authorized:', result.cookie )

                        callback( vk, parser )
                    } )
            } )
    */
    }

    // ** Start signing
    signin()
}

module.exports.auth = auth