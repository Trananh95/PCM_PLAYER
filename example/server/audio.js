// const fs = require('fs');
// var readable = fs.createReadStream('data.txt');

// // Spawn a new process that will execute the pwd command
// const {spawn} =  require("child_process");
// const child = spawn("pwd");

// child.on("exit", function(code, signal){
//     console.log("child process exited with code" + `${code} and signal ${signal}`);
// });


// const {streamWrite, streamEnd, onExit} = require('@rauschma/stringio');
// const {spawn} = require('child_process');

// async function main(){
//     const sink = spawn('cat', [], 
//     {
//         stdio:['pipe', process.stdout, process.stderr]
//     }); // (A)
//     writeToWritable(sink.stdin); // (B)
//     await onExit(sink);
//     console.log('#### done');
// }
// main();

// async function writeToWritable(writable) {
//     await streamWrite(writable, 'First line\n');
//     await streamWrite(writable, 'Second line\n');
//     await streamEnd(writable);
//   }

'use strict';
var moment = require('moment');
const { EventEmitter } = require('events');
const { spawn } = require('child_process');

// const logger = require('../logger/logger');

class FFmpegClient extends EventEmitter {
    constructor(options) {
        super();

        this._channel_id = options.channel_id;
        this._rtsp_url = options.url;
        this._video_port = options.video_port;
        this._audio_port = options.audio_port;
        this._ffmpeg_path = options.ffmpeg_path;
        this._vcodec = options.vcodec || null;
        this._acodec = options.acodec || null;

        this.setRTPListener();
    }
    // 

    setRTPListener() {
        // this._dgram_video = require('dgram').createSocket('udp4');

        // this._dgram_video.on('listening', () => {
        //     let conn_info = this._dgram_video.address();
        //     if (this._video_port !== conn_info.port) {
        //         this._dgram_video.close();
        //         throw `RTP output port ${this._video_port} for channel ${this._channel_id} is busy`;
        //     }
        //     // this.ffmpegTurnOnCmd();
        // })

        // this._dgram_video.on('message', rtp_packet => {
        //     this._time_to_check_data = Date.now();
        //     this.emit('video_rtp_packet', rtp_packet);
        // })

        // this._dgram_video.on('error', err => { //ffmpegOnError
        //     // logger.error(`FFmpeg ${this._channel_id} Dgram socket video error: ${err}`);
        //     console.log(`FFmpeg ${this._channel_id} Dgram socket video error: ${err}`);
        // })

        // this._dgram_video.bind(this._video_port, '127.0.0.1');

        if (this._acodec !== null) {
            this._dgram_audio = require('dgram').createSocket('udp4');

            this._dgram_audio.on('listening', () => {
                let conn_info = this._dgram_audio.address();
                if (this._audio_port !== conn_info.port) {
                    this._dgram_audio.close();
                    throw `RTP output audio port ${this._audio_port} for channel ${this._channel_id} is busy`;
                }
                // this.ffmpegTurnOnCmd();
            })

            this._dgram_audio.on('message', rtp_packet => {
                this._time_to_check_data = Date.now();
                this.emit('audio_rtp_packet', rtp_packet);
            })

            this._dgram_audio.on('error', err => { //ffmpegOnError
                // logger.error(`FFmpeg ${this._channel_id} Dgram socket audio error: ${err}`);
                console.log(`FFmpeg ${this._channel_id} Dgram socket audio error: ${err}`);
            })

            this._dgram_audio.bind(this._audio_port, '127.0.0.1');

        }
    }

