import React, { Fragment, useState, useEffect, useRef } from "react";
import {
  Header,
  Icon,
  Input,
  Grid,
  Segment,
  Button,
  Loader,
  GridRow,
} from "semantic-ui-react";
import SweetAlert from "react-bootstrap-sweetalert";
import { format } from "date-fns";
import "./App.css";
import UsersList from "./UserList";
import MessageBox from "./MessageBox";

const configuration = {
  iceServers: [{ url: "stun:stun.1.google.com:19302" }],
};
const Chat = ({ connection, updateConnection, channel, updateChannel }) => {
  const [socketOpen, setSocketOpen] = useState(false);
  const [socketMessages, setSocketMessages] = useState([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [name, setName] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [users, setUsers] = useState([]);
  const [connectedTo, setConnectedTo] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [alert, setAlert] = useState(null);
  const connectedRef = useRef();
  const webSocket = useRef(null);
  const [message, setMessage] = useState("");
  const messagesRef = useRef({});
  const [messages, setMessages] = useState({});
  useEffect(() => {
    webSocket.current = new WebSocket("ws://localhost:9000"); // for local ws://localhost:9000 for cloud wss://smessage3311.herokuapp.com"
    webSocket.current.onmessage = message => {
      const data = JSON.parse(message.data);
      setSocketMessages(prev => [...prev, data]);
    };
    webSocket.current.onclose = () => {
      webSocket.current.close();
    };
    return () => webSocket.current.close();
  }, []);
  useEffect(() => {
    let data = socketMessages.pop();
    if (data) {
      switch (data.type) {
        case "connect":
          setSocketOpen(true);
          break;
        case "login":
          onLogin(data);
          break;
        case "updateUsers":
          updateUsersList(data);
          break;
        case "removeUser":
          removeUser(data);
          break;
        case "offer":
          onOffer(data);
          break;
        case "answer":
          onAnswer(data);
          break;
        case "candidate":
          onCandidate(data);
          break;
        default:
          break;
      }
    }
  }, [socketMessages]);
  const closeAlert = () => {
    setAlert(null);
  };
  const send = data => {
    webSocket.current.send(JSON.stringify(data));
  };
  const handleLogin = () => {
    setLoggingIn(true);
    send({
      type: "login",
      name,
    });
  };
  const updateUsersList = ({ user }) => {
    setUsers(prev => [...prev, user]);
  };
  const removeUser = ({ user }) => {
    setUsers(prev => prev.filter(u => u.userName !== user.userName));
  };
  const handleDataChannelMessageReceived = ({ data }) => {
    const message = JSON.parse(data);
    const { name: user } = message;
    let messages = messagesRef.current;
    let userMessages = messages[user];
    if (userMessages) {
      userMessages = [...userMessages, message];
      let newMessages = Object.assign({}, messages, { [user]: userMessages });
      messagesRef.current = newMessages;
      setMessages(newMessages);
    } else {
      let newMessages = Object.assign({}, messages, { [user]: [message] });
      messagesRef.current = newMessages;
      setMessages(newMessages);
    }
  };
  const onLogin = ({ success, message, users: loggedIn }) => {
    setLoggingIn(false);
    if (success) {
      setAlert(
        <SweetAlert
          success
          title="Success!"
          onConfirm={closeAlert}
          onCancel={closeAlert}
        >
          Logged in successfully!
        </SweetAlert>
      );
      setIsLoggedIn(true);
      setUsers(loggedIn);
      let localConnection = new RTCPeerConnection(configuration);
      //when the browser finds an ice candidate we send it to another peer
      localConnection.onicecandidate = ({ candidate }) => {
        let connectedTo = connectedRef.current;
        if (candidate && !!connectedTo) {
          send({
            name: connectedTo,
            type: "candidate",
            candidate,
          });
        }
      };
      localConnection.ondatachannel = event => {
        let receiveChannel = event.channel;
        receiveChannel.onopen = () => {
          console.log("Data channel is open and ready to be used.");
        };
        receiveChannel.onmessage = handleDataChannelMessageReceived;
        updateChannel(receiveChannel);
      };
      updateConnection(localConnection);
    } else {
      setAlert(
        <SweetAlert
          warning
          confirmBtnBsStyle="danger"
          title="Failed"
          onConfirm={closeAlert}
          onCancel={closeAlert}
        >
          {message}
        </SweetAlert>
      );
    }
  };
  const onOffer = ({ offer, name }) => {
    setConnectedTo(name);
    connectedRef.current = name;
    connection
      .setRemoteDescription(new RTCSessionDescription(offer))
      .then(() => connection.createAnswer())
      .then(answer => connection.setLocalDescription(answer))
      .then(() =>
        send({ type: "answer", answer: connection.localDescription, name })
      )
      .catch(e => {
        console.log({ e });
        setAlert(
          <SweetAlert
            warning
            confirmBtnBsStyle="danger"
            title="Failed"
            onConfirm={closeAlert}
            onCancel={closeAlert}
          >
            An error has occurred.
          </SweetAlert>
        );
      });
  };
  const onAnswer = ({ answer }) => {
    connection.setRemoteDescription(new RTCSessionDescription(answer));
  };
  const onCandidate = ({ candidate }) => {
    connection.addIceCandidate(new RTCIceCandidate(candidate));
  };
  const sendMsg = () => {
    const time = format(new Date(), "yyyy-MM-dd'T'HH:mm:ss.SSSxxx");
    let text = { time, message, name };
    let messages = messagesRef.current;
    let connectedTo = connectedRef.current;
    let userMessages = messages[connectedTo];
    if (messages[connectedTo]) {
      userMessages = [...userMessages, text];
      let newMessages = Object.assign({}, messages, {
        [connectedTo]: userMessages,
      });
      messagesRef.current = newMessages;
      setMessages(newMessages);
    } else {
      userMessages = Object.assign({}, messages, { [connectedTo]: [text] });
      messagesRef.current = userMessages;
      setMessages(userMessages);
    }
    channel.send(JSON.stringify(text));
    setMessage("");
  };
  const handleConnection = name => {
    let dataChannel = connection.createDataChannel("messenger");
    dataChannel.onerror = error => {
      setAlert(
        <SweetAlert
          warning
          confirmBtnBsStyle="danger"
          title="Failed"
          onConfirm={closeAlert}
          onCancel={closeAlert}
        >
          An error has occurred.
        </SweetAlert>
      );
    };
    dataChannel.onmessage = handleDataChannelMessageReceived;
    updateChannel(dataChannel);
    connection
      .createOffer()
      .then(offer => connection.setLocalDescription(offer))
      .then(() =>
        send({ type: "offer", offer: connection.localDescription, name })
      )
      .catch(e =>
        setAlert(
          <SweetAlert
            warning
            confirmBtnBsStyle="danger"
            title="Failed"
            onConfirm={closeAlert}
            onCancel={closeAlert}
          >
            An error has occurred.
          </SweetAlert>
        )
      );
  };
  const toggleConnection = userName => {
    if (connectedRef.current === userName) {
      setConnecting(true);
      setConnectedTo("");
      connectedRef.current = "";
      setConnecting(false);
    } else {
      setConnecting(true);
      setConnectedTo(userName);
      connectedRef.current = userName;
      handleConnection(userName);
      setConnecting(false);
    }
  };
  return (
    <div className="App">
      {alert}
      <div className="dchat">
        <Header as="h2" icon>
          <Icon name="comments " />
          Decentralized Chat
        </Header>
      </div>
      {(socketOpen && (
        <Fragment>
          <body>
            <div class="wrapper">
              <div class="one">
                {(!isLoggedIn && (
                  <Input
                    fluid
                    disabled={loggingIn}
                    type="text"
                    onChange={e => setName(e.target.value)}
                    placeholder="Username"
                    action
                  >
                    <input />
                    <Button
                      inverted
                      animated
                      color="blue"
                      disabled={!name || loggingIn}
                      onClick={handleLogin}
                    >
                      <div class="visible content">
                        <h5>Login</h5>
                      </div>
                      <div class="hidden content">
                        <i class="right arrow icon"></i>
                      </div>
                    </Button>
                  </Input>
                )) || (
                  <Segment raised textAlign="center" color="blue">
                    Logged In as: {name}
                  </Segment>
                )}{" "}
              </div>
              <div class="three">
                <UsersList
                  users={users}
                  toggleConnection={toggleConnection}
                  connectedTo={connectedTo}
                  connection={connecting}
                />
              </div>
              <div class="two">
                <MessageBox
                  messages={messages}
                  connectedTo={connectedTo}
                  message={message}
                  setMessage={setMessage}
                  sendMsg={sendMsg}
                  name={name}
                />
              </div>
            </div>
          </body>
        </Fragment>
      )) || (
        <Loader size="massive" active inline="centered">
          Loading
        </Loader>
      )}
    </div>
  );
};
export default Chat;
