//event listener for edit title, add song, invite, volumn, mute, chat
const pathname = window.location.pathname;
const href = window.location.href;
const length = href.length;
const url = "wss://songs-with-friends.glitch.me" + pathname;


let playlistId;
let currentOffset;

// ========================get info============================
// get user id, name from current url
let count = 0;
for (let i = 0; i < href.length; i++) {
  if (href[i] == "=") {
    break;
  }
  count++;
}

let newUrl = href.substr(count + 1, length - 1);
count = 0;
for (let i = 0; i < newUrl.length; i++) {
  if (newUrl[i] == "?") {
    break;
  }
  count++;
}

let currUser = newUrl.substr(0, count);
let id = newUrl.substr(count + 4, newUrl.length - 1);

// ========================render invite & playlist============================
// only host can invite friends, and create playlist
// guest will get the playlist
getInviteFromSever();
function getInviteFromSever() {
  let xhr = new XMLHttpRequest();
  xhr.open("GET", "/invite");
  xhr.addEventListener("load", function () {
    if (xhr.status == 200) {
      let responseStr = xhr.responseText; // get the respond (server will return contents for host and none for guest)
      document.getElementById("button").style.display = responseStr; 

      if (responseStr == "contents") {
        createPlayList();
      } else {
        getPlaylist();
        let intervalplaing = window.setInterval(checkcurrent, 5000);
      }
    } else {
      console.log("Error fetching space.dispaly");
      console.log(xhr.responseText);
    }
  });
  xhr.send();
}

// ========================change the room title============================
let changeTitle = document.getElementById("pen-icon");
changeTitle.addEventListener("click", function () {
  let modal = document.getElementById("myModal");
  let span = document.getElementById("change");
  modal.style.display = "block";

  // change room name
  span.onclick = function () {
    let text = document.getElementById("room-name").textContent;
    document.getElementById("text").textContent = text;
    modal.style.display = "none";
  };
  // When the user clicks anywhere outside of the modal, close it
  window.onclick = function (event) {
    if (event.target == modal) {
      modal.style.display = "none";
    }
  };
});

// ========================chat============================
const connection = new WebSocket(url); 
let sending = document.getElementById("arrow-icon");
//send new message to server
sending.addEventListener("click", function () {
  sendNewMessage();
});

function sendNewMessage() {
  let typing = document.getElementsByClassName("input-text");
  let obj = {
    type: "message",
    from: currUser,
    msg: typing[0].value,
  };
  connection.send(JSON.stringify(obj));
  typing[0].value = null; // clear after sent
}

connection.onerror = (error) => {
  console.log(`WebSocket error: ${error}`);
};

let msgNum = 0;
let addMessage = document.getElementsByClassName("chat-message")[0];

connection.onmessage = (event) => {
  msgNum++;  
  let msgObj = JSON.parse(event.data);
  let container = document.createElement("div"); 
  let newName = document.createElement("div"); 
  let newMsg = document.createElement("div"); 
  
  // msg from other user
  newName.textContent = msgObj.from + ": ";
  newMsg.textContent = " " + msgObj.msg;
  newMsg.className = "new-msg";
  container.appendChild(newName);
  container.appendChild(newMsg); 
  container.className = "new-container";
  addMessage.appendChild(container);  
  
  if (msgObj.from == currUser) { // msg from currUser
    container.className = "self-container";
    newName.className = "self-name";
    newMsg.className = "self-msg";
    newName.textContent = msgObj.msg;
    newMsg.textContent = " :" + msgObj.from;
  } 
  
  scroll();
};

//https://stackoverflow.com/questions/48816034/chat-scroll-bottom-css-or-javascript-only
function scroll() {
  let e = document.getElementsByClassName("chat-main");
  e[0].scrollTop = e[0].scrollHeight;
}

// open/close chat
let showChat = document.getElementById("comment-footer-icon");
let chatBox = document.getElementsByClassName("chat-box");
let showComment = document.getElementById("times-icon");

showChat.addEventListener("click", function () {
  chatBox[0].style.display = "flex";
  showChat.style.display = "none";
});

showComment.addEventListener("click", function () {
  chatBox[0].style.display = "none";
  showChat.style.display = "flex";
});

// ========================invite friend email============================
let inviteBut = document.querySelector("#button");
inviteBut.addEventListener("onclick", function () {
  // Get the <span> element that closes the modal
  let span = document.getElementById("change");
  span.onclick = function () {
    let hrf = "mailto:" + document.getElementById("room-name").content;
    document.getElementById("button").href = hrf;
  };

});

// ========================create and load playlist============================
function createPlayList() {
  let xhr = new XMLHttpRequest();
  xhr.open("GET", "/create");
  xhr.onloadend = function (e) {
    if (xhr.status === 200) {
      playlistId = xhr.responseText;
      console.log("playlistId", playlistId);
    } else {
      console.log("error");
    }
  };
  xhr.send();
}

