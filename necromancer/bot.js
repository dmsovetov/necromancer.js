var Vk      = require( './vk' )
  , worker  = require( './worker' )
  , chat    = require( './chat' )
  , olike   = require( './olike' )
  , format  = require( 'util' ).format
  , async   = require( 'async' )

/*

olike

LOGIN:
    1.  POST:       http://olike.ru/profiles.php?login=vkk [vkk=page]
    2.  SETCOOKIE:  vklink=http//vk.com/id274762042

LIKE:
    1.	GET:		http://olike.ru/ajax.php?func=gettask&type=vk-likes
        RESPONSE:	{"status":"ok", "id":"10315756", "type":"101", "url_id":"9365238", "url":"photo-52569849_342316434", "google":"", "bonus":"1", "res":"", "res_int":"0", "token":""}
    2.	LIKE
    3.	GET:		http://olike.ru/ajax.php?func=checkAction&id=[....]
        RESPONSE:	balance

*/

// ** create
function create( id, login, email, callback )
{
    var bot = { id: id, user: null, parser: null, workers: [], messages: 0 }

    // ** acceptFriends
    bot.acceptFriends = function( params, delay ) {
        console.log( login, 'will accept incoming friend requests' )

        startWorker(
            function( queue ) {
                queue.push( taskLoadFriendRequests( queue, params.delay ), null, 'Failed to load incomming friend requests' )
            }, delay )

        return bot
    }

    // ** postToGroups
    bot.postToGroups = function( params, delay ) {
        console.log( login, 'will post to groups' )

        startWorker(
            function( queue ) {
                // ** For each group in list
                params.groups.forEach(
                    function( group ) {
                        // ** Push task for this group
                        queue.push( taskPostToGroup( group, random( params.messages ), params.delay ), ('Posted to ' + group + ' (' + login + ')').white, 'Failed to post to ' + group )
                    } )
            }, delay )

        return bot
    }

    // ** chat
    bot.chat = function( delay ) {
        console.log( login, 'will chat' )

        startWorker(
            function( queue ) {
                queue.push( taskLoadInbox( queue ), null, 'Failed to load inbox' )
            }, delay )

        return bot
    }

    // ** likes
    bot.likes = function( params, delay ) {
        console.log( login, 'will like posts' )
        bot.tasks.push( { worker: workerLikes( params.delay, params.users, params.likes ), delay: delay } )

        return bot
    }

    // ** farmOlike
    bot.farmOlike = function( params, delay ) {
        console.log( login, 'will do OLike tasks' )

        startWorker(
            function( queue ) {
                queue.push( taskOLike( queue, params.delay ), null, 'OLike failed' )
            }, delay )

        return bot
    }

    // ** start
    bot.start = function() {
        console.log( 'Starting bot', login, 'with', bot.workers.length, 'tasks' )

        bot.workers.forEach(
            function( worker ) {
                worker.start()
            } )
    }

    // ** stop
    bot.stop = function() {
        console.log( 'Stopping bot', login )

        bot.workers.forEach(
            function( worker ) {
                worker.stop()
            } )
    }

    // ** doAction
    function doAction( queue, action, user ) {
        if( !action ) {
            return
        }

        var messageBefore   = 'секунду =)'
        var messageJoin     = 'теперь я в группе, щас будут лайки!'
        var messageEnd      = 'готово! помоги и мне пожалуйста - вступай сюда =) https://vk.com/lolhub_io'
        var messageError    = 'мм, что-то не открывается :('

        var readTime        = 5000
        var typeTime        = 6000
        var likeGroupCount  = 10
        var likeUserCount   = 20
        var likeDelay       = 2000

        console.log( 'Chat action', action.action, user, action.url )

        // ** Push welcome message
        queue.push( taskSendMessage( user, messageBefore ) )

        // ** Push actual task
        switch( action.action ) {
        case 'join':        queue.pushWithCallback( taskJoinTo( action.url ),
                                function( err ) {
                                    if( err ) return queue.push( taskSendMessage( user, messageError ) )

                                    // ** Send joined message
                                    queue.push( taskSendMessage( user, messageJoin ) )

                                    // ** Push likes
                                    queue.pushWithCallback( taskLikeObjects( queue, action.url, likeDelay, likeGroupCount ),
                                        function( err ) {
                                            queue.push( taskSendMessage( user, messageEnd ) )
                                        } )
                                } )
                            break

        case 'likeUserAv':  // ** Push likes
                            queue.push( taskLikeUserAvatars( queue, user, likeDelay ) )

                            // ** Push response
                            queue.push( taskSendMessage( user, messageEnd ) )
                            break

        case 'likeWall':    // ** Push likes
                            queue.push( taskLikeObjects( queue, action.url, likeDelay, likeUserCount ) )

                            // ** Push response
                            queue.push( taskSendMessage( user, messageEnd ) )
                            break
        }
    }

    // ** random
    function random( items ) {
        return items[Math.floor( Math.random() * items.length )]
    }

    // ** workerLikes
    function workerLikes( delay, users, likes ) {
        return function( callback ) {
            console.log( 'Liking random posts...' )

            // ** Load random online users
            bot.user.getRandomFriendsOnline( users,
                function( err, result ) {
                    if( err ) {
                        console.log( ('Failed to load random users online').red )
                        return callback( err )
                    }

                    // ** For each loaded user
                    result.forEach(
                        function( user ) {


                            // ** Load user avatars
                            bot.user.getUserAvatars( user,
                                function( err, result ) {
                                    console.log( 'Liking user', user, 'avatars...', result.length, 'total' )

                                    task.process( result, delay,
                                        function( item ) {
                                            bot.user.like( item )
                                        },
                                        callback )
                                } )
                        /*
                            // ** Load random posts from user wall
                            bot.user.getRandomPosts( user, 'like', likes,
                                function( err, posts ) {+
                                    if( err ) {
                                        console.log( ('Failed to like random posts at ' + target).red )
                                        return callback( err )
                                    }

                                    console.log( 'Liking user', user, 'wall (', posts.length, 'posts)' )

                                    // ** Like posts
                                    likePosts( posts, delay, callback )
                                } )
                        */
                        } )
                } )
        }
    }

    // ** startWorker
    function startWorker( queueCallback, delay ) {
        bot.workers.push( worker.create( queueCallback, delay ) )
    }

    // ** taskLoadFriendRequests
    function taskLoadFriendRequests( queue, delay ) {
        return function( callback ) {
            // ** Parse friend requests
            bot.user.getFriendRequests(
                function( err, items ) {
                    if( err ) return callback( err )

                    // ** For each request add a task
                    items.forEach(
                        function( request ) {
                            queue.push( taskAcceptFriend( request, delay ), ('Friend request accepted (' + login + ')').yellow, 'Failed to accept incoming friend request' )
                        } )

                    // ** Run a callback
                    callback()
                } )
        }
    }

    // ** taskLikeUserAvatars
    function taskLikeUserAvatars( queue, user, delay ) {
        return function( callback ) {
            // ** Parse user avatars
            bot.user.getUserAvatars( user,
                function( err, items ) {
                    var tasks = []

                    // ** For each user photo queue a like task
                    items.forEach(
                        function( item ) {
                            tasks.push( taskLikeObjects( queue, item, delay, 1 ) )
                        } )

                    // ** Run all tasks
                    async.series( tasks, callback )
                } )
        }
    }

    // ** taskLikeObjects
    function taskLikeObjects( queue, url, delay, count ) {
        return function( callback ) {
            bot.user.getPosts( url, 'like', count,
                function( err, items ) {
                    if( err ) return callback( err )

                    // ** For each loaded post add a like task
                    var tasks = []

                    items.forEach(
                        function( item ) {
                            tasks.push( taskLike( item, delay ) )
                        } )

                    // ** Run all tasks
                    async.series( tasks, callback )
                } )
        }
    }

    // taskLike
    function taskLike( url, delay ) {
        return function( callback ) {
            setTimeout(
                function() {
                    bot.user.action( url, callback )
                }, delay )
        }
    }

    // ** taskSendMessage
    function taskSendMessage( user, message, delay ) {
        return function( callback ) {
            setTimeout(
                function() {
                    bot.user.sendMessage( user, message,
                        function() {
                            console.log( 'Message sent', message )
                            callback()
                        } )
                }, delay )
        }
    }

    // ** taskJoinTo
    function taskJoinTo( group ) {
        return function( callback ) {
            bot.user.joinTo( group, callback )
        }
    }

    // ** taskLoadInbox
    function taskLoadInbox( queue ) {
        return function( callback ) {
            console.log( 'Checking inbox' )
            // ** Parse inbox
            bot.user.loadUnread(
                function( err, items ) {
                    if( err ) return callback( err )

                    // ** For each unread message
                    items.forEach(
                        function( item ) {
                            // ** Read the message
                            bot.user.readInbox( item.user,
                                function( err, result ) {
                                    var message = result ? result[0] : null

                                    if( message ) {
                                        doAction( queue, chat.parse( item.user, message ), item.user )
                                    }
                                } )
                        } )

                    callback()
                } )
        }
    }

    // ** taskAcceptFriend
    function taskAcceptFriend( request, delay ) {
        return function( callback ) {
            setTimeout(
                function() {
                    bot.user.action( request, callback )
                }, delay )
        }
    }

    // ** taskPostToGroup
    function taskPostToGroup( group, message, delay ) {
        return function( callback ) {
            setTimeout(
                function() {
                    bot.user.postToGroup( group, { text: message }, callback )
                }, delay )
        }
    }

    // ** taskOLikeCheck
    function taskOLikeCheck( id ) {
        return function( callback ) {
            if( !bot.olike ) return callback( 'Waiting for OLike authorization...' )

            bot.olike.check( id,
                function( err, result ) {
                    if( err ) return callback( err )
                    bot.olike.farmed = result
                    callback()
                } )
        }
    }

    // ** taskOLike
    function taskOLike( queue, delay ) {
        return function( callback ) {
            if( !bot.olike ) return callback( 'Waiting for OLike authorization...' )

            setTimeout(
                function() {
                    bot.olike.getLike(
                        function( err, result ) {
                            if( err ) console.log( err )
                            if( err ) return callback( err )

                            queue.push( taskLikeObjects( queue, result.url, 0, 1 ) )
                            queue.push( taskOLikeCheck( result.id ), (login + ' OLike task ' + bot.olike.farmed + ' farmed').cyan, 'OLike task ' + result.id + ' failed' )
                            callback()
                        } )
                }, delay )
        }
    }

    // ** Authorize bot
    Vk.auth( id, login, email,
        function( user, parser ) {
            bot.user    = user
            bot.parser  = parser
            bot.start()

            if( callback ) {
                callback( bot )
            }

            olike.create( 'http://vk.com/id' + id, function( result ) { bot.olike = result } )
        /*
            // ** Test chat
            var messages = [
                'Здравствуйте, вступайте в группу http://vk.com/club76957224\nЕсли вам понравились стихи, пишите комментарии, ставте лайки\nобсуждайте группу, стихи\nС уважением Андрей.\nОтвечайте на опрос в группе',
                'Привет , слушай если не затруднит подпишись пажалуйста , заранее спасибо vk.com/ivtvchannel',
                'Лайкни аву пж)Взаимно',
                'привет, лайкни пожалуйста первую запись на стене',
                'Привет,поставь лайки на фото,поставлю взамен!:)))',
                'Привет! Вступи в мою группу, пожалуйста, integrallab, в ответ помогу с твоей просьбой (вступлю, лайкну, проголосую)',
                'Привет Каролина) Поставил тебе лайки). Поставь лайки моим записям на стене, если не сложно Заранее спасибо . 😉 если нужно вступить в группу,присылай ссылку',
                'https://vk.com/public80706578 Вступаем ассортимент мобильных аксессуаров по низким ценам',
                'Здравствуйте!!! Поддержите группу, вступив http://vk.com/club66235314. Если не сложно расскажите друзьям о группе.',   // !! Dot at the end of URL
                'http://vk.com/clubmav вступи пожалуйста ))))))) буду очень благодарен',
                'проголосуйте пожалуйста. отвечу тем же\nДля того чтобы проголосовать за участника, необходимо пройти по ссылке и поставить "лайк" под фото: vk.cc/39WZO2',
                'Вступи пожалуйста в группу)\nhttps://vk.com/club64652829\nЕсли надо будет вступить в группу или лайкнуть что- то, то в долгу не останусь)))',
                'Привет )))) Вступите, пожалуйста , в группу, первая запись на моей стене )) Отвечу на любую Вашу просьбу :) Если вам это не интересно, прошу прощения, что отняла пару минут вашего времени. Удачного вам вечера ))) 😊',
                'Приветик! Каролина, а можно пригласить Вас в мою группу добра, смеха и вообще одного сплошного позитива? 😊 😊 😊',
                'лайкни аву (взаимно0',
                'Лайкни её аву плиз вот ссылкаhttp://m.vk.com/id276392603', // !! URL ignored
                'http://vk.com/love_sex_and_chemistry\nПривет вступай )))',
                'Если не трудно вступи пожалуйста сюда https://vk.com/public80019148 и лайкни записи, взаимен могу поставить лайки или вступить в твою группу.',
                'Поставь лайки на стену плиз взаимно)',
                'лайкни аву,пожалуйста))\nа я тебе ^.^',
                'Привет 😊✌ Оцени пожалуйста 20 мои записей на стене 🙏🙏🙏 Только не игнорь ❌ Для меня это важно ✅ За раннее огромное спасибо тебе 👏👍🎭',
            ]

            messages.forEach(
                function( item ) {
                    console.log( item )
                    doAction( chat.parse( '0000', item ) )
                    console.log( '------------------------------' )
                } )
        */
        } )

    return bot
}

// ** create
module.exports = create