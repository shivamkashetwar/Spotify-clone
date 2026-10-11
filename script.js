
async function getsongs() {
    const response = await fetch("http://127.0.0.1:5500/songs/");
    const text = await response.text();

    const div = document.createElement("div");
    div.innerHTML = text;

    const links = div.getElementsByTagName("a");
    const songs = [];

    for (let i = 0; i < links.length; i++) {
        const link = links[i];

        if (link.href.toLowerCase().endsWith(".mp3")) {
            songs.push(link.href.split("/songs/")[1]);
        }
    }

    return songs;
}

const audio = new Audio();
const play = document.querySelector("#play");

function playmusic(track) {
    audio.src = "/songs/" + track;

    audio.play()
        .then(() => {
            if (play) play.src = "paused.svg";
        })
        .catch(error => {
            console.error("Playback failed:", error);
        });

        document.querySelector(".songinfo").innerHTML=track
        document.querySelector(".songtime").innerHTML="00:00 / 00:00"
}

audio.addEventListener("loadeddata", () => {
    console.log(
        "Duration:", audio.duration,
        "Source:", audio.currentSrc,
        "Current time:", audio.currentTime
    );
});

audio.addEventListener("ended", () => {
    if (play) play.src = "play.svg";
});

async function main() {
    try {
        const songs = await getsongs();
        console.log(songs);

        const songUL = document.querySelector(".songlist ul");

        if (!songUL) {
            console.error("Song list element not found.");
            return;
        }

        songUL.innerHTML = "";

        songs.forEach((song, index) => {
            const cleanSong = decodeURIComponent(song)
                .replace(/\.mp3$/i, "")
                .replaceAll("_", " ")
                .replaceAll("-", " ")
                .trim();

            const li = document.createElement("li");

            li.innerHTML = `
                <img class="invert" src="music.svg" alt="Music">

                <div class="info">
                    <div></div>
                    <div>Unknown Artist</div>
                </div>

                <div class="playnow">
                    <span>Play Now</span>
                    <img class="invert" src="play.svg" alt="Play">
                </div>
            `;

            li.querySelector(".info div").textContent = cleanSong;

            li.addEventListener("click", () => {
                console.log("Playing:", songs[index]);
                playmusic(songs[index]);
            });

            songUL.appendChild(li);
        });

        if (play) {
            play.addEventListener("click", () => {
                if (audio.paused) {
                    audio.play()
                        .then(() => {
                            play.src = "paused.svg";
                        })
                        .catch(error => {
                            console.error("Playback failed:", error);
                        });
                } else {
                    audio.pause();
                    play.src = "play.svg";
                }
            });
        }
    } catch (error) {
        console.error("Error loading songs:", error);
    }
}

main();
