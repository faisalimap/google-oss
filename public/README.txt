GOOGLE OSS — FIXED PUBLIC FOLDER

This folder is the complete frontend. Keep these files together:
- index.html
- 200.html
- style.css
- script.js
- favicon.svg

The HTML loads ./style.css and ./script.js. Do not rename or separate them.

Backend:
script.js sends searches to:
https://gle.qzz.io/api/search?q=YOUR_QUERY&page=1

Your backend must be deployed and return JSON containing:
{ "organic": [{ "title": "...", "link": "...", "snippet": "..." }] }

Deploy:
1. Extract this ZIP.
2. Open the extracted google-oss-public-fixed folder in Command Prompt.
3. Run: surge . google.oss

Important:
The frontend files are connected, but search results will appear only after
https://gle.qzz.io/api/search is live, has a valid SERPER_API_KEY, and allows
the origins https://google.oss and http://google.oss.
