var request = require('request');

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

function getConManVersion(cb){
  // request.get('https://crossbrowsertesting.com/api/v3/localconman/version', (err, resp, body) => {
  request.get('http://localhost:3000/api/v3/localconman/version', (err, resp, body) => {
    try {
      version = JSON.parse(body);
    } catch (err) {
      cb(err);
    }
    cb(null, version);
  })
}


function checkVersion(cb){
  var pjson = require('./package.json');
  var installedVersion = pjson.version;
  console.log('Checking version...');
  version = getConManVersion( (err, versionsFromNode) => {
    // if the current version is lower than or equal to the blocked version
    if (err){
      console.log("Error checking for updates. Local Connection Manager may not function properly.");
    } else if ( versCmp(installedVersion, versionsFromNode.blockedVersion) <= 0 ) {
      console.log("CBT Local Connection Manager is woefully out of date!\n");
      console.log(`Newest version (${versionsFromNode.currentVersion}) vs installed version (${installedVersion})`);
      console.log("Please download the new binary or run 'npm update -g cbt_local_connection_manager'");
      process.exit(1);
    } else if ( versCmp(installedVersion, versionsFromNode.deprecatedVersion) <= 0 ){
      console.log("CBT Local Connection Manager is deprecated!");
      console.log(`Newest version (${versionsFromNode.currentVersion}) vs installed version (${installedVersion})`);
      console.log("It will continue to work for now, but we recommend updating soon.");
    } else if ( versCmp(installedVersion, versionsFromNode.currentVersion) < 0 ){
      console.log("Update available! Please download the new binary or run 'npm update -g cbt_local_connection_manager'");
    } else if ( versCmp(installedVersion, versionsFromNode.currentVersion) == 0 ){
      console.log("Up to date!");
    }
    cb()
  });
}

module.exports.checkVersion = checkVersion
