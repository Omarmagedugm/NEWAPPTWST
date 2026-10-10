const fs = require('fs');
const walkSync = (dir, filelist = []) => {
  fs.readdirSync(dir).forEach(file => {
    const dirFile = dir + '/' + file;
    try {
      if (fs.statSync(dirFile).isDirectory()) {
         if(!dirFile.includes('node_modules') && !dirFile.includes('.git')) {
             filelist = walkSync(dirFile, filelist);
         }
      } else {
        if(file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg')) {
           filelist.push(dirFile);
        }
      }
    } catch (err) {}
  });
  return filelist;
};

console.log(walkSync('.'));
