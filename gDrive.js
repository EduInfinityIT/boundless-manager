var async = require('async');
var fs = require('fs');
var readline = require('readline');
var googleapis = require('googleapis');

var SCOPE = 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/drive.file';
var OAuthClient;

var credential;
var CLIENT_ID;
var CLIENT_SECRET;
var REDIRECT_URL;
var isAuthed;

exports.auth = function (filename, done) {

  credential = require(filename);
  CLIENT_ID = credential.installed.client_id;
  CLIENT_SECRET = credential.installed.client_secret;
  REDIRECT_URL = credential.installed.redirect_uris[0];
  OAuthClient = new googleapis.OAuth2Client(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URL)

  async.waterfall([

    // Ask for Code
    function (cb) {

    if (credential.tokens) {

      cb(null, credential.tokens);
      return;

    }

    var url = OAuthClient.generateAuthUrl({
      access_type: 'offline', // will return a refresh token
      scope: SCOPE
    });

    var rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question('Please Visit:\n' + url + '\n And paste the result here:\n', function (code) {

      OAuthClient.getToken(code, function(err, tokens) {

	cb(err, tokens);

      });

    });

  },

  // Update the tokens
  function (tokens, cb) {

    OAuthClient.setCredentials(tokens);
    credential.tokens = tokens;
    fs.writeFile(filename, JSON.stringify(credential), cb);

  },

  ], function (err) {

    if (err) {

      return done(err);

    }

    isAuthed = true;
    done(null);

  });

};

exports.upload = function (title, file, folderId, done) {

  if (!isAuthed) {

    throw new Error('Googleapis: Unauthorized');

  }

  async.waterfall([

    // Get client
    function (cb) {

      googleapis.discover('drive', 'v2').execute(cb);

    },

    // Upload
    function (client, cb) {

      console.log('Uploading ' + title);
      client.drive.files.insert({
	title: title+'.html',
	mimeType: 'text/html',
	convert: true 
      })
      .withMedia('text/html', file)
      .withAuthClient(OAuthClient)
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

      console.log('Rename file as ' + title);

      if (folderId) {
	console.log('Move file from ' + originalFolderId + ' to folder ' + folderId);
	ops.addParents = folderId;
	ops.removeParents = originalFolderId;
      }

      client.drive.files.patch(ops, {
	title: title 
      }).withAuthClient(OAuthClient)
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
    done(null, realLink);

  });

};
