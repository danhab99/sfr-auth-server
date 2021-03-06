const mongoose = require("mongoose");

const siteSchema = new mongoose.Schema({
  clientID: {
    type: String,
    required: true,
  },
  clientSecret: {
    type: String,
    required: true,
  },
  domain: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  redriect: {
    type: String,
    required: true,
  },
  owner: {
    type: mongoose.SchemaTypes.ObjectId,
    ref: "users",
    unique: true,
  },
});

module.exports = Site = mongoose.model("site", siteSchema);
