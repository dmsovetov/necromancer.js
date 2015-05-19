var express     = require( 'express' )
  , later       = require( 'later' )
  , bot         = require( './necromancer/bot' )
  , agregate    = require( './necromancer/agregate' )

var app = express()

var Groups   =  [
                    'v_i_p__p_i_a_r','dobav_like_repost_piar','spottsila','club59921851','fr_ien_ds10000','club23206079','wormix_plus','go2friends',
                    'thefrends','club46258034','goofriend','club55958164','altpost','buzinamnedruzi','iron_like','positiv7','club36539410','add_to_friends_10000'
            	]

var Messages = ['Ребята, взаимные репостики!', 'ДОБАВЬ В ДРУЗЬЯ! У меня лимит', 'Добавлю всех без подписок! У меня лимит :(', 'Добавляйтесь, а то у меня лимит!', 'добавлю всех!!', 'ДОБАВЛЮ ВСЕХ!!!ДОБАВЛЮ ВСЕХ!!!ДОБАВЛЮ ВСЕХ!!!ДОБАВЛЮ ВСЕХ!!!ДОБАВЛЮ ВСЕХ!!!ДОБАВЛЮ ВСЕХ!!!ДОБАВЛЮ ВСЕХ!!!ДОБАВЛЮ ВСЕХ!!!ДОБАВЛЮ ВСЕХ!!!ДОБАВЛЮ ВСЕХ!!!ДОБАВЛЮ ВСЕХ!!!ДОБАВЛЮ ВСЕХ!!!ДОБАВЛЮ ВСЕХ!!!ДОБАВЛЮ ВСЕХ!!!ДОБАВЛЮ ВСЕХ!!!ДОБАВЛЮ ВСЕХ!!!ДОБАВЛЮ ВСЕХ!!!ДОБАВЛЮ ВСЕХ!!!ДОБАВЛЮ ВСЕХ!!!ДОБАВЛЮ ВСЕХ!!!ДОБАВЛЮ ВСЕХ!!!ДОБАВЛЮ ВСЕХ!!!ДОБАВЛЮ ВСЕХ!!!ДОБАВЛЮ ВСЕХ!!!ДОБАВЛЮ ВСЕХ!!!ДОБАВЛЮ ВСЕХ!!!ДОБАВЛЮ ВСЕХ!!!ДОБАВЛЮ ВСЕХ!!!ДОБАВЛЮ ВСЕХ!!!ДОБАВЛЮ ВСЕХ!!!ДОБАВЛЮ ВСЕХ!!!ДОБАВЛЮ ВСЕХ!!!ДОБАВЛЮ ВСЕХ!!!ДОБАВЛЮ ВСЕХ!!!ДОБАВЛЮ ВСЕХ!!!ДОБАВЛЮ ВСЕХ!!!ДОБАВЛЮ ВСЕХ!!!ДОБАВЛЮ ВСЕХ!!!ДОБАВЛЮ ВСЕХ!!!ДОБАВЛЮ ВСЕХ!!!ДОБАВЛЮ ВСЕХ!!!ДОБАВЛЮ ВСЕХ!!!ДОБАВЛЮ ВСЕХ!!!ДОБАВЛЮ ВСЕХ!!!ДОБАВЛЮ ВСЕХ!!!ДОБАВЛЮ ВСЕХ!!!ДОБАВЛЮ ВСЕХ!!!ДОБАВЛЮ ВСЕХ!!!ДОБАВЛЮ ВСЕХ!!!ДОБАВЛЮ ВСЕХ!!!ДОБАВЛЮ ВСЕХ!!!ДОБАВЛЮ ВСЕХ!!!ДОБАВЛЮ ВСЕХ!!!ДОБАВЛЮ ВСЕХ!!!ДОБАВЛЮ ВСЕХ!!!ДОБАВЛЮ ВСЕХ!!!ДОБАВЛЮ ВСЕХ!!!ДОБАВЛЮ ВСЕХ!!!ДОБАВЛЮ ВСЕХ!!!ДОБАВЛЮ ВСЕХ!!!ДОБАВЛЮ ВСЕХ!!!ДОБАВЛЮ ВСЕХ!!!ДОБАВЛЮ ВСЕХ!!!ДОБАВЛЮ ВСЕХ!!!ДОБАВЛЮ ВСЕХ!!!ДОБАВЛЮ ВСЕХ!!!ДОБАВЛЮ ВСЕХ!!!ДОБАВЛЮ ВСЕХ!!!ДОБАВЛЮ ВСЕХ!!!ДОБАВЛЮ ВСЕХ!!!']

