const comment = require("./models/comment");

var express = require("express"),
    bodyParser = require("body-parser"),
    mongoose = require("mongoose"),
    methodOverride = require("method-override"),
    expressSanitizer = require("express-sanitizer"),
    passport = require("passport"),
    LocalStrategy = require("passport-local"),
    Blog = require("./models/blog"),
    User = require("./models/user"),
    Comment = require("./models/comment"),
    passportLocalMongoose = require("passport-local-mongoose"),
    seedDb = require('./seedDb'),
    app = express();

//APP CONFUG
mongoose.connect("mongodb://localhost:27017/blogdb", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
    useFindAndModify: false
});
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.use(expressSanitizer());


app.use(require("express-session")({
    secret: "daiosama",
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());



app.use(function(req, res, next) {
    res.locals.currentUser = req.user;
    next();
});


//RESTFUL ROUTES    

app.get("/", function(req, res) {
    res.redirect("/blogs");
});

//INDEX ROUTE
app.get("/blogs", isLoggedIn, function(req, res) {
    Blog.find({}, function(err, blogs) {
        if (err) {
            console.log("ERROR");
        } else {
            res.render("index", { blogs: blogs });
        }
    });
});

//NEW ROUTE
app.get("/blogs/new", isLoggedIn, function(req, res) {
    res.render("new");
});


//CREATE ROUTE
app.post("/blogs", isLoggedIn, function(req, res) {
    var title = req.body.title;
    var desc = req.body.description;
    var image = req.body.image;
    var author = {
        id: req.user._id,
        username: req.user.username
    }
    var newblog = { title: title, image: image, description: desc, author: author }

    Blog.create(newblog, function(err, newlyCreated) {
        if (err) {
            res.render("new");
        } else {
            res.redirect("/blogs");
        }
    });
});
//SHOW ROUTE
app.get("/blogs/:id", isLoggedIn, function(req, res) {
    Blog.findById(req.params.id).populate("comments").exec(function(err, foundBlog) {
        if (err) {
            res.redirect("/blogs");
        } else {
            res.render("show", { blog: foundBlog });
        }
    });
});

//EDIT ROUTE
app.get("/blogs/:id/edit", checkBlogownership, function(req, res) {
    Blog.findById(req.params.id, function(err, foundBlog) {
        res.render("edit", { blog: foundBlog });
    });
});
//UPDATE ROUTE
app.put("/blogs/:id", checkBlogownership, function(req, res) {
    req.body.blog.body = req.sanitize(req.body.blog.body);
    Blog.findByIdAndUpdate(req.params.id, req.body.blog, function(err, updateBlog) {
        if (err) {
            res.redirect("/blogs");
        } else {
            res.redirect("/blogs/" + req.params.id);
        }
    });

});
//DELETE ROUTE
app.delete("/blogs/:id", checkBlogownership, function(req, res) {
    Blog.findByIdAndRemove(req.params.id, function(err) {
        if (err) {
            res.redirect("/blogs");
        } else {
            res.redirect("/blogs");
        }
    });

});

// comment routes 

app.get('/blogs/:id/comments/new', isLoggedIn, function(req, res) {
    Blog.findById(req.params.id, function(err, foundBlog) {
        if (err) {
            console.log(err);
        } else {
            res.render('add', { blog: foundBlog });
        }
    })
});

app.post("/blogs/:id/comments", isLoggedIn, function(req, res) {
    Blog.findById(req.params.id, function(err, foundblog) {
        if (err) {
            console.log(err);
            res.redirect('/blogs/' + req.params.id);
        } else {
            Comment.create(req.body.comment, function(err, newComment) {
                if (err) {
                    console.log(err);
                } else {
                    newComment.author.id = req.user._id;
                    newComment.author.username = req.user.username;
                    newComment.save();
                    foundblog.comments.push(newComment);
                    foundblog.save();
                    res.redirect('/blogs/' + req.params.id);
                }
            });
        }
    })

});

app.get("/blogs/:id/comments/:comment_id/edit", checkCommentownership, function(req, res) {
    Comment.findById(req.params.comment_id, function(err, foundComment) {
        if (err) {
            console.log(err);
        } else {
            res.render('change', { blog_id: req.params.id, comment: foundComment });
        }
    })
});

app.put("/blogs/:id/comments/:comment_id", checkCommentownership, function(req, res) {
    Comment.findByIdAndUpdate(req.params.comment_id, req.body.comment, function(err, updatedComment) {
        if (err) {
            console.log(err);
        } else {
            res.redirect('/blogs/' + req.params.id);
        }
    });
});


app.delete("/blogs/:id/comments/:comment_id", checkCommentownership, function(req, res) {
    Comment.findByIdAndRemove(req.params.comment_id, function(err) {
        if (err) {
            res.redirect("/blogs");
        } else {
            res.redirect("/blogs/" + req.params.id);
        }
    });

});

//AUTH ROUTES

//show register form
app.get("/register", function(req, res) {
    res.render("register");
});
//handle sign up logic
app.post("/register", function(req, res) {
    var newUser = new User({ username: req.body.username });
    User.register(newUser, req.body.password, function(err, user) {
        if (err) {
            console.log(err);
            return res.render("register");
        }
        passport.authenticate("local")(req, res, function() {
            res.redirect("/blogs");
        });
    });
});

// show login page
app.get("/login", function(req, res) {
    res.render("login");
});

//handle login logic
app.post("/login", passport.authenticate("local", {
    successRedirect: "/blogs",
    failureRedirect: "/login"

}), function(req, res) {

});



//logout route
app.get("/logout", function(req, res) {
    req.logout();
    res.redirect("/blogs");
});

function isLoggedIn(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect("/login");

}

function checkBlogownership(req, res, next) {
    if (req.isAuthenticated()) {
        Blog.findById(req.params.id, function(err, foundBlog) {
            if (err) {
                res.redirect("/blogs");
            } else {
                if (foundBlog.author.id.equals(req.user._id)) {
                    next();
                } else {
                    res.send("u aint authentcated to do that");
                }
            }
        });
    } else {
        res.send("login first");
    }
}


function checkCommentownership(req, res, next) {
    if (req.isAuthenticated()) {
        Comment.findById(req.params.comment_id, function(err, foundComment) {
            if (err) {
                res.redirect("/blogs");
            } else {
                if (foundComment.author.id.equals(req.user._id)) {
                    next();
                } else {
                    res.send("u aint authentcated to do that");
                }
            }
        });
    } else {
        res.send("login first");
    }
}


app.listen(3000, function() {
    console.log("server started");
});