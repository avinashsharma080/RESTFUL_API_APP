var mongoose = require("mongoose");
var Comment = require("./comment")

var blogSchema = new mongoose.Schema({
    title: String,
    image: String,
    description: String,
    author: {
        id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        username: String
    },
    created: { type: Date, default: Date.now },
    comments: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment"
    }]
});

module.exports = mongoose.model("Blog", blogSchema);