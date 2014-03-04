var follow = require('follow')
var _ = require('lodash')
var url = require('url')


var opts = {}; // Same options paramters as before
var feed = new follow.Feed(opts);

var skim = url.parse(opts.skim || opts.db).href
skim = skim.replace(/\/+$/, '')

// You can also set values directly.
feed.db            = "http://127.0.0.1:5984/vdsdata%2ftracking";
feed.since         = 991647;
feed.heartbeat     = 30    * 1000
feed.inactivity_ms = 86400 * 1000;

// feed.filter = function(doc, req) {
//   // req.query is the parameters from the _changes request and also feed.query_params.
//   if(doc._attachments.length===0)
//     return false;
//   return true;
// }

feed.on('change', function(change) {
    console.log('Doc ' + change.id + ' in change ' + change.seq );
    var newdoc = _.clone(change.doc)    console.log(change.doc)
    newdoc._detachments = newdoc._attachments
    newdoc._attachments = {}

})

feed.on('error', function(er) {
  console.error('Since Follow always retries on errors, this must be serious');
  throw er;
})

feed.follow();
