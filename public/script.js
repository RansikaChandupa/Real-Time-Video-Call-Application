const socket = io();
const startCallBtn = document.getElementById('startCall');
const joinCallBtn = document.getElementById('joinCall');
const roomIdInput = document.getElementById('roomId');
const roomNumberDisplay = document.getElementById('roomNumber');
const activeRoomDisplay = document.getElementById('activeRoomNumber');
const generatedIdDisplay = document.getElementById('generatedId');
const setupScreen = document.querySelector('.setup-screen');
const callScreen = document.querySelector('.call-screen');
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const muteAudioBtn = document.getElementById('muteAudio');
const muteVideoBtn = document.getElementById('muteVideo');
const joinRequestContainer =  document.getElementById('joinRequests');

let localPeerConnections;
let myStream;
let roomId;
let myUserId;
let isRoomHost = false;
let audioEnabled = true;
let videoEnabled = true;
let currentRemoteUserId = null;

const iceServers = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        {urls: "stun:stun1.l.google.com:19302"},
        {urls: "stun:stun2.l.google.com:19302"}
    ]
};

startCallBtn.onclick = async () => {
    roomId = generateRoomId();
    isRoomHost = true;
    myUserId = generateUserId();
    startCall(roomId);
}

async function startCall(roomId){
    try{
        myStream = await navigator.mediaDevices.getUserMedia({video:true, audio:true});
        myStream.getAudioTracks().forEach(track => {
            track.enabled = true;
        });
        audioEnabled = true;
        if(muteAudioBtn){
            muteAudioBtn.textContent = "Mute Audio"
            muteAudioBtn.classList.remove("muted");
        }
        localVideo.srcObject = myStream;
        localVideo.muted = true;
        localVideo.play();
        console.log("Audio track enabled:",myStream.getAudioTracks().map(track => track.enabled));

    }
    catch(error){
        console.error("Failed to get media streams:", error);
        alert("Could not access camera or microphone. Please check your permission");
        return;
    }
    if(isRoomHost){
        socket.emit("join-room", roomId, myUserId, "host");
        activeRoomDisplay.textContent = roomId;
        roomNumberDisplay.textContent = roomId;
        setupScreen.classList.add("hidden");
        callScreen.classList.remove("hidden");
        generatedIdDisplay.classList.remove("hidden");
    }
    else{
        socket.emit("request-join", roomId, myUserId);
        document.querySelector('.setup-screen').innerHTML = "<h2>Waiting for host approval...</h2>"
    }
    setUpSocketEvents();
}




