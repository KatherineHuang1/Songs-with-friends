const express = require("express");
const bodyParser = require("body-parser");
const assets = require("./assets");
const request1 = require("request");
const axios = require("axios");
const WebSocket = require("ws");
const http = require("http");
// login
const passport = require("passport");
const SpotifyStrategy = require("passport-spotify").Strategy;
// cookies modules, indicating that the user is logged in
const cookieParser = require("cookie-parser");
const expressSession = require("express-session");


// serve images, CSS files, and JavaScript files in public directory 
// https://expressjs.com/en/starter/static-files.html
const app = express();
app.use(express.static("public"));

const server = http.createServer(app);

// listen for requests 
server.listen(process.env.PORT, () => {
  console.log(`Server is listening on port ${server.address().port} :)`);
});

// ========================chat============================
// https://github.com/websockets/ws
const wss = new WebSocket.Server({ server });
wss.on("connection", ws => {
  ws.on("message", message => {
    broadcast(message);
  });
});

function broadcast(data) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

// ========================Setup passport(login, cookie)============================
// use express to handle decryption of cooikes, storage of data about the session, and deletes cookies when they expire
app.use(
  expressSession({
    secret: "workwithsong", // random string used for encryption of cookies
    maxAge: 6 * 60 * 60 * 1000, // Cookie time out (6 hours)
    resave: true,
    saveUninitialized: false,
    name: "song-session-cookie"
  })
);

// Initializes request object for further handling by passport
app.use(passport.initialize());
// If there is a valid cookie, will call passport.deserializeUser() to get user data; does nothing if there is no cookie
app.use(passport.session());
// Glitch assests directory
app.use("/assets", assets);
// take HTTP message body and put it as a string into req.body
app.use(bodyParser.urlencoded({ extended: true }));
// puts cookies into req.cookies
app.use(cookieParser());

// TODO: maybe upgrade the obj to user table in a database
let tokens = {}; // global object that stores all users' access tokens, indexed by their Spotify profile id
passport.use(
  new SpotifyStrategy(
    // object is the data to be sent to Spotify to kick off the login process
    // the process.env values are from the key.env file (I set up at Spotify)
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: "https://songs-with-friends.glitch.me/callback/"
    },
    // when the user has successfully logged in, info will be returned to this Server from the Spotify authentication server, 
    // so that I got the user's profile and accessToken from Spotify
    function(accessToken, refreshToken, expiresIn, profile, done) {
      tokens[profile.id] = accessToken;
      return done(null, profile);
    }
  )
);


app.get(
  "/auth/spotify",
  passport.authenticate("spotify", {
    scope: [
      "user-read-currently-playing",
      "user-read-email",
      "user-read-private",
      "playlist-modify-private",
      "playlist-read-collaborative",
      "user-modify-playback-state",
      "user-read-playback-state"
    ]
  }),
  function(req, res) {
    // The request will be redirected to spotify for authentication, so this
    // function will not be called.
  }
);


app.get(
  "/callback",
  passport.authenticate("spotify", {
    successRedirect: "/setcookie",
    failureRedirect: "/"
  })
);

let host;
let htmlAddr = {};
let userId;
let loginEmail = "";
let hostName = "";
// cookie is set before redirecting to the protected homepage
app.get("/setcookie", requireUser, function(req, res) {
  // set a public cookie; the session cookie was already set by Passport
  // set the cookie name to value
  res.cookie("spotify-passport-example", new Date());
  let url;
  if (hostName.length != 0 && loginEmail.length == 0) {
    url = "/user/hello.html" + "?name_host=" + hostName + "?id=" + userId;
    res.redirect(url);
    host = true;
  } else if (hostName.length != 0 && loginEmail.length != 0) {
    url = "/user/hello.html" + "?name=" + loginEmail + "?id=" + userId;
    res.redirect(url);
    host = false;
  }
  //store html address
  htmlAddr[userId] = url;

});

// currently not used
// using this route can clear the cookie and close the session
app.get("/user/logoff", function(req, res) {
  // clear both the public and the named session cookie
  res.clearCookie("spotify-passport-example"); 
  res.clearCookie("song-session-cookie");
  res.redirect("/");
});



// Server's sesssion set-up.
passport.serializeUser((profile, done) => {
  done(null, profile);
});


let hostId;
passport.deserializeUser((profile, done) => {
  // as the property "user" of the "req" object.
  let name = profile._json.display_name;
  userId = profile.id;
  
  if (hostName.length == 0) {
    hostName = profile._json.display_name;
    hostId  = profile.id;
  } else if (hostName.length != 0) {
    loginEmail = profile._json.display_name;
    if (loginEmail == hostName) {
      loginEmail = "";
    }
  }

  let userData = { userData: "maybe data from db row goes here" };
  done(null, userData);
});

function requireUser(req, res, next) {
  if (!req.user) {
    res.redirect("/");
  } else {
    next();
  }
}

// stage to serve files from /user, only works if user in logged in
// If user data is populated (by deserializeUser) and the session cookie is present, get files out of /user using a static server.
// Otherwise, user is redirected to public splash page (/index) by requireLogin
app.get("/user/*", requireUser, requireLogin, express.static("."));

function requireLogin(req, res, next) {
  if (!req.cookies["song-session-cookie"]) {
    res.redirect("/");
  } else {
    next();
  }
}

