var request = require('request');

// create logger if it's not in scope
if (!global.log){
    var Logger = require('./log')
    global.log = new Logger('TRACE')
}

function versCmp(x, y){
  // like strcmp:
  // returns -1 if x < y
  // returns 1 if x > y
  // returns 0 if versions are equal
  
  // split on dot
  x = x.split('.');
  y = y.split('.');

  // only check terms they share
  // e.g. when comparing 1.2.3 vs 1.2, don't check the third term on 1.2.3
  terms = Math.min(x.length, y.length);
  for (var i=0; i < terms; i++){
    if ( parseInt(x[i]) < parseInt(y[i]) ) { return -1 };
    if ( parseInt(x[i]) > parseInt(y[i]) ) { return  1 };
  }
  // if all terms match, we call the version with more terms the 'greater' one
  // e.g. compareVersions('1.2.3', '1.2') === 1
  if ( x.length < y.length ) { return -1 };
  if ( x.length > y.length ) { return  1 };
  // otherwise, versions match
  return 0;
}

function getConManVersion(env, cb){
  // request.get('https://crossbrowsertesting.com/api/v3/localconman/version', (err, resp, body) => {
  var urls = {
    'local': 'http://localhost:3000',
    'test': 'http://test.crossbrowsertesting.com',
    'qa'  : 'http://qaapp.crossbrowsertesting.com',
    'prod': 'http://livetestdirect.crossbrowsertesting.com'
  }
  request.get(urls[env] + '/api/v3/localconman/version', (err, resp, body) => {
    if (err){ return cb(err) };
    if (resp.statusCode !== 200){ return cb(new Error(body))};
    try {
      version = JSON.parse(body);
    } catch (ex) {
      cb(ex);
    }
    cb(null, version);
  })
}


function checkVersion(env, cb){
  var pjson = require('./package.json');
  var installedVersion = pjson.version;
  log.debug('Checking version...');
  version = getConManVersion(env, (err, versionsFromNode) => {
    // if the current version is lower than or equal to the blocked version
    if (err){
      log.error("Error checking for updates. Enterprise Connection Manager may not function properly.");
      log.error(err.stack || err)

    } else if ( versCmp(installedVersion, versionsFromNode.blockedVersion) <= 0 ) {
      log.error("CBT Enterprise Connection Manager is woefully out of date and must be updated!\n");
      log.error(`Newest version (${versionsFromNode.currentVersion}) vs installed version (${installedVersion})`);
      log.error("Please download the new binary or run 'npm update -g cbt-enterprise-connection-manager'");
      process.exit(1);

    } else if ( versCmp(installedVersion, versionsFromNode.deprecatedVersion) <= 0 ){
      log.warn("CBT Enterprise Connection Manager version is deprecated!");
      log.warn(`Newest version (${versionsFromNode.currentVersion}) vs installed version (${installedVersion})`);
      log.warn("It will continue to work for now, but we recommend updating soon.");

    } else if ( versCmp(installedVersion, versionsFromNode.currentVersion) < 0 ){
      log.info("Update available! Please download the new binary or run 'npm update -g cbt-enterprise-connection-manager'");

    } else if ( versCmp(installedVersion, versionsFromNode.currentVersion) >= 0 ){
      log.info(`Current version (${installedVersion}) is up to date.`);
    }

    cb()
  });
}

module.exports.checkVersion = checkVersion