function getPlaylist() {
  let playlistInfo;
  let xhr = new XMLHttpRequest();
  xhr.open("GET", "/getPlayList");
  xhr.onloadend = function (e) {
    if (xhr.status === 200) {
      playlistInfo = xhr.responseText;
      console.log("playlistInfo:", playlistInfo);
      return playlistInfo;
    } else {
      console.log("error");
      return "error";
    }
  };
  xhr.send();
}

// ========================add song============================
function addSong() {
  document.getElementById("overlay").className = "open";
}

let track = []; // playlist
// When the user press add song button...
function addSongBut() {
  document.querySelectorAll(".add-song").forEach((item) => {
    item.addEventListener("click", (event) => {
      // add track to array
      track.push(event.target.id);
      let xmlhttp = new XMLHttpRequest();
      let data = {
        track: event.target.id,
      };
      console.log(data);
      xmlhttp.open("POST", "/addsong");
      xmlhttp.setRequestHeader(
        "Content-Type",
        "application/json;charset=UTF-8"
      );

      xmlhttp.onloadend = function (e) {
        const result = JSON.parse(xmlhttp.responseText);
      };
      xmlhttp.send(JSON.stringify(data));
    });
  });
}

// close overlay by clicking X
let closeOverlay = document.getElementById("close1");
closeOverlay.addEventListener("click", function () {
  document.getElementById("overlay").className = "close";
});


// =========================search song============================

let searching = document.getElementById("search-but");

function searchSong() {
  let xhr = new XMLHttpRequest();
  xhr.open("POST", "/searching");
  let textForSearching = document.getElementById("searchTxt").value;
  console.log("textForSearching ", textForSearching);
  xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");

  let data = {
    txt: textForSearching,
  };

  xhr.onloadend = function (e) {
    if (xhr.status === 200) {
      const result = JSON.parse(xhr.responseText);
      // reponse show as result lists...
      createResultList(result);
    } else {
      console.log("error");
    }
  };

  xhr.send(JSON.stringify(data));
}

searching.addEventListener("click", function () {
  searchSong();
});

// ========================create search result list============================
function createResultList(result) {
  // hide no result
  document.querySelector("#no-result").className = "close";

  // remove origin table if exist
  let element = document.querySelector("#no-result");
  if (element.parentNode.childElementCount > 1) {
    element.nextElementSibling.remove();
  }

  //create new table
  let tablearea = document.getElementById("search-result");
  let table = document.createElement("table");
  table.setAttribute("class", "add-song-table");

  let header = ["Title", "Artist", "Album", ""];

  // create 6 rows: first row: header, 5 rows: results
  for (let j = 0; j < 6; j++) {
    let tr = document.createElement("tr");
    //header row
    if (j == 0) {
      for (let i = 0; i < 4; i++) {
        tr.appendChild(document.createElement("td"));
        tr.cells[i].appendChild(document.createTextNode(header[i]));
      }
    } else {
      // result row
      // create 4 cols: title, artist, album, add button
      for (let i = 0; i < 4; i++) {
        // if not last col
        if (i != 3) {
          tr.appendChild(document.createElement("td"));
          let fillingTxt;
          switch (i) {
            case 0: // title
              fillingTxt = result[j - 1].name;
              break;
            case 1: // artist
              fillingTxt = "";
              let len = Object.keys(result[j - 1].album.artists).length;
              for (let k = 0; k < len; k++) {
                fillingTxt = fillingTxt.concat(
                  result[j - 1].album.artists[k].name
                );
                if (k != len - 1) {
                  // if not the last artist
                  fillingTxt = fillingTxt.concat(", ");
                }
              }
              break;
            case 2: // album
              fillingTxt = result[j - 1].album.name;
              break;
          }

          tr.cells[i].appendChild(document.createTextNode(fillingTxt));
          // set duration as our tr's id
          if (i == 0) {
            let songDuration = result[j - 1].duration_ms;
            songDuration = convertmins(songDuration);
            tr.setAttribute("id", songDuration);
          }
        } else {
          //last col as button
          let but = document.createElement("but");

          but.setAttribute("id", result[j - 1].uri);
          but.setAttribute("class", "add-song");
          tr.appendChild(but);
          tr.cells[i - 1].nextElementSibling.appendChild(
            document.createTextNode("Add")
          );
        }
      }
    }
    table.appendChild(tr);
  }

  tablearea.appendChild(table);
  // add event listener for add button
  addSongBut();
}

//=========================update song to play list=====================
let intervalID = window.setInterval(updateSongPlayList, 5000);

