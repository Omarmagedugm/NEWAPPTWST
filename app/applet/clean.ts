import fs from 'fs';

let content = fs.readFileSync('src/pages/Admin.tsx', 'utf-8');

// We will insert a utility function cleanPayload right at the beginning of handleAdd
const cleanStr = `
  const handleAdd = async () => {
    setLoading(true);
    const cleanPayload = (obj: any) => Object.fromEntries(Object.entries(obj).filter(([_, v]) => v !== undefined));
    try {`;
content = content.replace(/const handleAdd = async \(\) => {\n\s*setLoading\(true\);\n\s*try \{/, cleanStr);

// Then we replace `updateDoc(doc(db, '...', editingId), payload)` with `updateDoc(doc(db, '...', editingId), cleanPayload(payload))`
content = content.replace(/updateDoc\(doc\(db,\s*('[^']+')\s*,\s*editingId\),\s*payload\)/g, 'updateDoc(doc(db, $1, editingId), cleanPayload(payload))');

fs.writeFileSync('src/pages/Admin.tsx', content);
