var request = require( 'request' )
  , http    = require( 'http' )

// ** create
function create( page, callback )
{
    var cookies = null
    var result  = {}
    var host    = 'http://olike.ru/ajax.php?'

    console.log( 'Authorizing OLike for', page )

    // ** getLike
    result.getLike = function( callback ) {
        request.get( { url: host + 'func=gettask&type=vk-likes', headers: { Cookie: cookies[0] } },
            function( err, res, body ) {
                if( err ) return callback( err )

                var response = JSON.parse( body )
                if( response.status == 'error' ) return callback( response )

                callback( null, response )
            } )
    }

    // ** check
    result.check = function( id, callback ) {
        request.get( { url: host + 'func=checkAction&id=' + id, followAllRedirects: true, headers: { Cookie: cookies[0] } },
            function( err, res, body ) {
                if( err ) return callback( err )

                if( body == 'authredirect' ) {
                    return result.login( callback )
                }

                var r = parseInt( body )
                if( isNaN( r ) ) {
                    console.log( res )
                    return callback( body )
                }

                callback( null, r )
            } )
    }

    // ** login
    result.login = function( callback ) {
        console.log( 'Completing olike login...' )
        request.get( { url: 'http://olike.ru/profiles.php?login=vkk', headers: { Cookie: cookies[0] } },
            function( err, res, body ) {
                callback( err, null )
            } )
    }

    // ** Authorize
    request.post( { url: 'http://olike.ru/profiles.php?login=vkk', form: { vkk: page } },
        function( err, res, body ) {
            cookies = res.headers['set-cookie']
            console.log( 'OLike authorized for', page, cookies[0] )
            callback( result )
        } )
}
// ** create
module.exports.create = create