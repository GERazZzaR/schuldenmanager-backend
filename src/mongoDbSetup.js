// MongoDB Connection
let connection = 'mongodb+srv://' + process.env.username + ':' + process.env.password + '@cluster0-m07la.mongodb.net/schuldenapp?retryWrites=true&w=majority';

module.exports = connection;

