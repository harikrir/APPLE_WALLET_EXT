const fs = require('fs');
const path = require('path');
const plist = require('plist');
module.exports = function (context) {
   const projectRoot = context.opts.projectRoot;
   // Look in both standard Cordova and MABS project locations
   const potentialPaths = [
       path.join(projectRoot, 'platforms', 'ios', 'exportOptions.plist'),
       path.join(projectRoot, 'platforms', 'ios', 'Test JV Mobile', 'exportOptions.plist')
   ];
   const provisioningProfiles = {
       "com.aub.mobilebanking.uat.bh": "1935f949-c72a-49f3-bc93-53d7df814805",
       "com.aub.mobilebanking.uat.bh.WNonUI": "2458aa6f-941b-43c4-b787-b1d304a7b73c",
       "com.aub.mobilebanking.uat.bh.WUI": "ef234420-f58f-41e4-871a-86527fe5acfd"
   };
   potentialPaths.forEach(plistPath => {
       if (fs.existsSync(plistPath)) {
           console.log(`🚀 Final Patch: Updating exportOptions at ${plistPath}`);
           const fileContent = fs.readFileSync(plistPath, 'utf8');
           let obj = plist.parse(fileContent);
           obj.provisioningProfiles = provisioningProfiles;
           obj.signingStyle = 'manual';
           obj.teamID = 'T57RH2WT3W';
           obj.method = obj.method || 'ad-hoc';
           fs.writeFileSync(plistPath, plist.build(obj), 'utf8');
           console.log(`✅ Success: exportOptions.plist is now synced with UUID files.`);
       }
   });
};
