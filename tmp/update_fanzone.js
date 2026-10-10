const fs = require('fs');
let code = fs.readFileSync('src/pages/FanZone.tsx', 'utf8');

code = code.replace(/<span className={}>{match\.homeTeam}<\/span>/g, (match, offset) => {
  return '<span className={`font-black uppercase text-center whitespace-nowrap truncate max-w-full w-full ${((match.homeTeam || "").trim().includes(" ") || (match.homeTeam || "").length > 7) ? "text-[9px] sm:text-[10px]" : "text-xs"}`}>{match.homeTeam}</span>';
});

// Fix all className={} in FanZone.tsx
code = code.replace(/className={}/g, 'className="text-xs font-black uppercase text-center line-clamp-1"');

fs.writeFileSync('src/pages/FanZone.tsx', code, 'utf8');
console.log('Fixed FanZone.tsx');
