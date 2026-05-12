const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = dir + '/' + file;
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
        if(!file.includes("node_modules") && !file.includes(".backup")) {
            results = results.concat(walk(file));
        }
    } else if(file.endsWith(".tsx") || file.endsWith(".ts") || file.endsWith(".js") || file.endsWith(".jsx")) {
        results.push(file);
    }
  });
  return results;
}

const files = walk('./src');
const keys = [];
files.forEach(file => {
    const lines = fs.readFileSync(file, 'utf-8').split('\n');
    lines.forEach((line, i) => {
        if(line.includes("key=")) {
            const match = line.match(/key=\{([^}]+)\}/) || line.match(/key="([^"]+)"/);
            if(match) {
                keys.push(`${file}:${i+1} : ${match[0]}`);
            }
        }
        if(line.includes("key={")) {
            // maybe multiline
        }
    });
});

console.log(keys.join('\n'));
