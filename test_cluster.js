var kue = require('kue')
  , cluster = require('cluster')
  , jobs = kue.createQueue();

var numCPUs = require('os').cpus().length;


if (cluster.isMaster) {
    var redis = kue.redis.createClient()

    for (var i = 0; i < numCPUs; i++) {
        cluster.fork();
    }
    function create2() {
        var name = ['tobi', 'loki', 'jane', 'manny'][Math.random() * 4 | 0];
        var job = jobs.create('email', {
            title: 'emailing ' + name + '', body: 'hello'
        }).expire(10).save();

        setTimeout(create2, Math.random() * 1000 | 0);
    }

    create2();
    jobs.on('job complete', function(id){
        kue.Job.get(id, function(err, job){
            if (err) return;
            job.remove(function(err){
                if (err) throw err;
                console.log('removed completed job #%d', job.id);
            });
        });
    });

} else {
  // jobs.process('email', function(job, done){
  //   var pending = 5
  //     , total = pending;

  //   var interval = setInterval(function(){
  //     job.log('sending!');
  //     job.progress(total - pending, total);
  //     --pending || done();
  //     pending || clearInterval(interval);
  //   }, 10);
  // });
}