var later    = require( 'later' )
  , schedule = later.parse.text
  , async    = require( 'async' )

// ** start
module.exports.start = function( bot, target, startTime, stopTime, params ) {
    console.log( 'Will start at ' + startTime + ' and stop at ' + stopTime )

    // ** Posts
    var posts       = []
    var counter     = 0
    var sourceStats = {}

    var postInterval  = null
    var parseInterval = null

    var startSchedule = schedule( 'at ' + startTime )
    var stopSchedule  = schedule( 'at ' + stopTime  )
    var parseSchedule = schedule( 'every ' + params.timeSlice + ' mins' )
    var postSchedule  = schedule( 'every ' + params.postTime  + ' mins' /*'every 10 seconds'*/ )


    // ** Use local time
    later.date.localTime()

    // ** Schedule start/stop agregation
    later.setInterval( start, startSchedule )
    later.setInterval( stop,  stopSchedule  )

    // ** Launch the agregation
    if( later.schedule( startSchedule ).next().getTime() > later.schedule( stopSchedule ).next().getTime() ) {
        start()
    }

    // ** start
    function start() {
        console.log( 'Starting agregation...' )

        // ** Analyze sources
        async.mapSeries( params.sources,
            function( source, callback ) {
                async.retry( 5, function( callback, result ) { analyzeSource( source, callback ) }, callback )
            },
            function( err, result ) {
                if( err ) return console.log( 'Failed to analyze sources', err )

                // ** Parse group info
                async.mapSeries( params.sources,
                    function( source, callback ) {
                        async.retry( 5, function( callback, result ) { parseSourceInfo( source, callback ) }, callback )
                    },
                    function( err, result ) {
                        if( err ) return console.log( 'Failed to load source info', err )

                        // ** Clear saved photos
                        bot.user.clearSavedPhotos(
                            function( err, result ) {
                                agregate()
                            } )
                    } )
            } )
    }

    // ** parseSourceInfo
    function parseSourceInfo( source, callback ) {
        console.log( 'Loading info', source )

        // ** Parse group stats
        bot.parser.group( source,
            function( err, result ) {
                if( err ) return callback( err )

                sourceStats[source].members = result.members_count
                callback( err, result )
            } )
    }

    // ** analyzeSource
    function analyzeSource( source, callback ) {
        console.log( 'Analyzing', source )

        // ** Parse wall posts
        bot.parser.wall( source, 100,
            function( err, result ) {
                if( err ) return callback( err )

                var likes   = { avgr: 0, avg: 0, min: 0, max: 0 }
                var reposts = { avgr: 0, avg: 0, min: 0, max: 0 }

                for( var i = 50; i < result.length; i++ ) {
                    likes.avg    += result[i].likes
                    likes.min     = Math.min( result[i].likes, likes.min )
                    likes.max     = Math.max( result[i].likes, likes.max )

                    reposts.avg  += result[i].reposts
                    reposts.min   = Math.min( result[i].reposts, reposts.min )
                    reposts.max   = Math.max( result[i].reposts, reposts.max )
                }

                var count     = (result.length - 50)
                likes.avg    /= count
                reposts.avg  /= count

                sourceStats[source] = { likes: likes, reposts: reposts, latest: 0 }
                callback( err, result )
            } )
    }

    // ** stop
    function stop() {
        parseInterval.clear()
        postInterval.clear()

        parseInterval = null
        postInterval  = null

        console.log( 'Agregation stopped' )
    }

    // ** agregate
    function agregate() {
        if( parseInterval || postInterval ) return console.log( 'Agregation is already started' )

        console.log( 'Will parse sources every ' + params.timeSlice + ' mins and repost every ' + params.postTime + ' mins' )
        console.log( 'Will agregate up to', params.maxPosts, 'posts' )
        console.log( 'Will do a next parse on', later.schedule( parseSchedule ).next() )

        // ** Set parse interval
        parseInterval = later.setInterval( parseSources, parseSchedule )

        // ** Set repost interval
        postInterval = later.setInterval(
            function() {
                if( posts.length == 0 ) {
                    return console.log( 'Noting to repost' )
                }

                repost( posts.shift() )
            }, postSchedule )
    }

    // ** parseSources
    function parseSources() {
        console.log( 'Parsing sources...' )

        // ** Grab all sources
        async.mapSeries( params.sources,
            function( source, callback ) {
                async.retry( 5, function( callback, result ) { loadSource( source, callback ) }, callback )
            },
            function( err, result ) {
                if( err ) return console.log( 'Failed to parse sources', err )

                // ** Flatten results
                result = result.reduce( function( a, b ) { return a.concat( b ) }, [] )

                // ** Sort & reduce results
                var filtered = result.filter( function( item ) { return item.lifetime <= params.timeSlice } )
                filtered.sort( sortByLikes )
                filtered.length = Math.min( filtered.length, params.maxPosts )

                // ** Sort by lifetime
                filtered.sort( sortByLifetime )

                // ** Save the latest source timestamp
                result.forEach(
                    function( item ) {
                        if( item.likes < sourceStats[item.source].likes.avg ) {
                            return
                        }

                        sourceStats[item.source].latest = Math.max( item.date, sourceStats[item.source].latest )
                    } )

                // ** Push a repost task
                for( var i = 0; i < filtered.length; i++ ) {
                    posts.push( filtered[i] )
                }

                console.log( 'Parsed sources,', posts.length, 'items in queue' )
            } )
    }

    // ** loadSource
    function loadSource( source, callback ) {
        console.log( 'Parsing', source + '...' )
        bot.parser.wall( source, params.postsPerSource, callback )
    }

    // ** repost
    function repost( item ) {
        var images = []

        // ** Process post attachments
        async.mapSeries( item.attachments,
            function( attach, callback ) {
                if( !attach.photo ) return callback()

                // ** Save  attached photo to album
                bot.parser.savePhotoUrl( 'photo' + attach.photo.owner_id + '_' + attach.photo.id,
                    function( err, result ) {
                        // ** Save photo
                        bot.user.action( result[0], callback )
                    } )
            },
            function( err, result ) {
                // ** Load saved photos
                bot.parser.savedPhotos( bot.id,
                    function( err, result ) {
                        if( err ) return console.log( 'Failed to repost', err )

                        var params = { text: 'http://vk.com/' + item.url + '\n\n' + item.text, photo: [], fromGroup: 1 }

                        for( var i = 0; i < result.length; i++ ) {
                            params.photo.push( result[i].replace( '/photo', '' ) )
                        }

                        // ** Do actual post
                        bot.user.postToGroup( target, params,
                            function( err, result ) {
                                // ** Save the post date
                                sourceStats[item.source].latest = Math.max( sourceStats[item.source].latest, item.date )

                                // ** Clear saved photos
                                bot.user.clearSavedPhotos(
                                    function( err, result ) {
                                        console.log( 'Item reposted.', posts.length, 'left in queue' )
                                    } )
                            } )
                    } )
            } )
    }

    // ** sortByLikes
    function sortByLikes( a, b ) {
        a.lrpm = (a.likeRatio / sourceStats[a.source].members) * 1000
        b.lrpm = (b.likeRatio / sourceStats[b.source].members) * 1000

        if( a.lrpm > b.lrpm ) return -1
        if( a.lrpm < b.lrpm ) return  1

        return 0
    }

    // ** sortByLifetime
    function sortByLifetime( a, b ) {
        if( a.lifetime > b.lifetime ) return -1
        if( a.lifetime < b.lifetime ) return  1

        return 0
    }
}