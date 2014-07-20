var commander = require('commander');

commander.version('0.0.1')
  .option('-c --comment [comment Msg]', 'Add comment')
  .option('-f --folder [folderId]', 'Get links form GDrive folder')
  .option('-g --generate', 'Generate HTML files')
  .parse(process.argv);

var generate = commander.generate;

if (generate) {

  var comment = commander.comment;
  var filenames = commander.args;
  var htmlFactory = require('./htmlFactory');

  for (var i in filenames) {

    var filename = filenames[i];
    htmlFactory.generateHTML(comment, filename);
  
  }

} else {

  var folderId = commander.folder;
  var fs = require('fs');
  var async = require('async');
  var readline = require('readline');
  var credFile = './cred.json';
  var credential = require(credFile);
  var googleapis = require('googleapis');

  var CLIENT_ID = credential.installed.client_id;
  var CLIENT_SECRET = credential.installed.client_secret;
  var REDIRECT_URL = credential.installed.redirect_uris[0];
  var SCOPE = 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/drive.file';

  var auth = new googleapis.OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URL);

  async.waterfall([

    // Ask for Code
    function (cb) {

      if (credential.tokens) {

        cb(null, credential.tokens);
        return;
      
      }

      var url = auth.generateAuthUrl({
        access_type: 'offline', // will return a refresh token
        scope: SCOPE
      });

      var rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      rl.question('Please Visit: ' + url, function (code) {

        auth.getToken(code, function(err, tokens) {
          
          cb(err, tokens);

        });
      
      });

    },

    // Update the tokens
    function (tokens, cb) {

      auth.setCredentials(tokens);
      credential.tokens = tokens;
      fs.writeFile(credFile, JSON.stringify(credential), cb);
    
    },

    // Get client
    function (cb) {

      googleapis.discover('drive', 'v2').execute(cb);
  
    },

    // List All Documents
    function (client, cb) {

      client.drive.children
        .list({
          folderId: folderId,
          q: "mimeType contains 'document'"
        })
        .withAuthClient(auth)
        .execute(function (err, listResult) {

          if (err) {
            cb(err); 
            return;
          }

          var items = listResult.items;
          var ids = items.map(function (item) {
            return item.id; 
          });

          cb(null, client, ids);

        });

    },

    // Get alternative links
    function (client, ids, cb) {

      //TODO
      console.log(ids);
      cb();
    
    }
     
  ], function (err) {

    if (err) {

      console.log('Error:'+JSON.stringify(err));
    
    }

  });

}
