var fs = require('fs');
var commander = require('commander');
var async = require('async');
var srtParser = require('subtitles-parser');

commander.version('0.0.1')
  .option('-c --comment [comment Msg]', 'Add comment')
  .option('-f --folder [folderId]', 'Get links from GDrive folder')
  .parse(process.argv);

var comment = commander.comment;
var filenames = commander.args;
var folderId = commander.folder;

var htmlFactory = require('./htmlFactory');
var gDrive = require('./gDrive');

if (!folderId || !filenames) {

  commander.help();

}

async.waterfall([

  // Auth googleapis
  function (cb) {

    var credFile = './cred.json';
    gDrive.auth(credFile, cb);

  },

  // Parse file
  function (cb) {

    async.map(filenames, function (filename, next) {

      var res = filename.match(/([^\/\\]+)\.\w*/);
      if (!res) {
        return setImmediate(function () {
          next('Invalid filename'); 
        });
      } 
      var basename = res[1];

      var content = fs.readFileSync(filename);
      var srt = srtParser.fromSrt(content.toString());
      if (srt.length == 0) {
        return setImmediate(function () { 
          next('Invalid Srt File');
        });
      }

      var lastSrt = srt.slice(-1)[0];
      var duration = lastSrt.endTime.replace(/,.*/, '');
      var length = lastSrt.id;
      var html = htmlFactory.generateHTML(comment, srtParser.toSrt(srt));

      return setImmediate(function () {
        next(null, {
          title: basename,
          html: html,
          duration: duration,
          length: length 
        });
      });

    }, cb);

  },

  function (subtitles, cb) {

    async.map(subtitles, function (subtitle, next) {

      var html = subtitle.html;
      var title = subtitle.title;

      gDrive.upload(title, html, folderId, function (err, link) {

        if (err) {
          return next(err);
        }

        subtitle.link = link;

        next(null, subtitle);
      
      });
    
    }, function (err, results) {

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

    console.log(results);
    console.log('Done');

  }

});
