const e = require("cors");

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

function setUpSocketEvents(){
    socket.on("join-approved", (userId, hostId) => {
        console.log("Join approved by host", hostId);
        if(userId !== myUserId) return;
        socket.emit("join-room", roomId, myUserId, "user");
        setupScreen.classList.add("hidden");
        callScreen.classList.remove("hidden");
        activeRoomDisplay.textContent = roomId;
        createPeerConnections();
        createAndSendOffer(hostId);
    });
    socket.on("user-request-join",(userId, hostId) => {
        if(isRoomHost){
            console.log("User requesting to join", userId);
            createJoinRequest(userId, roomId);
        }
    });
    socket.on("user-connected", userId =>{
        console.log("user-connected", userId);
        if(userId === myUserId)return;
        if(isRoomHost){
            console.log("Host waiting for offer from new user", userId);
            currentRemoteUserId = userId;
            if(!localPeerConnections){
                createPeerConnections();
            }
        }
    });
    socket.on("ice-candidate", (senderUserId, candidate) => {
        console.log("Received ICE candidate from", senderUserId);
        if(senderUserId === myUserId) return;
        handleReceivedIceCandidate(senderUserId, candidate);
    });
    socket.on("offer", (senderUserId, targetId, offer) => {
        console.log("Received offer from", senderUserId, "for", targetId);
        if( targetId !== myUserId && targetId !== undefined) return;
        if(senderUserId === myUserId) return;
        handleReceivedOffer(senderUserId, offer);  
    });

    socket.on("answer", (senderUserId, targetId, answer) => {
        console.log("Received answer from", senderUserId, "for", targetId);
        if( targetId !== myUserId && targetId !== undefined) return;
        if(senderUserId === myUserId) return;
        handleReceivedAnswer(senderUserId, answer);   
    });
    socket.on("join-rejected", (reason) => {
        alert("Join request rejected: " + (reason || "Host rejected your request"));
        window.location.reload();
    });

    socket.on("user-disconnected", (userId) => {
        console.log("User disconnected:", userId);
        if(currentRemoteUserId === userId && remoteVideo.srcObject){
            remoteVideo.srcObject.getTracks().forEach(track => track.stop());
            remoteVideo.srcObject = null;
            currentRemoteUserId = null;
        }
        if(localPeerConnections){
            localPeerConnections.close();
            localPeerConnections = null;
        }
    });
}

function createPeerConnections(){
    if(localPeerConnections){
        console.log("Peer connections already exist");
        localPeerConnections.close();
        localPeerConnections = null;
    }
    console.log("Creating new RTCPeerConnection");
    localPeerConnections = new RTCPeerConnection(iceServers);
    myStream.getTracks().forEach(track => {
        localPeerConnections.addTrack(track, myStream);
    });
    localPeerConnections.onicecandidate = (event) => {
        if(event.candidate){
            console.log("Sending ICE candidate to remote peer");
            socket.emit("relay-ice-candidate", roomId, myUserId, currentRemoteUserId, event.candidate);
        }
    };
    localPeerConnections.onconnectionstatechange = (event) => {
        console.log("Connection state change:", localPeerConnections.connectionState);
        if(localPeerConnections.connectionState === "connected"){
            console.log("Connection established. Audio enabled:", audioEnabled);
            console.log("Audio track enabled:",myStream.getAudioTracks().map(track => ({
                enabled: track.enable,
                muted: track.muted,
                id: track.id
            })));
        }
    };
    localPeerConnections.ontrack = (event) => {
        console.log("Received remote track");
        if(event.streams && event.streams[0]){
            remoteVideo.srcObject = event.streams[0];
            event.streams[0].getTracks().forEach(track =>{
                track.enabled = true;
            });
            remoteVideo.play().catch(e => console.error("Error playing remote video:", e));
        }
    };
    return localPeerConnections;
}

async function createAndSendOffer(targetUserId){
    
    try{
        if(!localPeerConnections){
            createPeerConnections();
        }
        currentRemoteUserId = targetUserId;
        const offer = await localPeerConnections.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true
        });
        await localPeerConnections.setLocalDescription(offer);
        socket.emit("relay-offer", roomId, myUserId, targetUserId, offer
        );
        console.log("Sending offer to", targetUserId);
    }  
    catch(error){
        console.error("Error creating offer:", error);
    }   
}


