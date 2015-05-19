var request = require( 'request' )
  , async   = require( 'async' )

// ** create
module.exports.create = function( host, cookie, userAgent, maxRetries ) {
    var result = { cookie: cookie, host: host, userAgent: userAgent, maxRetries: maxRetries }

    // ** Set default maximum retries
    maxRetries = maxRetries ? maxRetries : 5

    // ** Set default user agent
    userAgent  = userAgent ? userAgent : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.10; rv:33.0) Gecko/20100101 Firefox/33.0'

    // ** setCookie
    result.setCookie = function( value ) {
        result.cookie = value
    }

    // ** getJson
    result.getJson = function( target, callback ) {
        async.retry( result.maxRetries,
            function( callback, results ) {
                result.get( target,
                    function( err, result ) {
                        if( err ) return callback( err )

                        try {
                            result = JSON.parse( result )
                            if( !result ) return callback( new Error( 'failed to parse JSON response' ) )
                        } catch( e ) {
                            callback( e )
                        }

                        callback( null, result )
                    } )
            },
            function( err, result ) {
                if( callback ) callback( err, result )
            } )
    }

    // ** get
    result.get = function( target, callback ) {
        async.retry( result.maxRetries,
            function( callback, results ) {
                request.get( { url: result.host + target, headers: { Cookie: result.cookie, 'User-Agent': result.userAgent } },
                    function( err, res, body ) {
                        callback( err, body )
                    } )
                    .on( 'error', callback )
                    .end()
            },
            function( err, result ) {
                if( callback ) callback( err, result )
            } )
    }

    // ** post
    result.post = function( target, params, callback ) {
        async.retry( result.maxRetries,
            function( callback, results ) {
                request.post( { url: result.host + target, headers: { Cookie: result.cookie, 'User-Agent': result.userAgent }, form: params },
                    function( err, res, body ) {
                        callback( err, body )
                    } )
                    .on( 'error', callback )
                    .end()
            },
            function( err, result ) {
                if( callback ) callback( err, result )
            } )
    }

    return result
}