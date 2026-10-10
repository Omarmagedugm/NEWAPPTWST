const fs = require('fs');
const files = [
  'src/pages/Store.tsx',
  'src/pages/Profile.tsx',
  'src/pages/Matches.tsx',
  'src/pages/Bookmarks.tsx',
  'src/pages/Admin.tsx',
  'src/pages/FanZone.tsx',
  'src/pages/History.tsx',
  'src/pages/News.tsx',
  'src/pages/Home.tsx',
  'src/pages/Live.tsx',
  'src/pages/NewsDetail.tsx',
  'src/pages/Media.tsx'
];

for (const file of files) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/pb-24/g, 'pb-32');
    // Also replace z-[60], z-[70] just in case there are others except Modals.
    // modals usually have "fixed inset-0 z-[60]" so I'll leave them if they have "fixed inset-0".
    fs.writeFileSync(file, content);
  }
}
console.log('done');
