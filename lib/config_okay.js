/*global require module */
var fs = require('fs')
var should = require('should')
var config_okay = function(f,cb){
    if(!cb && typeof f === 'function'){
        cb = f
        f='config.json'
    }
    if(!f){
        f='config.json'
    }
    fs.stat(f,function(err,stats){
        //should.not.exist(err)
        //
        //should.exist(stats)
        if(err) return cb(err)
        if(!stats) return cb('no stats')
        if(stats.mode.toString(8) != '100600'){
            throw new Error('mode of '+f+' must be 0600')
        }
        var config = require(f)
        return cb(null,config)
    })
    return null
}

module.exports=config_okay
