var fs = require('fs');
var path = require('path');
var jade = require('jade');

var template = fs.readFileSync('./template/lecture.jade');
var compiler = jade.compile(template);

exports.generateHTML = function (comment, data) {

  var content = data.toString().split('\n');
  var result = compiler({
    comment: comment,
    content: content
  });

  return result;

};
