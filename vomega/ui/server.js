const express = require('express')
const path = require('path')
const app = express()
app.use(express.static(path.join(__dirname)))
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')))
const PORT = process.env.VOMEGA_UI_PORT || 4020
app.listen(PORT, '127.0.0.1', () => console.log('vΩ UI serving at http://127.0.0.1:' + PORT))
