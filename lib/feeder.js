/*global require console __dirname */
var follow = require('follow')
var _ = require('lodash')
var async = require('async')
var url = require('url')
var kue = require('kue')
var jobs_queue = kue.createQueue()
var path = require('path')
var rootdir = path.normalize(__dirname)

var config_okay = require('./config_okay')

function setup_feed(task,cb){

    task.db = task.fat.url+':'+task.fat.port+'/'+task.fat.db

    var feed = new follow.Feed(task);
    // You can also set values directly.
    feed.since         = task.fat.since || 0
    feed.heartbeat     = 30    * 1000
    feed.inactivity_ms = 86400 * 1000;
    feed.query_params = {'include_docs':true}

    feed.on('change', function(change) {
            jobs_queue.create('couchdb doc',change).save()
        return null
    })

    feed.on('error', function(er) {
        console.error('Since Follow always retries on errors, this must be serious');
        throw er;
        return null
    })

    task.feed=feed
    cb(null,task)

}

var config_file = rootdir+'/../'+'config.json'

config_okay(config_file,function(err,task){
    setup_feed(task,function(e,task2){
        // ready to go
        if(e){
            throw new Error(e)
        }
        task2.feed.follow();
        console.log('following the couchdb changes feed')
        return null
    })
    return null
})
