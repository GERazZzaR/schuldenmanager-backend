const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
    name: String,
    checked: Boolean,
    prompt: String
})

const Setting = mongoose.model('Setting', settingSchema)
module.exports = Setting;