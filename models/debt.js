const mongoose = require('mongoose');

const debtSchema = new mongoose.Schema({
    _id: String,
    person: String,
    amount: mongoose.Decimal128,
    description: String,
    date: Date,
    archived: Boolean,
    isPositive: Boolean,
    position: {},
    picture: String,
    reminder: Date
}, { _id: false })

const Debt = mongoose.model('Debt', debtSchema)
module.exports = Debt;