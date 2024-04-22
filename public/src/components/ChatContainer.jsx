import React, { useState, useEffect, useRef } from "react";
import styled from "styled-components";
import ChatInput from "./ChatInput";
import Logout from "./Logout";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";
import { sendMessageRoute, recieveMessageRoute } from "../utils/APIRoutes";
import { ToastContainer, toast } from "react-toastify";

const toastOptions = {
  position: "bottom-left",
  autoClose: 2000,
  pauseOnHover: true,
  draggable: true,
  theme: "light",
};

export default function ChatContainer({ currentChat, socket }) {
  const [messages, setMessages] = useState([]);
  const scrollRef = useRef();
  const [startApiCalls, setStartApiCalls] = useState(false);
  const [arrivalMessage, setArrivalMessage] = useState(null);
  const apiCallTimerRef = useRef(null);

  const currentUser = JSON.parse(
      localStorage.getItem(process.env.REACT_APP_LOCALHOST_KEY)
  );

  useEffect(async () => {
    const data = await JSON.parse(
      localStorage.getItem(process.env.REACT_APP_LOCALHOST_KEY)
    );
    const response = await axios.post(recieveMessageRoute, {
      from: data._id,
      to: currentChat._id,
    });
    setMessages(response.data);
  }, [currentChat]);

  useEffect(() => {
    const getCurrentChat = async () => {
      if (currentChat) {
        await JSON.parse(
          localStorage.getItem(process.env.REACT_APP_LOCALHOST_KEY)
        )._id;
      }
    };
    getCurrentChat();
  }, [currentChat]);

  const handleSendMsg = async (msg) => {
    const data = await JSON.parse(
      localStorage.getItem(process.env.REACT_APP_LOCALHOST_KEY)
    );
    socket.current.emit("send-msg", {
      to: currentChat._id,
      from: data._id,
      msg,
    });
    await axios.post(sendMessageRoute, {
      from: data._id,
      to: currentChat._id,
      message: msg,
    });

    const msgs = [...messages];
    msgs.push({ fromSelf: true, message: msg });
    setMessages(msgs);
  };

  useEffect(() => {
    if (socket.current) {
      socket.current.on("msg-recieve", (msg) => {
        setArrivalMessage({ fromSelf: false, message: msg });
      });
    }
  }, []);

  useEffect(() => {
    arrivalMessage && setMessages((prev) => [...prev, arrivalMessage]);
  }, [arrivalMessage]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchTopics = async (transcripts) => {
    try {
      const response = await fetch('http://localhost:8000/getTopic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: transcripts })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      const newTopic = [...new Set(data.data.map(el => el.prediction))];
      console.log('Topics fetched:', newTopic);

      return newTopic;
    } catch (error) {
      console.error('Failed to fetch data:', error);
      return []; // Return an empty array or appropriate error indicator
    }
  };

  function initApiCalls() {
    if (!startApiCalls) {
      apiCallTimerRef.current = setTimeout(async () => {
        setStartApiCalls(true);
        console.log(messages);
        if (messages.length > 0) {
          const last5messages = messages.filter(el => !el.fromSelf).slice(-5).map(el => el.message);

          const topics = await fetchTopics(last5messages);
          topics.map(topic => toast.success(topic, toastOptions))
          initApiCalls(); // Recursively call to continue the sequence
        } else {
          if (apiCallTimerRef.current) {
            clearTimeout(apiCallTimerRef.current);
            apiCallTimerRef.current = null;
          }
          setStartApiCalls(false);
        }
      }, 5000);
    } else {
      if (apiCallTimerRef.current) {
        clearTimeout(apiCallTimerRef.current);
        apiCallTimerRef.current = null;
      }
      setStartApiCalls(false);
    }
  }

  return (
    <Container>
      <div className="chat-header">
        <div className="user-details">
          <div className="avatar">
            <img
              src={`data:image/svg+xml;base64,${currentChat.avatarImage}`}
              alt=""
            />
          </div>
          <div className="username">
            <h3>{currentChat.username}</h3>
          </div>
        </div>
        <div className="actions">

          {currentUser.username === 'fa' && (<div>
            <Button onClick={initApiCalls}>
              {!startApiCalls ? 'Start Detecting Topics' : 'Stop Detecting Topics'}
            </Button>
          </div>)}

          <div>
            <Logout/>
          </div>
        </div>
      </div>
      <div className="chat-messages">
        {messages.map((message) => {
          return (
            <div ref={scrollRef} key={uuidv4()}>
              <div
                className={`message ${
                  message.fromSelf ? "sended" : "recieved"
                }`}
              >
                <div className="content ">
                  <p>{message.message}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <ChatInput handleSendMsg={handleSendMsg} />
      <ToastContainer />
    </Container>

  );
}

const Container = styled.div`
  display: grid;
  grid-template-rows: 10% 80% 10%;
  gap: 0.1rem;
  overflow: hidden;
  @media screen and (min-width: 720px) and (max-width: 1080px) {
    grid-template-rows: 15% 70% 15%;
  }
  .chat-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 2rem;
    .user-details {
      display: flex;
      align-items: center;
      gap: 1rem;
      .avatar {
        img {
          height: 3rem;
        }
      }
      .username {
        h3 {
          color: white;
        }
      }
    }
    .actions {
      display: flex; 
      justify-content: space-between; 
      align-content: center; 
      align-items: center;
      div {
        padding: 0 4px;
      }
    }
  }
  .chat-messages {
    padding: 1rem 2rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    overflow: auto;
    &::-webkit-scrollbar {
      width: 0.2rem;
      &-thumb {
        background-color: #ffffff39;
        width: 0.1rem;
        border-radius: 1rem;
      }
    }
    .message {
      display: flex;
      align-items: center;
      .content {
        max-width: 40%;
        overflow-wrap: break-word;
        padding: 1rem;
        font-size: 1.1rem;
        border-radius: 1rem;
        color: #d1d1d1;
        @media screen and (min-width: 720px) and (max-width: 1080px) {
          max-width: 70%;
        }
      }
    }
    .sended {
      justify-content: flex-end;
      .content {
        background-color: #4f04ff21;
      }
    }
    .recieved {
      justify-content: flex-start;
      .content {
        background-color: #9900ff20;
      }
    }
  }
`;

const Button = styled.button`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0.5rem;
  border-radius: 0.5rem;
  background-color: #9a86f3;
  border: none;
  cursor: pointer;
  svg {
    font-size: 1.3rem;
    color: #ebe7ff;
  }
`;