// special case for base URL, goes to index.html
app.get("/", function(req, res) {
  res.sendFile(__dirname + "/public/index.html");
});

// ========================create playlist============================
let hostPlaylist;
app.get("/create", function(req, res) {
  let token = tokens[userId];

  let playListObj = {
    name: "New Playlist",
    description: "New playlist description",
    public: false,
    collaborative: true
  };

  let url = "https://api.spotify.com/v1/users/" + userId + "/playlists";

  const playList = {
    url: url,
    json: true,
    body: playListObj,
    headers: {
      // authorized to control the user's playback
      Authorization: `Bearer ${token}`
    }
  };

  request1.post(playList, (err, postres, inforPlaylist) => {
    if (err) {
      return console.log(err);
    }

    hostPlaylist = inforPlaylist.id;
    res.send(inforPlaylist.id);
    
    let prefix = "playlists/";
    let url = inforPlaylist.tracks.href;
    url = url.substr(url.lastIndexOf(prefix) + prefix.length);
    hostPlaylist = url.substring(0, url.indexOf("/tracks"));
  });
});

// ========================get playlist============================
app.get("/getPlayList", function(req,res){
  let token = tokens[userId];
  let url = "https://api.spotify.com/v1/playlists/" + hostPlaylist;

  const getPlayList = {
    url: url,
    json: true,
    headers: {
      Authorization: `Bearer ${token}`
    }
  };

  request1.get(getPlayList, (err, postres, inforGetPlaylist) => {
    if (err) {
      return console.log(err);
    }

    res.send(inforGetPlaylist);
});});
  
  
// ========================invite============================
app.get("/invite", function(request, response) {
  let name = request.query.name;
  if (host != true) {
    response.send("none");
  } else response.send("contents");
});
  
// =======================search song================================
app.use(bodyParser.json());

app.post("/searching", function(req, res) {
  let token = tokens[userId];
  let text = req.body.txt;

  let urlSearch = "https://api.spotify.com/v1/search?q=" + text + "&type=track&market=US";

  const searchSong = {
    url: urlSearch,
    json: true,
    headers: {
      Authorization: `Bearer ${token}`
    }
  };
  
  request1.get(searchSong, (err, postres, inforSearchSong) => {
    if (err) {
      return console.log(err);
    }
    res.send(inforSearchSong.tracks.items);
  });
});

// ======================add song (via Axios)===========================
app.use(bodyParser.raw());

app.post("/addsong", function(req, res) {
  let token = tokens[hostId]; //use host token to add song

  const addSongURL =
    "https://api.spotify.com/v1/playlists/" +
    hostPlaylist +
    "/tracks?" +
    "uris=" +
    req.body.track;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json"
  };

  axios
    .post(addSongURL, null, { headers })
    .then(response => {
      console.log(`Success: ${JSON.stringify(response.data)}`);
      res.send(JSON.stringify(response.data));
    })
    .catch(error => {
      console.log(`Error in adding song: ${error}`);
    });
});


// ======================play song===========================
let checkErr = false;
app.post("/play", function(req, res) {
  let token = tokens[userId];// grab the user's access token
  let url = "https://api.spotify.com/v1/me/player/play";
  let body;
  if (req.body.progress === undefined) {
    body = { uris: [req.body.txt] };
  } else {
    body = { uris: [req.body.txt], "positionMs": req.body.progress };
  } 
  console.log(body);
  const options = {
    url: url,
    json: true,
    body: body,
    headers: {
      Authorization: `Bearer ${token}`
    }
  };

  request1.put(
    options,
    // The callback function for when Spotify responds
    (err, postres, body) => {
      if (err) {
        checkErr = true;
        return console.log(err);
      } 
      console.log("status: ", `Status: ${postres.statusCode}`);
    }
  );
  
  // Get information about the user’s current playback state, including track or episode, progress, and active device.
  url = "https://api.spotify.com/v1/me/player";
  const infroDuration = {
    url: url,
    json: true,
    headers: {
      Authorization: `Bearer ${token}`
    }
  };

  request1.get(infroDuration, (err, postres, duringReturn) => {
    if (err) {
      return console.log(err); 
    }

    if(duringReturn != undefined) {
      console.log("status: ", `Status: ${postres.statusCode}`);
      let ms = duringReturn.item.duration_ms;
      res.send(String(ms));
     }
    else {
      res.send("err");
    }
  });
  
});               
                

// ======================current===========================
app.get("/current", function(req, res) {
  let obj;

  let token = tokens[hostId];  // grab the user's access token
  let url = "https://api.spotify.com/v1/me/player";

  const currentInfor = {
      url: url,
      json: true,
      headers: {
        "Authorization": `Bearer ${token}`
      }
  };
  
  request1.get(currentInfor,  (err, postres, currentReturn) => {
      
    // console.log("status: ", `Status: ${postres.statusCode}`);
     if (currentReturn == undefined || currentReturn.item == undefined || currentReturn.progressMs == undefined)  {
          console.log(err);
          res.send("error");
      }else{
        obj = {
           "txt": currentReturn.item.uri,
           "progress": currentReturn.progressMs
        }
        res.send(JSON.stringify(obj));
      }
  });
      
});


