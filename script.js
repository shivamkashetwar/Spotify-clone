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
            songs.push(element.href);
        }
    }

    return songs;
}

async function main() {
    const songs = await getsongs();
    console.log(songs);

    var audio=new audio(songs[0]);
    audio.play()
   
    audio.addEventListener("loadeddata",()=>{
     console.log(audio.duration,audio.currentSrc ,audio.currentTime,)
    });

}

main();