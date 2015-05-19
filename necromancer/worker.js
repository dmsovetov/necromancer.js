var async = require( 'async' )

// ** create
module.exports.create = function( fetch, delay )
{
    var result = { queue: null }

    // ** start
    result.start = function() {
        result.queue.resume()
    }

    // ** stop
    result.stop = function() {
        result.queue.pause()
    }

    // ** load
    result.load = function() {
        fetch( result )
    }

    // ** push
    result.push = function( task, success, error ) {
        result.pushWithCallback( task,
            function( err ) {
                if( err ) return error ? console.log( error.red, err ) : null
                return success ? console.log( success ) : null
            } )
    }

    // ** pushWithCallback
    result.pushWithCallback = function( task, callback ) {
        result.queue.push( task, callback )
    }

    // ** Create queue
    result.queue = async.queue(
        function( task, callback ) {
            task( callback )
        }, 1 )

    result.queue.drain = function() {
        setTimeout(
            function() {
                result.load()
            }, delay )
    }

    // ** Preload worker
    result.stop()
    result.load()

    return result
}