const fs = require('fs');

let content = fs.readFileSync('src/pages/Admin.tsx', 'utf-8');

content = content.replace(/addDoc\(collection\(db,\s*('[^']+')\),\s*payload\)/g, 'addDoc(collection(db, $1), cleanPayload(payload))');

fs.writeFileSync('src/pages/Admin.tsx', content);
