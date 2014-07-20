var commander = require('commander');
var htmlFactory = require('./htmlFactory');

commander.version('0.0.1')
  .option('-c --comment [comment Msg]', 'Add comment')
  .option('-f --folder [folderId]', 'Get links form GDrive folder')
  .parse(process.argv);

var comment = commander.comment;
var filenames = commander.args;

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

var pipeline = function (comment, filename, folderId, next) {

  var res = filename.match(/([^\/\\]+)\.\w*/);
  if (!res) {
    next('Invalid filename'); 
    return;
  } 
  var basename = res[1];
  var html = htmlFactory.generateHTML(comment, filename);

  async.waterfall([

    // Get client
    function (cb) {

      googleapis.discover('drive', 'v2').execute(cb);

    },

    // Upload
    function (client, cb) {
      
      console.log('Uploading ' + filename);
      client.drive.files.insert({
        title: basename+'.html',
        mimeType: 'text/html',
        convert: true 
      })
      .withMedia('text/html', html)
      .withAuthClient(auth)
      .execute(function (err, fileResponse) {

        if (err) {
          cb(err);
          return; 
        }

        cb(null, client, fileResponse);
      
      });
    
    },

    // Rename & Move to new folder
    function (client, fileResponse, cb) {

      var fileId = fileResponse.id;
      var originalFolderId = fileResponse.parents[0].id;
      var ops = {
        fileId: fileId 
      };

      console.log('Rename file as ' + basename);

      if (folderId) {

        console.log('Move file from ' + originalFolderId + ' to folder ' + folderId);
        ops.addParents = folderId;
        ops.removeParents = originalFolderId;
      
      }

      client.drive.files.patch(ops, {
        title: basename 
      }).withAuthClient(auth)
      .execute(function (err, fileResponse) {

        cb(err, fileResponse);
      
      });
      
    },

    // Get link
    function (fileResponse, cb) {

      var link = fileResponse.alternateLink;
      cb(null, link);
    
    }
  
  ], function (err, link) {

    var realLink = link.replace(/\?usp.*/, '');
    next(null, {
      title: basename,
      link: realLink 
    });
  
  });

};

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

  // For everyone
  function (cb) {

    var results = [];
    async.eachSeries(filenames, function (filename, next) {

      pipeline(comment, filename, folderId, function (err, result) {

        if (err) {
          next(err);
          return; 
        }

        results.push(result);
        next();
      
      });
    
    }, function (err) {

      if (err) {
        cb(err); 
        return;
      }    

      cb(null, results);

    });
  
  },

], function (err, results) {

  if (err) {

    console.log('Error:'+JSON.stringify(err));
  
  } else {

    var output = results.map(function (item) {
      var link = item.link;
      var title = item.title; 

      return (title + ',' + link);

    });

    console.log(output.join('\n'));
  
  }

});
