/*global require console __dirname */
var follow = require('follow')
var _ = require('lodash')
var async = require('async')
var url = require('url')
var kue = require('kue')
var cluster = require('cluster')
var jobs_queue = kue.createQueue()
var path = require('path')
var rootdir = path.normalize(__dirname)



var config_okay = require('./config_okay')

function setup_queue(task,cb){
    // create our job queue

    var source_db = task.fat.url+':'+task.fat.port+'/'+task.fat.db
    var putter = require('couchdb_put_doc')({'cdb':task.skim.db
                                            ,'cuser':task.skim.auth.username
                                            ,'cpass':task.skim.auth.password
                                            ,'chost':task.skim.host
                                            ,'cport':task.skim.port})

    putter.overwrite(true)

    jobs_queue.process('couchdb doc',1,function(job,done){
        var doc = job.data.doc
        console.log(job.data.seq)
        doc.detached = doc._attachments || {}
        doc.attachment_db = source_db
        doc._attachments = {}

        putter(doc,function(e,r,b){
            console.log(job.data.id)
            console.log(e)
            console.log(r)
            console.log(b)
            done()
        })
        return null
    })

    cb(null,task)

}

function setup_feed(task,cb){
    task.db = task.fat.url+':'+task.fat.port+'/'+task.fat.db

    var feed = new follow.Feed(task);
    var q = task.jobs_queue
    // You can also set values directly.
    feed.since         = 0 //991647;
    feed.heartbeat     = 30    * 1000
    feed.inactivity_ms = 86400 * 1000;
    feed.query_params = {'include_docs':true}

    feed.on('change', function(change) {
        q.create('couchdb doc',change).save()
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

cluster = cluster()
     .set('workers', 5)
          .use(cluster.debug())
          .start();

if (cluster.isMaster) {

    config_okay(config_file,function(err,task){
        async.waterfall([function(cb){
                             return setup_queue(task,cb)
                         }
                        ],function(e,task2){
                              // ready to go
                              if(e){
                                  throw new Error(e)
                              }
                              kue.app.listen(3000)

                              console.log('kue ui started on port 3000')

                              task.feed.follow();
                              console.log('following the couchdb changes feed')
                              return null
                          })

        return null
    })

} else {
    config_okay(config_file,function(err,task){
        async.waterfall([function(cb){
                             return setup_queue(task,cb)
                         }
                        ],function(e,task2){
                              // ready to go
                              if(e){
                                  throw new Error(e)
                              }
                              return null
                          })

        return null
    })

}