    ffmpeg_args() {
        let ffmpeg_args = [];
        ffmpeg_args.push("-loglevel", "quiet");
        ffmpeg_args.push("-hwaccel", "auto");
        ffmpeg_args.push("-fflags", "nobuffer", "-avioflags", "direct");
        if (this._rtsp_url && this._rtsp_url.match(/^rtsp:/)) {
            ffmpeg_args.push("-rtsp_transport", "tcp");
            ffmpeg_args.push("-i", this._rtsp_url, "-flags:v", "+global_header+low_delay");
        } else {
            throw `do not hava invaild source`;
        }
        // if (this._vcodec === 'h264') {
        //     ffmpeg_args.push('-vcodec', 'libx264');
        // } else if (this._vcodec === 'h265' || this._vcodec === 'hevc') {
        //     ffmpeg_args.push('-vcodec', 'libx264');
        //     ffmpeg_args.push('-g', '100');
        //     ffmpeg_args.push('-crf', '23');
        //     // ffmpeg_args.push('-tune', 'zerolatency');
        //     ffmpeg_args.push('-preset', 'ultrafast');
        //     ffmpeg_args.push('-x264opts', 'opencl');
        // } else {
        //     ffmpeg_args.push('-vcodec', 'copy');
        //     // ffmpeg_args.push('-tune', 'zerolatency');
        //     ffmpeg_args.push('-preset', 'ultrafast');
        // }
        // ffmpeg_args.push('-an');
        // ffmpeg_args.push("-f", "rtp", "-pkt_size", "64000", `rtp://127.0.0.1:${this._video_port}`);

        if (this._acodec !== null) {
            ffmpeg_args.push('-vn');
            // if (this._acodec === 'wav') {
            //     ffmpeg_args.push('-acodec', 'wav');
            // } else {
                // ffmpeg_args.push('-acodec', 'pcm_s16le', '-ac', '1', "-ar", '8k');
                ffmpeg_args.push('-acodec', 'pcm_s16le', '-ac', '1', "-ar", '8k', '-f', 's16le');
            // }
            ffmpeg_args.push("-f", "rtp", "-pkt_size", "32000", `rtp://127.0.0.1:${this._audio_port}`);
            // ffmpeg_save.push("")
        }
        return ffmpeg_args;
    }

    ffmpegOnError(err) {
        if (!this._force_kill) {
            clearTimeout(this._check_data_received);
            // logger.error(`[FFmpeg ${this._channel_id}] ${err}`);
            console.log(`[FFmpeg ${this._channel_id}] ${err}`);
            this.resetCache();
            this.emit('check_connection', { channel_id: this._channel_id });
        } else {
            // logger.dbug(`[FFmpeg ${this._channel_id}] ffmpeg kill voluntary`);
            console.log(`[FFmpeg ${this._channel_id}] ffmpeg kill voluntary`);
        }
    }

    ffmpegCheckDataReceived() {
        let current_time = Date.now();
        let delta = current_time - this._time_to_check_data;
        if (delta > 15e3) {
            return this.ffmpegOnError(`Do not receive data in ${delta}ms`);
        }

        this._check_data_received = setTimeout(this.ffmpegCheckDataReceived.bind(this), 2e4);
    }

    ffmpegTurnOnCmd() {
        // logger.info(`[FFmpeg ${this._channel_id}] ffmpeg turn on`);
        console.log(`[FFmpeg ${this._channel_id}] ffmpeg turn on`);

        let ffmpeg_args = this.ffmpeg_args();
        console.log(ffmpeg_args);
        this._ffmpeg = spawn(this._ffmpeg_path, ffmpeg_args, {
            stdio: ['ignore', 'pipe', 'inherit']
        })
        this._force_kill = false;
        // set last time get data
        this._time_to_check_data = Date.now();
        // set last time get data
        this._check_data_received = setTimeout(this.ffmpegCheckDataReceived.bind(this), 2e4);
                
        if (!this._ffmpeg.stdout) {
            throw `ffmpeg is not running`;
        }

        this._ffmpeg.on('close', (code, signal) => {
            this.ffmpegOnError(`ffmpeg got killed with code ${code} and signal ${signal}`);
        })

        this._ffmpeg.once('error', err => {
            this.ffmpegOnError(`ffmpeg process error: ${err}`);
        })


        this._ffmpeg.stdout.on('data', data => {
            let sdp_str = data.toString();
            console.log(sdp_str);
            
        })
    }

    ffmpegTurnOffCmd(close_socket = false) {
        this._force_kill = true;
        this.stopAllListeners();
        if (this._check_data_received) {
            clearTimeout(this._check_data_received);
        }
        if (close_socket && this._dgram_video) {
            this._dgram_video.close();
        }

        if (close_socket && this._dgram_audio) {
            this._dgram_audio.close();
        }

        if (this._ffmpeg) {
            this._ffmpeg.kill('SIGKILL');
            this.resetCache();
        }

        // logger.info(`[FFmpeg ${this._channel_id}] ffmpeg turn off`);
        console.log(`[FFmpeg ${this._channel_id}] ffmpeg turn off`);
    }

    stopAllListeners() {
        this.removeAllListeners('video_rtp_packet');
        this.removeAllListeners('audio_rtp_packet');
        this.removeAllListeners('check_connection');
        this.removeAllListeners('sdp_str');
    }

    resetCache() {
        if (this._ffmpeg !== null)
            this._ffmpeg.kill('SIGKILL');
        this._ffmpeg = null;
        // this._dgram_video = null;
        // this._dgram_audio = null;
    }
}

module.exports = FFmpegClient;

