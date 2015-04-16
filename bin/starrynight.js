#! /usr/bin/env node

//"server_path" : ".meteor/local/build/programs/server/assets/packages/clinical_nightwatch/selenium/selenium-server-standalone-2.44.0.jar",

// This tool is basically about copying files to places they need to be and launching other utilities.


var DEBUG = false;
if(process.env.DEBUG){
  DEBUG = true;
}


//==================================================================================================
// REQUIRED IMPORTS

// child_process lets us exec and spawn external commands
var childProcess = require( "child_process" );

// minimist lets us cleanly parse our cli arguments into an object
var minimist = require('minimist');

// fs-extra lets us recursively copy directories and do advance file management
var fs = require('fs-extra');

// file-exists allows us to make sure config files exist
var fileExists = require('file-exists');

// http allows us to detect if instances of meteor are running in expected locations
var http = require('http');

// github-download allows us to clone repos into our application
var githubDownload = require('github-download');

// node-parse-url breaks up a url into component parts for us
var urlParser = require('node-parse-url');

// request allows us to query external websites
var request = require('request');

// find-files allows us to -rename
var finder = require('find-files');

// replace allows us to refactor contents of file
var replace = require('replace');

// just want to know where it's located
var seleniumJar = require('selenium-server-standalone-jar');

// so we can find the NODE_PATH
var path = require('path');

// fibers and futures allow us to make remote async calls
var Fiber = require('fibers');
var Future = require('fibers/future');

// so we can get the npm install prefix
var npm = require('npm');

// for _.extend()ing the process.env object
var _ = require('underscore');


//==================================================================================================
// FILE LINKING






//****************************************************************************************************************
// VARIABLES

var isReadyToRun = true;


//****************************************************************************************************************
// PROCESSING COMMAND LINE ARGUMENTS

// most of StarySky uses a two argument syntax
var primaryArgument = (process.argv[ 2 ] || "");
var secondaryArgument = (process.argv[ 3 ] || "");
var thirdArgument = (process.argv[ 4 ] || "");
var fourthArgument = (process.argv[ 5 ] || "");
var fifthArgument = (process.argv[ 5 ] || "");

// otherwise we'll want to pass in all of the arguments
var options = minimist(process.argv);

DEBUG && console.log(options);


