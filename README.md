
-----

# Real-Time Video Call Application

A real-time, one-on-one video call application built with modern web technologies. This project features a secure authentication system, a host-controlled room approval process, and direct peer-to-peer video/audio streaming using WebRTC.

## \#\# Features

  * **Secure User Authentication**: Complete login and sign-up functionality powered by Supabase.
  * **Host-Controlled Meetings**: Users can start a new meeting to become a host and generate a unique meeting ID.
  * **Join Request System**: Participants can request to join a meeting using the ID, which the host can then approve or deny.
  * **Peer-to-Peer Video/Audio**: Direct, low-latency video and audio streaming between two users using WebRTC.
  * **In-Call Controls**: Functionality to mute/unmute both video and audio streams during a call.
  * **Tab-Specific Sessions**: Users can log into different accounts in different browser tabs for easy testing, using `sessionStorage` for session management.
  * **Clipboard Integration**: Easily copy the meeting ID to the clipboard for sharing.

-----

## \#\# Technology Stack

This project utilizes a modern web stack to achieve real-time communication:

  * **Backend**: Node.js, Express.js
  * **Real-time Signaling**: Socket.IO
  * **Peer-to-Peer Communication**: WebRTC (using native browser APIs)
  * **Authentication**: Supabase
  * **Frontend**: HTML5, CSS3, Vanilla JavaScript

-----

## \#\# Project Structure

The project is organized into a client-side `public` directory and a server-side entry point.

```
project/
├── server.js         # Backend entry point - handles routes & Socket.IO logic
├── public/           # Static files served to the browser
│   ├── index.html    # Main application page for authenticated users
│   ├── login.html    # Login and sign-up page
│   ├── auth.js       # Handles all Supabase authentication logic
│   ├── script.js     # Core frontend logic for the video call
│   └── style.css     # Global styles for all pages
├── .env              # Environment variables (Supabase keys)
└── package.json      # Project dependencies and scripts
```

-----

## \#\# Setup and Installation

To run this project locally, follow these steps:

1.  **Prerequisites**

      * Node.js and npm installed on your machine.
      * A Supabase account to get your API URL and Key.

2.  **Clone the Repository**

    ```bash
    git clone <your-repository-url>
    cd <repository-name>
    ```

3.  **Install Dependencies**
    Install the required backend dependencies using npm.

    ```bash
    npm install
    ```

4.  **Set Up Environment Variables**
    Create a file named `.env` in the root of your project and add your Supabase credentials:

    ```env
    # .env file
    SUPABASE_URL=YOUR_SUPABASE_URL
    SUPABASE_KEY=YOUR_SUPABASE_ANON_KEY
    ```

5.  **Run the Server**
    Start the backend server.

    ```bash
    node server.js
    ```

6.  **Access the Application**
    Open your browser and navigate to `http://localhost:3000`. You will be directed to the login page.

-----

## \#\# How It Works

The application relies on a signaling server to coordinate the connection between two peers before they connect directly.

1.  **Authentication**: `auth.js` communicates with Supabase to manage user sessions. The server provides the necessary API keys to the client securely.
2.  **Signaling**: The host creates a room, and a joiner requests access. The Node.js server, using Socket.IO, manages the room state and relays messages between the two users.
3.  **WebRTC Handshake**: Once a join request is approved, the handshake process begins:
      * The **joiner** creates an **Offer** and sends it to the host via the signaling server.
      * The **host** receives the offer, creates an **Answer**, and sends it back.
      * Both peers exchange network information (**ICE Candidates**) until they find a path to connect.
4.  **Direct Connection**: Once the handshake is complete, a direct peer-to-peer `RTCPeerConnection` is established, and video/audio streams flow between the users without passing through the server.

-----

## \#\# Future Improvements

  * **Multi-Party Calls**: Refactor the current one-on-one logic to support group calls with multiple participants.
  * **Text Chat**: Implement a real-time text chat feature within the call using Socket.IO.
  * **Screen Sharing**: Add the ability for users to share their screen using the `getDisplayMedia` API.
  * **TURN Server Integration**: Add a TURN server to the WebRTC configuration to improve connection reliability for users behind restrictive firewalls.
