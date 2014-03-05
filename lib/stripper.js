/*global require console __dirname */
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

    jobs_queue.on('job complete', function(id){
        kue.Job.get(id, function(err, job){
            if (err) return;
            job.remove(function(err){
                if (err){
                    console.log(err)
                }else{
                    console.log('removed completed job #%d', job.id);
                }
                return null
            });
        });
    });

    cb(null,task)

}


var config_file = rootdir+'/../'+'config.json'

if (cluster.isMaster) {
    var numCPUs = require('os').cpus().length;
    for (var i = 0; i < numCPUs; i++) {
        cluster.fork();
    }
} else {
    config_okay(config_file,function(err,task){
        setup_queue(task,function(e,task2){
            // ready to go
            if(e){
                throw new Error(e)
            }
            return null
        })

        return null
    })

}
