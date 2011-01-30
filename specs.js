var jasmine = require('jasmine-node');
var sys = require('sys'),
    Path= require('path');

var SPEC_FOLDER= Path.join(process.cwd(), 'specs'),
    SPEC_MATCHER_REGEX= "spec\.js$",
    HELPER_MATCHER_REGEX= "helper\.js$";

for (var key in jasmine)
  global[key] = jasmine[key];

var isVerbose = false;
var showColors = true;
var spec = SPEC_MATCHER_REGEX;

function escapeRegex(text) {
  return text.replace(escapeRegex._escapeRegex, '\\$1');
}

/** The special characters in a string that need escaping for regular expressions. */
escapeRegex.specialCharacters= ['/', '.', '*', '+', '?', '|',
               '(', ')', '[', ']', '{', '}', '\\'];

/** A regular expression that will match any special characters that need to be
    escaped to create a valid regular expression. */
escapeRegex._escapeRegex= new RegExp('(\\'+ escapeRegex.specialCharacters.join("|\\") + ')', 'g');

process.argv.forEach(function(arg, index){
  switch(arg){
    case '--color':
      showColors = true;
      break;
    case '--noColor':
      showColors = false;
      break;
    case '--verbose':
      isVerbose = true;
      break;
    
    default:
      if (index>1)
        spec= "^.*/" + escapeRegex(arg) + "$";
      break;
  }
});

jasmine.loadHelpersInFolder(SPEC_FOLDER, HELPER_MATCHER_REGEX);
jasmine.executeSpecsInFolder(SPEC_FOLDER, function(runner, log){
  process.exit(runner.results().failedCount);
}, isVerbose, showColors, spec);
