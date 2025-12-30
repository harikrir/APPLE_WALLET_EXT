const fs = require('fs');
const path = require('path');
module.exports = function(context) {
   const projectRoot = context.opts.projectRoot;
   const pluginID = context.opts.plugin.id;
   const iosPath = path.join(projectRoot, 'platforms', 'ios');
   const extensions = ['WUIExt', 'WNonUIExt'];
   extensions.forEach(extName => {
       const source = path.join(projectRoot, 'plugins', pluginID, 'src', 'ios', extName);
       const destination = path.join(iosPath, extName);
       if (fs.existsSync(source)) {
           // recursive: true is tight - it handles the /Models/ folder automatically
           if (!fs.existsSync(destination)) {
               fs.mkdirSync(destination, { recursive: true });
           }
           copyFolderRecursiveSync(source, destination);
           console.log(`✅ Hook: Moved ${extName} (including subfolders) to platforms/ios`);
       }
   });
   function copyFolderRecursiveSync(source, target) {
       const files = fs.readdirSync(source);
       files.forEach(file => {
           const curSource = path.join(source, file);
           const curTarget = path.join(target, file);
           if (fs.lstatSync(curSource).isDirectory()) {
               if (!fs.existsSync(curTarget)) fs.mkdirSync(curTarget, { recursive: true });
               copyFolderRecursiveSync(curSource, curTarget);
           } else {
               fs.copyFileSync(curSource, curTarget);
           }
       });
   }
};
