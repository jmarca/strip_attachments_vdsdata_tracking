strip_attachments_vdsdata_tracking
==================================

Strip attachments from a couchdb database, say because you just
decided to use pouchdb and replicate it to the browser but the
attachments add too much bloat

Yeah, you heard that right.  Same old same old.  Fix bad decisions
from the past.

# Configuration

Before jumping into the programs, a word about how to configure
things. Configuration is handled by config.json and my `config_okay`
library. That means that I require that "config.json" is chmod 0700,
or in other words, visible only to the user, not to group or world.
It contains passwords, so it should be kept secret.


An example from my setup (with the usernames and passwords changed,
obviously):

```JSON
{
    "fat": {
        "url": "http://192.168.0.1",
        "port":5984,
        "auth":{"username":"james",
                "password":"correct horse battery staple"
               },
        "since":0,
        "db":"vdsdata%2ftracking"
    },
    "skim": {
        "url": "http://127.0.0.1",
        "port":5984,
        "auth":{"username":"james",
                "password":"correct horse battery staple"
               },
        "db":"vdsdata%2fskimmed"
    }
}
```

Note that the "since" field in the "fat" part of the config file
defines the starting point for the changes listener.

Also, to run this, you have to have a redis server running, and
couchdb, of course.  So far I don't have any way to change the details
of the redis db, but maybe I'll change that when I switch to using
this on multiple machines.


# `feeder.js`

The file `feeder.js` sets up a job to populate the queue of tasks.  It
uses `Follow` from Iris Couch to follow changes on a CouchDB database.
The idea is that the "fat" database is followed, and any changes to it
can be mirrored to the "skim" database.  At the start, it just begins
at the zeroth change, and progresses through the db.  When it has hit
all the docs (is at the last change id), then it will just start
listening to the latest changes, and make sure that the skim database
is in sync with the fat one.

Run the follower by typing

```
node lib/feeder.js
```

Initialization settings are controlled by the `config.json` file, as
explained above.

Each changed doc is stored in redis using kue.

# `stripper.js`

This file strips off the attachments from each document in the "fat"
database and saves the new documents to the "skim" database.

Configuration is handled by the "config.json" file as noted above.


The number of jobs used to process the tasks loaded in the kue
database is set automatically to be the number of CPUs on your
machine. If you want fewer jobs, then change that in the code.  It
might also make sense to have an override in the config file, I guess.

Anyway, the stripper loads each job, fetches the associated doc from
the fat database, strips off the attachments, and then writes it to
the skim database.  I considered using bulk_docs, but that got
complicated.  Much simpler code to just handle one doc at a time, and
it runs reasonably quickly as the big binary attachments aren't going
anywhere ever.

The new docs do not have attachments, but those attachments are still
tracked using a new "detached" field in the document, as well as
having an "attachment_db" field that tells you where to find those
binary document attachments.  Theoretically (I haven't tried it) you
can get a doc from the skim database, and then download the
attachments from the fat database using this information.
