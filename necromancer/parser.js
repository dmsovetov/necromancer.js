//var request = require( 'request' )
var http    = require( './http' )
  , cheerio = require( 'cheerio' )
  , async   = require( 'async' )

// ** create
module.exports.create = function( cookies, userAgent ) {
    console.log( 'Vk parser created. Cookie:', cookies, 'UserAgent:', userAgent )
    var result      = {}
    var delay       = 1200
    var vk          = http.create( 'http://m.vk.com/', cookies )
    var api         = http.create( 'https://api.vk.com/method/', cookies )

    // ** savedPhotos
    result.savedPhotos = function( user, callback ) {
        // ** filter
        function filter( link ) {
            return link.hasClass( 'al_photo' )
        }

        vk.get( 'album' + user + '_000',
            function( err, result ) {
                if( err ) return callback( err )

                var links = findLinksByFilter( cheerio.load( result ), filter )
                callback( null, links )
            } )
    }

    // ** group
    result.group = function( target, callback ) {
        api.get( 'groups.getById?v=5.3&group_id=' + target + '&fields=members_count',
            function( err, result ) {
                if( err ) return callback( err )

                result = JSON.parse( result )
                if( result.error ) return callback( result.error )
                callback( null, result.response[0] )
            } )
    }

    // ** wall
    result.wall = function( target, count, callback ) {
        api.getJson( 'wall.get?v=5.3&domain=' + target + '&count=' + count,
            function( err, result ) {
                if( err ) return callback( err )
                if( result.error ) return callback( result.error )

                var response = result.response
                var posts    = response.items

                result = []
                for( var i = 0; i < posts.length; i++ ) {
                    var p = posts[i]
                    var l = (Math.floor( new Date().getTime() / 1000 ) - p.date) / 60
                    result.push( {
                                    source:         target,
                                    date:           p.date,
                                    lifetime:       l,
                                    url:            '/wall' + p.from_id + '_' + p.id,
                                    likes:          p.likes.count,
                                    likeRatio:      p.likes.count / l,
                                    reposts:        p.reposts.count,
                                    repostRatio:    p.reposts.count / l,
                                    text:           p.text,
                                    attachments:    p.attachments
                                 } )
                }

                callback( err, result )
            } )
    }

    // ** savePhotoUrl
    result.savePhotoUrl = function( target, callback ) {
        parsePhotoUrl( target,
            function( link ) {
                return link.hasClass( 'mva_item' ) && link.attr( 'href' ).indexOf( 'act=save_me' ) != -1
            }, callback )
    }

    // ** deletePhotoUrl
    result.deletePhotoUrl = function( target, callback ) {
        parsePhotoUrl( target,
            function( link ) {
                return link.hasClass( 'mva_item' ) && link.attr( 'href' ).indexOf( 'act=delete_photo' ) != -1
            }, callback )
    }

    // ** parsePhotoUrl
    function parsePhotoUrl( target, filter, callback ) {
        // ** Ensure
        target = target instanceof Array ? target : [ target ]

        async.mapSeries( target,
            function( item, callback ) {
                vk.get( item,
                    function( err, result ) {
                        if( err ) return callback( err )

                        var links = findLinksByFilter( cheerio.load( result ), filter )
                        delayCallback( callback, null, links[0] )
                    } )
            }, callback )
    }

    // ** findLinksByFilter
    function findLinksByFilter( $, filter ) {
        var result = []

        $('a').each(
            function( i, link ) {
                if( filter( $(link) ) ) {
                    result.push( $(link).attr( 'href' ) )
                }
            } )

        return result
    }

    // ** delayCallback
    function delayCallback( callback, err, result ) {
        setTimeout( function() { callback( err, result ) }, delay )
    }

    return result
}