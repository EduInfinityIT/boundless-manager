var fs = require('fs');
var path = require('path');
var jade = require('jade');

var template = fs.readFileSync('./template/lecture.jade');
var compiler = jade.compile(template);

exports.generateHTML = function (comment, filename) {

  var ext = path.extname(filename);
  var newFilename = filename.replace(ext, '.htm');

  var file = fs.readFileSync(filename);
  var content = file.toString().split('\n');
  var result = compiler({
    comment: comment,
    content: content
  });

  return result;

};
