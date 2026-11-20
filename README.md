# Phi Slamma Jamma: Three-Point Shootout

A 60-second three-point contest in a retro early-80s arena, built for iPhone Safari (landscape) first.
Hakeem "The Dream" Olajuwon and Clyde "The Glide" Drexler as friendly cartoon caricatures.
Original team ("Slammers"), jerseys, logo and court art — no university names or logos.

- 5 racks of 5 balls around the arc, last ball of each rack is a money ball worth 2.
- Hold to rise, release in the green sweet spot of the shot meter.
- Modes: Solo (beat your best), vs CPU, Pass & Play.
- Controls: hold SHOOT (or anywhere on screen), Space/Enter, or gamepad A. Esc/P/Start pauses.

## Build
    python3 tools/process_art.py   # chroma-key art_src/*_raw.jpg -> art/
    python3 tools/web_art.py       # shrink art/ -> art_web/ for the single file
    python3 tools/build.py         # -> index.html (Three.js r160 + art inlined as base64)
    python3 tools/qa.py chromium   # headless screenshots at 844x390, 932x430, 667x375

Source lives in src/ (template.html, style.css, 00_util / 10_audio / 20_input / 30_game .js).
All scene art is painted (image generation, chroma-keyed); only UI (meter, buttons, scoreboard) is code. Music and SFX are original WebAudio.