var GrabSources = [
    'mdk', 'comic4fun', 'w.like', 'humour.page', 'smsin', 'ilikes', 'oroom', 'smeyaka', 'crazy.funn'
]

function inviteFriends( login, password ) {
    bot( login, password )
        .chat( 10000 )
        .acceptFriends( { delay: 1000 }, 5000 )
        .postToGroups( { groups: Groups, messages: Messages, delay: 3000 }, 12000 )
}

// ** Launch
module.exports.launch = function( port ) {
    var server = app.listen( port,
        function() {
            var host = server.address().address
            var port = server.address().port
            console.log( 'Example app listening at http://%s:%s', host, port )
        /*
            bot( '274762042', '+380982694352', 'TyQNKs7rhZ' )
                .acceptFriends( { delay: 1000 }, 5000 )
                .chat( 10000 )
            //    .likes( { delay: 3000, users: 1, likes: 10 }, 30000 )
                .postToGroups( { groups: Groups, messages: Messages, delay: 6000 }, 12000 )
        */
        /*
            bot( '274762042', '+380982694352', 'TyQNKs7rhZ' )
                .acceptFriends( { delay: 1000 }, 5000 )
            //    .chat( 10000 )
                .likes( { delay: 2000, users: 1, likes: 3 }, 30000 )
            //    .postToGroups( { groups: Groups, messages: Messages, delay: 6000 }, 12000 )
        */
        /*
            bot( '274762042', '+380982694352', 'TyQNKs7rhZ' )
            //    .farmOlike( { delay: 1000 }, 5000 )
                .chat( 10000 )
                .acceptFriends( { delay: 1000 }, 5000 )
                .postToGroups( { groups: Groups, messages: Messages, delay: 3000 }, 12000 )
        /**/
    //    inviteFriends( '+380982676357', 'edsXF8oPeB' )
//*

            var accounts = [
                { id: '274762042', login: '+380982694352', password: 'TyQNKs7rhZ'   },
                { id: '255923482', login: '+380977052521', password: 'yjdbrjdf'     },
                { id: '274757084', login: '+380982694058', password: 'yjdbrjd'      },
                { id: '274767556', login: '+380982676357', password: 'edsXF8oPeB'   },
                { id: '274764868', login: '+380982694280', password: 'k6Wu1gYeXW'   }
            ]

            accounts.forEach(
                function( account ) {
                    bot( account.id, account.login, account.password )
                        .acceptFriends( { delay: 1000 }, 5000 )
                        .farmOlike( { delay: 5000 }, 5000 )
                } )

//            bot( '274762042', '+380982694352', 'TyQNKs7rhZ' )
//                .acceptFriends( { delay: 1000 }, 5000 )
//                .farmOlike( { delay: 1000 }, 5000 )
            //    .grab( { sources: GrabSources, postsPerSource: 20, maxResults: maxPosts, postDelay: postTime * 60 * 1000, timeSlice: waitTime }, waitTime * 60 * 1000 )
/**/
/*
            var postTime = 4   // 4 minutes
            var waitTime = 59  // 60 minutes
            var maxPosts = Math.floor( waitTime / postTime )
//*
        //    bot( '274762042', '+380982694352', 'TyQNKs7rhZ',
            bot( '274767556', '+380982676357', 'edsXF8oPeB',
                function( bot ) {
                    agregate.start( bot, 'club81932298', '10:00 am', '23:00 pm', { sources: GrabSources, postsPerSource: 20, maxPosts: maxPosts, postTime: postTime, timeSlice: waitTime }  )
                } )
/**/
        } )
}
