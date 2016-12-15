var express = require('express')
var NegotiateStrategy = require('passport-negotiate').Strategy
var passport = require('passport')

var app = express()

// Setting up passport
app.use(passport.initialize())
app.use(passport.session())

// Setting up passport-negotiate
passport.serializeUser(function(user, done) { done(null, user) })
passport.deserializeUser(function(id, done) { done(err, id) })
passport.use('login', new NegotiateStrategy(function(principal, done) { done(null, principal) }))

app.get('/whoami', passport.authenticate('login'), function(req, res) { res.send(req.user) })

app.listen(8000, function() { console.log('Listening on port 8000') })