npm.load(function(error, npm) {
  if (error) {
    throw error;
  }
  var npmPrefix = npm.config.get('prefix');
  DEBUG && console.log('npm prefix is', npmPrefix);

  // Check to see if the use has supplied a filter.
  switch (primaryArgument){

      //============================================================================================================
      case "":
          console.log("");
          console.log( "Welcome to the StarryNight." );
          console.log( "Use -help for more info." );
      break;

      //============================================================================================================
      case "-scaffold":

        switch (secondaryArgument) {
          //--------------------------------------------------------------------------------------------------------
          case "project-homepage":
            fs.copy(npmPrefix + '/lib/node_modules/starrynight/scaffolds/boilerplates/project-homepage', './', function (error) {
              if (error){
                return console.error(error)
              }
              childProcess.spawn('meteor', ['add', 'less', 'awatson1978:fonts-helveticas'], function(error, result){
                if(error){
                  console.log("[StarryNight] Error adding meteor packages. ", error);
                }
                if(result){
                  console.log('Packages installed.')
                }
              });
              console.log('Scaffold copied into place.')
            });
            break;
          //--------------------------------------------------------------------------------------------------------
          case "mobile-app":
            fs.copy(npmPrefix + '/lib/node_modules/starrynight/scaffolds/boilerplates/mobile-app', './', function (error) {
              if (error){
                return console.error(error)
              }
              console.log('Scaffold copied over!')
            });
            break;
          //--------------------------------------------------------------------------------------------------------
          case "rest-api":
            fs.copy(npmPrefix + '/lib/node_modules/starrynight/scaffolds/boilerplates/rest-api', './', function (error) {
              if (error){
                return console.error(error)
              }
              console.log('Scaffold copied over!')
            });
            break;
          //--------------------------------------------------------------------------------------------------------
          case "iron-router":

            childProcess.spawn('meteor', ['add', 'iron:router'], function(error, result){
              if(error){
                console.log("[StarryNight] Error adding meteor packages. ", error);
              }
              if(result){
                console.log('iron:router installed.')
              }
            });
            fs.copy(npmPrefix + '/lib/node_modules/starrynight/scaffolds/boilerplates/iron-router', './', function (error) {
              if (error){
                return console.error(error)
              }
              console.log('Scaffold copied over!')
            });
            break;
          //--------------------------------------------------------------------------------------------------------
          case "client-server":
            fs.copy(npmPrefix + '/lib/node_modules/starrynight/scaffolds/boilerplates/client-server', './', function (error) {
              if (error){
                return console.error(error)
              }
              console.log('Scaffold copied over!')
            });
            break;
          //--------------------------------------------------------------------------------------------------------
          default:
            console.log('No scaffold template specified.  Please specify:')
            console.log('> project-homepage');
            console.log('> client-server');
            console.log('> rest-api');
            //console.log('> mobile-app');
            break;
          break;
        }
      break;


      //============================================================================================================
      case "-sample":
        console.log('StarryNight is initializing some default tests in your app...');
        parseInitializeTestFilesArguments(npmPrefix);
      break;

      //============================================================================================================
      case "-initialize":
        console.log('StarryNight is initializing some default tests in your app...');
        parseInitializeTestFilesArguments(npmPrefix);
      break;

      //==============================================================================================
      case "-run-tests":
        parseRunTestArguments(npmPrefix);
      break;

      //==============================================================================================
      case "-survey":
        parseRunTestArguments(npmPrefix);
      break;

      //==============================================================================================
      case "-nightwatch":
        parseRunTestArguments(npmPrefix);
      break;


      //==================================================================================================
      case "-clone":
        console.log("Cloning repository...");


        var url = urlParser(secondaryArgument);
        console.log('url', url);
        console.log('url.path', url.path);
        console.log('user', url.path.match(/\/(.*)\//).pop());
        console.log('repo', url.path.substring(url.path.lastIndexOf("/") + 1));


        githubDownload(secondaryArgument, thirdArgument)
          .on('dir', function(dir) {
            console.log(dir)
          })
          .on('file', function(file) {
            console.log(file)
          })
          .on('zip', function(zipUrl) { //only emitted if Github API limit is reached and the zip file is downloaded
            console.log(zipUrl)
          })
          .on('error', function(err) {
            console.error(err)
          })
          .on('end', function() {
            childProcess.execFile('tree', function(err, stdout, sderr) {
              console.log(stdout)
            })
          });

        //TODO: copy ./.temp/components/* to ./components
        //TODO; rm ./.temp
      break;

      //==================================================================================================
      // -pattern is similar to -clone, but assumes that the target url implements a standard boilerplate
      // it then goes into the boilerplate, and copies files into appropriate locations
      // and avoids copying over package and repo specific files
      // in other words, it's a 'smart clone'

      case "-pattern":
        console.log("Cloning repository pattern into directories...");

        if(secondaryArgument){
          // var url = urlParser(secondaryArgument);
          // console.log('url', url);
          // console.log('url.path', url.path);
          // console.log('user', url.path.match(/\/(.*)\//).pop());
          // console.log('repo', url.path.substring(url.path.lastIndexOf("/") + 1));

          //TODO:  check if we're in the root of an application?  That might be a good thing to do.

          // download the repository to a temp directory
          githubDownload(secondaryArgument, './.temp')
            .on('dir', function(dir) {
              console.log(dir)
            })
            .on('file', function(file) {
              console.log(file)
            })
            .on('zip', function(zipUrl) { //only emitted if Github API limit is reached and the zip file is downloaded
              console.log(zipUrl)
            })
            .on('error', function(err) {
              console.error(err)
            })
            .on('end', function() {
              childProcess.execFile('tree', function(err, stdout, sderr) {
                DEBUG && console.log(stdout)
              });

              // copy the components directory from our temp dir to the app dir
              // this assumes the standard server-client boilerplate
              fs.copy('./.temp/components', './client/app/components', function (error) {
                if (error){
                  return console.error(error)
                }
                console.log('Components copied from repository into app!')

                // temp directory created; lets move components into their final place
                fs.copy('./.temp/tests/nightwatch/commands/components', './tests/nightwatch/commands/components', function (error) {
                  if (error){
                    return console.error(error)
                  }
                  console.log('Component acceptance tests copied from repository into app!')

                  //clean things up by removing our temp directory
                  fs.remove('./.temp', function (err) {
                    if (err) return console.error(err)

                    console.log('success!')
                  });
                });
              });
            });




        }else{
          console.log('-pattern needs a github URl to clone from that implements the server-client boilerplate pattern.');
        }



      break;

      //==================================================================================================
      case "-rename":
        // starrynight -refactor Page Panel app/components
        // starrynight -refactor originalTerm newTerm directoryRoot
        // starrynight -refactor secondaryArgument thirdArgument fourthArgument

        if(!fourthArgument){
          fourthArgument = ".";
        }
        console.log("------------------------------------------");
        console.log("Searching files.... ");
        finder(secondaryArgument, {root: fourthArgument, ignoreDirs: [".meteor", ".git", ".temp"]}, function(results){
          //console.log('results', results);\

          console.log("");
          console.log("------------------------------------------");
          console.log("Renamed files...");
          console.log("");
          results.forEach(function(result){
            // console.log('result.filepath', result.filepath);

            // many component directories will have subfiles with the same name
            // we need to run the replace twice - to replace the directory name
            // and then to replace the file name.

            var newresult = result.filepath.replace(secondaryArgument, thirdArgument);
            var finalPath = newresult.replace(secondaryArgument, thirdArgument);

            fs.move(result.filepath, finalPath, function(error, result){
              console.log('error', error);
            });

            console.log(finalPath);

          });
        });

        console.log('Done renaming files!');
      break;

      //==================================================================================================
      case "-refactor":
        // starrynight -refactor foo bar app/components
        // starrynight -refactor originalTerm newTerm directoryRoot
        // starrynight -refactor secondaryArgument thirdArgument fourthArgument

        if(!fourthArgument){
          fourthArgument = ".";
        }

        replace({
          regex: secondaryArgument,
          replacement: thirdArgument,
          paths: ['.'],
          excludes: [".meteor", ".git"],
          recursive: true
        });

        console.log('Done refactoring!');
      break;

      //==================================================================================================
      case "-help":
          console.log( "StarryNight... The ultra-simple way to watch your Meteor apps for QA issues." );
          console.log( "Usage:" );
          console.log( "  -sample" );
          console.log( "  -scaffold [project-homepage | client-server | rest-api]" );
          console.log( "  -sample [acceptance | all]]" );
          console.log( "  -pattern <url>" );
          console.log( "  -rename <originalTerm> <newTerm> <directoryRoot>" );
          console.log( "  -refactor <originalTerm> <newTerm> <directoryRoot>" );
          console.log( "  -run-tests [tiny | acceptance | end-to-end]" );
          //console.log( "  -clone [url]" );
      break;


      //==================================================================================================
      // If we can't figure out what the command-line argument was, then something is incorrect. Exit out.
      default:

          console.log( "Didn't understand that command.  Use -help for information." );

          // Exit out of the process (as a failure).
          process.exit( 1 );

      break;

  }
});





 function parseInitializeTestFilesArguments(npmPrefix){
  switch (secondaryArgument) {
    case "all":
      // we're going to copy over all of the contents in the sample-tests directory
      fs.copy(npmPrefix + '/lib/node_modules/starrynight/sample-tests', './tests', function (error) {
        if (error){
          return console.error(error)
        }
        console.log('Tests copied over!')
      });
      break;
    case "end-to-end":
      fs.copy(npmPrefix + '/lib/node_modules/starrynight/sample-tests/meteor-e2e', './tests/meteor-e2e', function (error) {
        if (error){
          console.log('Is meteor-e2e installed?');
          return console.error(error)
        }
        console.log('Tests copied over!')
      });
      break;
    case "acceptance":
      switch (thirdArgument) {
        case "project-homepage":
            fs.copy(npmPrefix + '/lib/node_modules/starrynight/sample-tests/nightwatch-project-homepage', './tests/nightwatch', function (error) {
              if (error){
                return console.error(error)
              }
              console.log('ProjectHomepage tests copied over!')
            });
          break;
        case "itunes":
            fs.copy(npmPrefix + '/lib/node_modules/starrynight/sample-tests/nightwatch-itunes', './tests/nightwatch', function (error) {
              if (error){
                return console.error(error)
              }
              console.log('iTunes tests copied over!')
            });
          break;
        default:
          fs.copy(npmPrefix + '/lib/node_modules/starrynight/sample-tests/nightwatch', './tests/nightwatch', function (error) {
            if (error){
              return console.error(error);
            }
            console.log('Basic testing framework copied over!')
          });
          break;
      }
      break;
    // case "acceptance-helloworld":
    //   fs.copy(npmPrefix + '/lib/node_modules/starrynight/sample-tests/nightwatch-helloworld', './tests/nightwatch', function (error) {
    //     if (error){
    //       return console.error(error)
    //     }
    //     console.log('Tests copied over!')
    //   });
    //   break;
    default:
      // we're going to copy over all of the contents in the sample-tests directory
      console.log('No sample tests specified to copy over.  Please specify:')
      console.log('> all');
      console.log('> end-to-end');
      console.log('> acceptance');
      console.log('> acceptance project-homepage');
    break;
  }
}






function parseRunTestArguments(npmPrefix){
  switch (secondaryArgument) {

    //------------------------------------------------------------------------------------------
    // case "":
    //   console.log("Please specify a test type.");
    // break;

    //------------------------------------------------------------------------------------------
    case "end-to-end":
      console.log("Running end-to-end tests...");
      console.log("NOTICE:  This is very experimental integration of the meteor-e2e package!  ");
      console.log("NOTICE:  See the following repo for more details about setting it up:");
      console.log("NOTICE:  https://github.com/awatson1978/e2e");

      childProcess.exec("selenium", function(err, stdout, stderr) {
        console.log(stdout);

        childProcess.exec('SOURCE_TESTS_DIR="tests/meteor-e2e" meteor-e2e --local --browsers=firefox', function(err, stdout, stderr) {
          console.log(stdout);
        });

      });
    break;

    //------------------------------------------------------------------------------------------
    case "acceptance":
      console.log("Launching StarryNight.  Analyzing meteor environment...");

      request("http://localhost:3000", function (error, httpResponse) {
         if (httpResponse) {
           console.log("Detected a meteor instance...");

            console.log("Launching nightwatch bridge...");

            // we need to launch slightly different commands based on the environment we're in
            // specifically, whether we're running locally or on a continuous integration server
            var configFileLocation;
            var nightwatchCommand;
            if(process.env.TRAVIS){
              // the command paths to run if we're on travis.org
              configFileLocation = npmPrefix + '/lib/node_modules/starrynight/configs/nightwatch/travis.json';
              nightwatchCommand = '/home/travis/.nvm/v0.10.38/lib/node_modules/starrynight/node_modules/nightwatch/bin/nightwatch';
            }else{
              // the command paths if we're running locally
              configFileLocation = npmPrefix + '/lib/node_modules/starrynight/configs/nightwatch/config.json';
              nightwatchCommand = npmPrefix + '/lib/node_modules/starrynight/node_modules/nightwatch/bin/nightwatch';
            }

            var nightwatchEnv = _.extend(process.env, {npm_config_prefix: npmPrefix});
            var frameworkExitCode = 0;
            var nightwatch = childProcess.spawn(nightwatchCommand, ['-c', configFileLocation], {env: nightwatchEnv});
            nightwatch.stdout.on('data', function(data){
              console.log(data.toString().trim());

              // without this, travis CI won't report that there are failed tests
              if(data.toString().indexOf("✖") > -1){
                frameworkExitCode = 1;
              }
            });
            nightwatch.stderr.on('data', function(data) {
              console.error(data.toString());
            });
            nightwatch.on('error', function(error){
              console.error('[StarryNight] ERROR spawning nightwatch. nightwatchCommand was', nightwatchCommand);
              throw error;
            });
            nightwatch.on('close', function(nightwatchExitCode){
              if(nightwatchExitCode === 0){
                console.log('Finished!  Nightwatch ran all the tests!');
                  process.exit(nightwatchExitCode);
              }
              if(nightwatchExitCode !== 0){
                console.log('Nightwatch exited with a code of ' + nightwatchExitCode);
                process.exit(nightwatchExitCode);
              }
            });

         }
         if(error){
           console.log("No app is running on http://localhost:3000.  Try launching an app with 'meteor run'.");
           console.error(error);
           //TODO: exit with error that will halt travis
           process.exit(1);
         }
      });



    break;

    //------------------------------------------------------------------------------------------
    case "tiny":
      console.log("Running tiny tests on packages.  Check http://localhost:3000");
      childProcess.exec("meteor test-packages", function(err, stdout, stderr) {
        console.log(stdout);
      });
    break;

    //------------------------------------------------------------------------------------------
    case "audit-permission":
      console.log("Fixing permissions in .meteor directory.");
      childProcess.exec("chmod -R 755 .meteor", function(err, stdout, stderr) {
        console.log(stdout);
      });
    break;
    // //------------------------------------------------------------------------------------------
    // case "all":
    //   console.log("Running all tests...");
    //   childProcess.exec("ls -la", function(err, stdout, stderr) {
    //     console.log(stdout);
    //   });
    // break;

    //------------------------------------------------------------------------------------------
    default:
      console.log('No testing framework specified.  Please select:')
      console.log('> tiny');
      console.log('> end-to-end');
      console.log('> acceptance');
    break;
  }
}
