# CS3216 Assignment 1

## General
### Application Name- “Hush”
Hosted at http://hush.darora.com


Not all contributions have been put down here, for brevity’s sake, and not all can be tracked though GitHub. We’ve been using numerous services like Trello, Facebook, and [lots of] email to discuss & coordinate things.

Team members:
- Michael Yong A0082877M 
  - Development phase. Refer to github for exact contributions
  - Designing 
- Divyanshu Arora U096857U
  - Development phase. Refer to github for exact contributions
  - Server setup
- Omer Iqbal A0074933Y
  - Development phase. Refer to github for exact contributions
- Benjamin Xue A0073943Y
  - Design elements and user testings
- LZ A0070890A 
  - Idea generation and team coordination 



Changes to idea
Not too many.
We’ve sort-of given in to integrating Facebook JS into our code after encountering far too many UX problems & technical impossibilities with their server-side offerings.

## Server Admin, etc.

### Restarting Node

* ssh in as root
* `$ su - git` to switch to git user
* `$ tmux attach -t hush` to attach the tmux session that's running the node server
* Since you're already the git user, execute `$ ./update.sh` which does a bunch of things--
  * Reset hard to the HEAD
  * Pull in master from the barebones repository on the instance
  * Generate CSS afresh from the less
  * Restart node server & backgrounds it
* *IMPORTANT* To finish off, detach the tmux session so that the server keeps running after you logout. To do this, press the following key sequence- "C-b d"
  * "C-b d" means pressing 'Ctrl' and 'b' together, and then the 'd' key
* This will drop you back to the git user shell. Proceed to log out
* While you're in, you can also execute the various rake jobs if needed. Look at the `/srv/http/connections/Rakefile` for the list of available automations. Things like generating documentations from the source code etc can be done this way.


## Build Instructions.

### Dependencies
- nodejs
- mongodb
- redis

#### For search
- elasticsearch
  - Lucene
- mongodb-elasticsearch-river
  - mapper
- Bunch of configuration crap to get it all working.

TL;DR--It's a shit load of configuration to get all of it working. Just test your search code against the live server, imo. In routes/index.js, instead of connecting to 'localhost', connect to 'hush.darora.com' (port 9200). Ask Div to open the port if it isn't accessible. 

### Build
- `npm rebuild`
- have `mongodb` and `redis` running
- `node app.js` (pass --noredis flag to use connect session store instead)

#### Going after the low-hanging automations
- Make sure you've got `rake` installed (`gem install rake`)
- `$ rake` will
  - Generate CSS files for the less files listed in `Rakefile` (Useful only in production)
  - Restart node if necessary. i.e., start up node if not running, or kill it and start over if it is already running.
- `$ rake generate_docs` will generate documentation for the codebase. It generates an html page per source code file, under the `./docs/` directory, & maintains the dir structure of the source files.

Take note that this will kill _all_ instances of node. Just coz.


## Coding Convention
- 2 spaces
- `{key: value}`
  - Goes beyond just objects. For instance, `function myAwesomeFunctionz(param1, param2, param3)`
- multiple `var` instead of commas

## Stuff Used
### Backend
- Expressjs
- Mongoose
- Everyauth
- Jade
- Connect-Redis
- Underscore
- Async

### Frontend
- Less
- Requirejs
- Backbonejs
- Underscorejs
- jQuery