function updateSongPlayList() {
  let xhr = new XMLHttpRequest();

  xhr.open("GET", "/getPlayList");

  xhr.onloadend = function (e) {
    if (xhr.status === 200) {
      let playList = JSON.parse(xhr.responseText);
      //create new table and remove the old table if exist
      let songlistArea = document.getElementById("list-of-song-to-play");
      if (songlistArea.hasChildNodes()) {
        songlistArea.firstChild.remove();
      }
      let table = document.createElement("table");

      let playlistLen = Object.keys(playList.tracks.items).length;

      //loop over playlist row
      for (let i = 0; i < playlistLen; i++) {
        let div = document.createElement("div");
        div.setAttribute("class", "play-music");
        div.setAttribute("id", playList.tracks.items[i].track.uri);
        
        let tr1 = document.createElement("tr");
        let tr2 = document.createElement("tr");
        div.appendChild(tr1);
        div.appendChild(tr2);
        
        // filling title, artist, album, duration
        //title
        let td = document.createElement("td");
        tr1.appendChild(td);
        td.className = "playlist-title";
        td.textContent = playList.tracks.items[i].track.name;
        //artist
        td = document.createElement("td");
        tr2.appendChild(td);
        let fillingTxt = "";
        let artistNum = Object.keys(
          playList.tracks.items[i].track.album.artists
        ).length;
        for (let k = 0; k < artistNum; k++) {
          fillingTxt = fillingTxt.concat(
            playList.tracks.items[i].track.album.artists[k].name
          );
          if (k != artistNum - 1) {
            // if not the last artist
            fillingTxt = fillingTxt.concat(", ");
          }
        }
        td.textContent = fillingTxt;

        //duration
        td = document.createElement("td");
        tr1.appendChild(td);
        td.textContent = convertmins(
          playList.tracks.items[i].track.duration_ms
        );
        
        table.appendChild(div);
      }
      songlistArea.appendChild(table);
      playMusicBut();
    } else {
      console.log("error");
      return "error";
    }
  };
  xhr.send();
}

// ========================play song button/switch song============================
let ms;
function playMusicBut() {
  document.querySelectorAll(".play-music").forEach((item) => {
    item.addEventListener("click", (event) => {
      let xmlhttp = new XMLHttpRequest();

      currentOffset = track.indexOf(event.target.parentNode.parentNode.id);
      let data = {
        txt: event.target.parentNode.parentNode.id,
      };
      xmlhttp.open("POST", "/play"); 
      xmlhttp.setRequestHeader("Content-Type","application/json;charset=UTF-8");

      xmlhttp.onloadend = function (e) {
        if (e) {
          console.log("error");
        } 
        console.log("success");
        stopProgress();
        ms = xmlhttp.responseText;
        displayProgress(); // progress bar
        // // TODO: current playing song
        // let currSong = document.createElement("div"); 
        // currSong.setAttribute("class", "current");
        // document.getElementsByClassName("left")[0].value = null;  // clear prev song
        // document.getElementsByClassName("left")[0].appendChild(currSong);
        // currSong.textContent = event.target.parentNode.previousElementSibling.firstChild.textContent;
      };
      xmlhttp.send(JSON.stringify(data));
    });
  });
}


// ========================song progress bar============================

let duration;
let stop;
function displayProgress() {
  let t = 0;

  // set duration in --:--
  //https://stackoverflow.com/questions/21294302/converting-milliseconds-to-minutes-and-seconds-with-javascript
  duration = convertmins(ms);
  //set progress in --:--
  document.getElementById("duration-time").textContent = duration;
  stop = setInterval(function () {
    t = t + 1000;
    let progress = convertmins(t);
    document.getElementById("progress-time").textContent = progress;

    if (t > duration) {
      stopProgress();
    } else if (currentOffset === undefined) {
      t = 0;
    }
    let width = (t / ms) * 100;
    document.getElementById("my-bar").style.width = width.toString() + "%";
  }, 1000);
}

function stopProgress() {
  clearInterval(stop);
}

function convertmins(ms) {
  let m = Math.floor(ms / 60000);
  let s = Math.floor((ms % 60000) / 1000);
  if (s < 10) s = "0" + s;
  let t = m + ":" + s;
  return t;
}


// ========================check current song============================
function checkcurrent() { // guest: check current song info
  let xmlhttp = new XMLHttpRequest();
  xmlhttp.open("GET", "/current");

  xmlhttp.addEventListener("load", function () {
    if (xmlhttp.status == 200) {
      let checkPlaying = xmlhttp.responseText; // get the respond

      if (checkPlaying != "error") {
        let object = JSON.parse(checkPlaying);
        let trackSync = object.txt;
        let currTime = object.progress;
        currentPlaySong(trackSync, currTime);
      }
      
    } else {
      console.log("Error fetching space.dispaly");
      console.log(xmlhttp.responseText);
    }
  });

  xmlhttp.send();
}

function currentPlaySong(track, progress) { // guest: play the song in sync
  let xmlhttp = new XMLHttpRequest();
  xmlhttp.open("POST", "/play");
  let data = {
    txt: track,
    progress: progress,
  };

  xmlhttp.onloadend = function (e) {
    if (e) {
      console.log("error");
    } else {
      // Get the server's response to the upload
      ms = xmlhttp.responseText;
      stopProgress();
      displayProgress();
    }
  };

  xmlhttp.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
  xmlhttp.send(JSON.stringify(data));
}
