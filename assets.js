const express = require('express');
const fs = require('fs');

let router = express.Router();
let content = fs.readFileSync('.glitch-assets', 'utf8');
let rows = content.split("\n");
let assets = rows.map((row) => {
  try {
    return JSON.parse(row);
  } catch (e) {}
});
assets = assets.filter((asset) => asset);

router.use((request, response) => {
  response.header("Access-Control-Allow-Origin", "*");
  response.header("Access-Control-Allow-Methods", "GET");
  response.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  
  let path = request.path.substring(1);
  
  let [matching] = assets.filter((asset) => {
    if(asset.name)
      return asset.name.replace(/ /g,'%20') === path;
  });
  
  if (!matching || !matching.url) {
    return response.status(404).end("No such file");
  }
  
  return response.redirect(matching.url);
});

module.exports = router;
