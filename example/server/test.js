const FFmpegClient = require('./audio.js');

let options = {
    'channel_id': "1",
    "url": "rtsp://admin:Admin123@10.61.185.18:554/Streaming/Channels/1",
    "audio_port": 1211,
    "ffmpeg_path": "/usr/bin/ffmpeg",
    "acodec": "pcm"
}
let ffmpegClient = new FFmpegClient(options);
ffmpegClient.ffmpegTurnOnCmd();

ffmpegClient.on('audio_rtp_packet', data => {
    console.log(data);
    data = data.slice(12, );
    console.log("data:++++++++++++", data);
    console.log("length:", data.length);
})





