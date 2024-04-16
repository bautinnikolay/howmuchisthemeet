const mongoose = require('mongoose')

mongoose.Promise = global.Promise
mongoose.connect(process.env.MONGODB_URI || 'mongo_url_here', { useNewUrlParser: true, useUnifiedTopology: true })

module.exports = {mongoose}
