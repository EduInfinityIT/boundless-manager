var fs = require('fs');
var path = require('path');
var jade = require('jade');
var comment = process.argv[2];
var filenames = process.argv.slice(3);

function buildCompiler (filename) {

  var template = fs.readFileSync(filename);
  var compiler = jade.compile(template);

  return compiler;

}

var compiler = buildCompiler('./template/lecture.jade');

var getHTML = function (comment, filename) {

  var file = fs.readFileSync(filename);
  var content = file.toString().split('\n');
  var result = compiler({
    comment: comment,
    content: content
  });

  return result;

};

var generateHTML = function (comment, filename) {

  var ext = path.extname(filename);
  var newFilename = filename.replace(ext, '.htm');

  console.log('Generate HTML from ' + filename + ' to ' + newFilename);
  fs.writeFileSync(newFilename, getHTML(comment, filename));

};

exports.generateHTML = generateHTML;
