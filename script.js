async function getsongs() {
    const a = await fetch("http://127.0.0.1:5500/songs/");
    const response = await a.text();

    const div = document.createElement("div");
    div.innerHTML = response;

    const as = div.getElementsByTagName("a");
    const songs = [];

    for (let i = 0; i < as.length; i++) {
        const element = as[i];
        if (element.href.endsWith(".mp3")) {
            songs.push(element.href.split("/songs/")[1])
        }
    }

    return songs;
}

async function main() {
    const songs = await getsongs();
    console.log(songs);

    
let songUL = document.querySelector(".songlist").getElementsByTagName("ul")[0];

for (const song of songs) {
    let cleanSong = song
        .replace(".mp3", "")
        .replaceAll("_", " ")
        .replaceAll("-", " ")
        .replace(/\(mp3\.pm\)/g, "")
        .replaceAll("%20", " ")
        .trim();

    songUL.innerHTML += `
        <li>
            <img class="invert" src="music.svg" alt="">

            <div class="info">
                <div>${cleanSong}</div>
                <div>Unknown Artist</div>
            </div>

            <div class="playnow">
                <span>Play Now</span>
                <img class="invert" src="play.svg" alt="">
            </div>
        </li>`;
}

    
    Audio.addEventListener("loadeddata",()=>{
     console.log(Audio.duration,Audio.currentSrc ,Audio.currentTime,)
    });

}

main();