// ** random
function random( items ) {
    return items[Math.floor( Math.random() * items.length )]
}

// ** findUrls
function findUrls( text )
{
    var source = (text || '').toString();
    var urlArray = [];
    var url;
    var matchArray;

    // Regular expression to find FTP, HTTP(S) and email URLs.
    var regexToken = /([((ftp|https?):\/\/)]*[\-\w@:%_\+.~#?,&\/\/=]+)|((mailto:)?[_.\w-]+@([\w][\w\-]+\.)+[a-zA-Z]{2,3})/g;

    // Iterate through any URLs in the text.
    while( (matchArray = regexToken.exec( source )) !== null )
    {
        var token = matchArray[0];
        urlArray.push( token );
    }

    return urlArray;
}

function shouldLike( text ) {
    return text.indexOf( 'лайк' ) != -1 || text.indexOf( 'оцени' )
}

function avatar( text ) {
    return text.indexOf( 'аву' ) != -1 || text.indexOf( 'авку' ) != -1 || text.indexOf( 'фот' ) != -1
}

function wall( text ) {
    return text.indexOf( 'стене' ) != -1 || text.indexOf( 'стену' ) != -1
}

function join( text ) {
    return text.indexOf( 'подпис' ) != -1 || text.indexOf( 'подпиш' ) != -1 || text.indexOf( 'вступ' ) != -1
}

function greetings( text ) {
    return text.indexOf( 'прив' ) != -1
}

function sanitize( url ) {
    var items = ['http://', 'https://', 'm.vk.com/', 'vk.com/']

    for( var i = 0; i < items.length; i++ ) {
        url = url.replace( items[i], '' )
    }

    return url
}

var Greetings = ['привет', 'привет =)', 'хай', 'салют ;)', 'куку']
var What      = ['aсь?', 'что?', 'мы знакомы?']
var WillJoin  = ['готово, с тебя вступление в группу =)', 'прикольная группа =)']
var WillLike  = ['с тебя вступление в группу =)']

// ** parse
module.exports.parse = function( user, message ) {
    var input  = message.toLowerCase()
    var urls   = findUrls( input )
    var result = null

    // ** Parse URLs
    urls.forEach(
        function( url ) {
            if( url.indexOf( 'vk.com' ) == -1 ) {
                return
            }

            if( url.indexOf( 'public' ) != -1 || url.indexOf( 'club' ) != -1 ) {
                result = { action: 'join', url: sanitize( url ) }
            }
            else if( url.indexOf( 'photo' ) != -1 ) {
                result = { action: 'like', url: sanitize( url ) }
            }
            else if( url.indexOf( 'id' ) != -1 ) {
                if( avatar( input ) ) {
                    result = { action: 'likeUserAv', user: sanitize( url ).replace( 'id', '' ) }
                } else {
                    result = { action: 'likeWall', url: sanitize( url ) }
                }
            }
            else {
                if( join( input ) ) {
                    result = { action: 'join', url: sanitize( url ) }
                }
            }
        } )

    if( !result ) {
        var like = shouldLike( input )

        if( like && avatar( input ) ) {
            result = { action: 'likeUserAv', user: user }
        }
        if( like && wall( input ) ) {
            result = { action: 'likeWall', url: 'id' + user }
        }
    }

    return result
}

// ** reply
module.exports.reply = function( message ) {
    var input  = message.toLowerCase()
    var result = ''

    var urls   = findUrls( input )
    var result = { text: null, action: null, url: null }

    urls.forEach(
        function( url ) {
            if( url.indexOf( 'vk.com' ) == -1 ) {
                return
            }

            if( url.indexOf( 'public' ) != -1 || url.indexOf( 'club' ) != -1 ) {
                result.text     = 'щас вступлю'
                result.action   = 'join'
                result.url      = sanitize( url )
            }
            else if( url.indexOf( 'photo' ) != -1 ) {
                result.text     = 'щас лайкну'
                result.action   = 'like'
                result.url      = sanitize( url )
            }
            else if( url.indexOf( 'id' ) != -1 ) {
                result.text     = 'щас полайкаю'
                result.action   = 'likeWall'
                result.url      = sanitize( url )
            }
            else {
                result.text     = 'щас гляну чо там у вас =)'
                result.action   = 'lookup'
                result.url      = sanitize( url )
            }
        } )

    if( !result.text ) {
        var like = shouldLike( input )

        if( like && avatar( input ) ) {
            result.text   = 'конечно лайкну'
            result.action = 'likeUserAv'
        }
        if( like && wall( input ) ) {
            result.text   = 'лови пачку лайков'
            result.action = 'likeUserWall'
        }
    }

    if( greetings( input ) ) {
        result.text = random( Greetings ) + (result.text ? ', ' + result.text : '')
    }

    return result
}