window.initializeApp = function(user) {
    const usernameElement = document.getElementById('username');
    if (usernameElement && user) {
        const username = user.user_metadata?.username || user.email;
        usernameElement.textContent = `Logged in as ${username}`;
    }

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
    const joinRequestContainer = document.getElementById('joinRequests');

    let localPeerConnection;
    let myStream;
    let roomId;
    let myUserId;
    let isRoomHost = false;
    let audioEnabled = true;
    let videoEnabled = true;
    let currentRemoteUserId = null;

    const iceServers = {
        iceServers: [{
            urls: "stun:stun.l.google.com:19302"
        }, {
            urls: "stun:stun1.l.google.com:19302"
        }, {
            urls: "stun:stun2.l.google.com:19302"
        }]
    };

    startCallBtn.onclick = async () => {
        myUserId = generateUserId();
        isRoomHost = true;
        await startCall();
    };
    joinCallBtn.onclick = async () => {
        myUserId = generateUserId();
        isRoomHost = false;
        await startCall();
    };

    async function startCall() {
        try {
            myStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            localVideo.srcObject = myStream;
        } catch (error) {
            console.error("Failed to get media streams:", error);
            alert("Could not access camera or microphone.");
            return;
        }

        if (isRoomHost) {
            roomId = generateRoomId();
            socket.emit("join-room", roomId, myUserId, "host");
        } else {
            roomId = roomIdInput.value.trim();
            if (!roomId) return alert("Please enter a valid Room ID");
            socket.emit("request-join", roomId, myUserId);
            document.querySelector('.setup-screen > .join-form').innerHTML = "<h2>Waiting for host approval...</h2>";
        }
        
        setupScreen.classList.add("hidden");
        callScreen.classList.remove("hidden");
        activeRoomDisplay.textContent = roomId;
        if (isRoomHost) {
            roomNumberDisplay.textContent = roomId;
            generatedIdDisplay.classList.remove("hidden");
        }

        setUpSocketEvents();
    }

    function setUpSocketEvents() {
        socket.on("join-approved", (userId, hostId) => {
            if (userId !== myUserId) return;
            console.log("Join approved by host", hostId);
            socket.emit("join-room", roomId, myUserId, "user");
            createPeerConnection(hostId);
            createAndSendOffer(hostId);
        });

        socket.on("user-request-join", (userId) => {
            if (isRoomHost) {
                createJoinRequest(userId);
            }
        });

        
        socket.on("user-connected", userId => {
            console.log("User connected event received for:", userId);
        });

        socket.on("ice-candidate", (senderUserId, targetId, candidate) => {
            if (targetId !== myUserId || !localPeerConnection) return;
            localPeerConnection.addIceCandidate(new RTCIceCandidate(candidate))
                .catch(e => console.error("Error adding received ICE candidate", e));
        });

        socket.on("offer", (senderUserId, targetId, offer) => {
            if (targetId !== myUserId) return;
            console.log("Received offer from", senderUserId);
            createPeerConnection(senderUserId);
            handleReceivedOffer(senderUserId, offer);
        });

        socket.on("answer", (senderUserId, targetId, answer) => {
            if (targetId !== myUserId) return;
            console.log("Received answer from", senderUserId);
            handleReceivedAnswer(senderUserId, answer);
        });

        socket.on("join-rejected", (userId, reason) => {
            if (userId !== myUserId) return;
            alert("Join request rejected: " + reason);
            window.location.reload();
        });

        socket.on("user-disconnected", (userId) => {
            if (currentRemoteUserId === userId) {
                console.log("Remote user disconnected:", userId);
                closeConnection();
            }
        });
    }

    function createPeerConnection(remoteUserId) {
        if (localPeerConnection) {
            console.warn("Existing peer connection found, closing it before creating a new one.");
            closeConnection();
        }
        console.log(`Creating peer connection to ${remoteUserId}`);
        currentRemoteUserId = remoteUserId;
        localPeerConnection = new RTCPeerConnection(iceServers);

        myStream.getTracks().forEach(track => {
            localPeerConnection.addTrack(track, myStream);
        });

        localPeerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit("relay-ice-candidate", roomId, myUserId, currentRemoteUserId, event.candidate);
            }
        };

        localPeerConnection.ontrack = (event) => {
            console.log("Remote track received");
            remoteVideo.srcObject = event.streams[0];
        };

        localPeerConnection.onconnectionstatechange = () => {
            console.log(`Connection state with ${currentRemoteUserId}: ${localPeerConnection.connectionState}`);
            if (['disconnected', 'failed', 'closed'].includes(localPeerConnection.connectionState)) {
                closeConnection();
            }
        };
    }

    async function createAndSendOffer(targetUserId) {
        try {
            const offer = await localPeerConnection.createOffer();
            await localPeerConnection.setLocalDescription(offer);
            socket.emit("relay-offer", roomId, myUserId, targetUserId, offer);
        } catch (error) {
            console.error("Error creating offer:", error);
        }
    }

    async function handleReceivedOffer(senderUserId, offer) {
        try {
            await localPeerConnection.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await localPeerConnection.createAnswer();
            await localPeerConnection.setLocalDescription(answer);
            socket.emit("relay-answer", roomId, myUserId, senderUserId, answer);
        } catch (error) {
            console.error("Error handling offer:", error);
        }
    }

    async function handleReceivedAnswer(senderUserId, answer) {
        try {
            await localPeerConnection.setRemoteDescription(new RTCSessionDescription(answer));
        } catch (error) {
            console.error("Error handling answer:", error);
        }
    }

    function closeConnection() {
        if (localPeerConnection) {
            localPeerConnection.close();
            localPeerConnection = null;
        }
        remoteVideo.srcObject = null;
        currentRemoteUserId = null;
        console.log("Connection has been closed.");
    }
    
    function createJoinRequest(userId) {
        const requestDiv = document.createElement("div");
        requestDiv.className = "join-request";
        requestDiv.id = `request-${userId}`;
        requestDiv.innerHTML = `<p>User is requesting to join</p><div class="request-buttons"><button class="accept-btn">Accept</button><button class="reject-btn">Reject</button></div>`;
        joinRequestContainer.appendChild(requestDiv);
        requestDiv.querySelector(".accept-btn").onclick = () => {
            socket.emit("approve-join", roomId, userId);
            requestDiv.remove();
        };
        requestDiv.querySelector(".reject-btn").onclick = () => {
            socket.emit("reject-join", roomId, userId, "Host rejected");
            requestDiv.remove();
        };
    }

    function generateRoomId() { return Math.random().toString(36).substring(2, 12); }
    function generateUserId() { return "user_" + Math.random().toString(36).substring(2, 10); }

    window.copyRoomId = function() {
        const textToCopy = document.getElementById("activeRoomNumber").textContent;
        navigator.clipboard.writeText(textToCopy).then(() => alert("Room ID copied!"));
    };

    muteAudioBtn.addEventListener("click", () => {
        audioEnabled = !audioEnabled;
        myStream.getAudioTracks().forEach(track => track.enabled = audioEnabled);
        muteAudioBtn.textContent = audioEnabled ? "Mute Audio" : "Unmute Audio";
        muteAudioBtn.classList.toggle("muted", !audioEnabled);
    });

    muteVideoBtn.addEventListener("click", () => {
        videoEnabled = !videoEnabled;
        myStream.getVideoTracks().forEach(track => track.enabled = videoEnabled);
        muteVideoBtn.textContent = videoEnabled ? "Mute Video" : "Unmute Video";
        muteVideoBtn.classList.toggle("muted", !videoEnabled);
    });
};