const https = require('https');
https.get('https://firebase.google.com/docs/ai-assistance/ai-studio-integration', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => console.log(data));
});
