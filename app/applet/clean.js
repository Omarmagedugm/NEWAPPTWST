const fs = require('fs');

let content = fs.readFileSync('src/pages/Admin.tsx', 'utf-8');

const cleanStr = `
  const handleAdd = async () => {
    setLoading(true);
    const cleanPayload = (obj) => Object.fromEntries(Object.entries(obj).filter(([_, v]) => v !== undefined));
    try {`;
content = content.replace(/const handleAdd = async \(\) => {\n\s*setLoading\(true\);\n\s*try \{/, cleanStr);

content = content.replace(/updateDoc\(doc\(db,\s*('[^']+')\s*,\s*editingId\),\s*payload\)/g, 'updateDoc(doc(db, $1, editingId), cleanPayload(payload))');

fs.writeFileSync('src/pages/Admin.tsx', content);
