const fs = require('fs');

function execShellCommand(cmd) {
  const exec = require('child_process').exec;
  return new Promise((resolve, reject) => {
      exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.warn(error);
      }
      resolve(stdout? stdout : stderr);
    });
  });
}



async function main(){ 
  const _setupFile = './setup.demo.json';
  const _frontendEndpointFolder = './frontend/src/assets/js/';
  const _spMetadataFolder = './docs/';
  const _dataPermissionsFolder = './data/';
  let setup = fs.readFileSync(_setupFile, 'utf8');

  if(setup){
    try{
      setup = JSON.parse(setup)
    }catch(e){
      setup = null;
      console.error("Error processing file ", _setupFile);
    }

    if(!setup){
      return;
    }
    
    const serviceName = setup.serviceName;
    const dataBucket = setup.dataBucket;
    const stage = "demo";
    const api_id = await execShellCommand("sls info | grep GET -m 1 | awk -F[/:] '{printf \$4}'");

    if(!api_id){
      console.log("Review your AWS Credentials");
      return;
    }

    //endpoint.js
    let sampleEndpoint = fs.readFileSync(_frontendEndpointFolder+"sample-endpoint.js", 'utf8');
    sampleEndpoint = sampleEndpoint.replace("{api_id}",api_id).replace("{stage}",stage);
    fs.writeFileSync(_frontendEndpointFolder+"endpoint.js",sampleEndpoint);
    console.log(_frontendEndpointFolder+"endpoint.js successfully generated");

    //permissions.csv
    let sampleDataPermissions = fs.readFileSync(_dataPermissionsFolder+"sample-permissions.csv", 'utf8');
    sampleDataPermissions = sampleDataPermissions.replace(/{serviceName}/g,serviceName).replace(/{dataBucket}/g,dataBucket);
    fs.writeFileSync(_dataPermissionsFolder+"permissions.csv",sampleDataPermissions);
    console.log(_dataPermissionsFolder+"permissions.csv successfully generated");

    //sp-metadata.xml
    let metadataFile = fs.readFileSync(_spMetadataFolder+"sample-sp-metadata.xml", 'utf8');
    metadataFile = metadataFile.replace("{api_id}",api_id).replace("{stage}",stage).replace("{issuer}",serviceName);
    fs.writeFileSync(_spMetadataFolder+"sp-metadata.xml",metadataFile);
    if((await execShellCommand("curl -F userfile=@docs/sp-metadata.xml https://samltest.id/upload.php")).indexOf("successfully")>-1){
      console.log(_spMetadataFolder+"sp-metadata.xml uploaded successfully to samltest.id");
    }
  }
}

main();
