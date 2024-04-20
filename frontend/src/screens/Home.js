import axios from "axios";
import React, { useEffect, useState } from "react";
import "./home.css";

const instance = axios.create({
  baseURL: "http://localhost:5001",
  timeout: 1000000,
  headers: { "X-Custom-Header": "foobar" },
});

const MESSAGES_INITIAL_STATE = [
  { role: "system", content: "You are an assistant" },
];

const Home = () => {
  const [error, setError] = useState("");
  const [result, setResult] = useState("");
  const [tableName, setTableName] = useState("");
  const [fileName, setFileName] = useState("");
  const [jresult, setJresult] = useState("");
  const [selectedFile, setSelectedFile] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoading2, setIsLoading2] = useState(false);
  const [messages, setMessages] = useState(MESSAGES_INITIAL_STATE);
  const [inputMessage, setInputMessage] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();

    setMessages(MESSAGES_INITIAL_STATE);
    setIsLoading(true);

    try {
      const formData = new FormData();
      console.log({ selectedFile });
      formData.append("pdf", selectedFile);
      console.log({ formData });

      const response = await instance.post("/api/chatwithpdf", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      console.log(response.data);
      if (response.data.error) {
        setError(response.data.error);
        return;
      }
      setError("");

      setJresult(JSON.stringify(response.data, null, 2));

      setTableName(response.data.tableName);
      setFileName(response.data.fileName);
    } catch (error) {
      console.log(error);
      setResult("");
      setError("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitPrompt = async (event) => {
    event.preventDefault();
    setInputMessage("");
    // only send a request is there is a user message
    if (inputMessage.trim() !== "") {
      try {
        // add the user message to the message array
        const updatedMessages = [
          ...messages,
          { role: "user", content: inputMessage },
        ];
        setMessages(updatedMessages);
        setIsLoading2(true);

        const response = await axios.post("api/chatwithPDF2", {
          text: inputMessage,
          tableName,
        });
        const serverResponse = response.data;

        console.log({ serverResponse });
        // Add the server ersponse ot the messags array
        const updatedMessages2 = [
          ...updatedMessages,
          {
            role: "assistant",
            content: serverResponse.data.choices[0].message.content,
          },
        ];

        setMessages(updatedMessages2);

        setJresult(JSON.stringify(updatedMessages2, null, 2));
      } catch (error) {
        console.log(error);
        setError("Something went wrong");
      } finally {
        setIsLoading2(false);
      }
    }
  };

  useEffect(() => {
    const chatContainer = document.getElementById("chat-container");
    if (!chatContainer) return;
    const scrollOptions = {
      top: chatContainer.scrollHeight,
      behavior: "smooth",
    };
    chatContainer.scrollTo(scrollOptions);
  }, [messages.length]);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    setSelectedFile(file);
  };

  return (
    <div>
      <div className="container d-flex flex-column" style={{ height: "100vh" }}>
        <div className="hero d-flex align-items-center justify-content-center text-center flex-column p-3">
          <h1 className="display-4">Talk to Your PDFs.</h1>
          <p className="lead">
            Creak the Boundaries: Discover a New Dimension of Interaction!
          </p>
          <form className="w-100" onSubmit={handleSubmit}>
            <input
              name="pdf"
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
            />
            <div className="form-group row">
              <button
                type="submit"
                className="btn btn-primary custom-button mt-3"
                disabled={!selectedFile || isLoading}
              >
                {isLoading ? "Analyzing PDF..." : `Upload PDF`}
              </button>
            </div>
          </form>
        </div>
        {error && <div className="alert alert-danger mt-3">{error}</div>}
        {/* {result && <div className="alert alert-success mt-3">{result}</div>} */}
        {tableName && (
          <>
            <h2 className="mt-3">Ask me anything about {fileName}</h2>
            <div className="flex-fill">
              <div className="flex-fill chat-container" id="chat-container">
                <ul className="list-group">
                  {messages &&
                    messages
                      .filter(({ role }) => role !== "system")
                      .map(({ role, content }, index) => (
                        <li
                          key={index}
                          className={`py-4 m-2 list-group-item list-group-item-${
                            role === "user" ? "info" : "success"
                          }`}
                        >
                          {content}
                        </li>
                      ))}
                </ul>
              </div>
            </div>
            <form
              className="form-horizontal mb-3 ml-1 container-fluid"
              onSubmit={handleSubmitPrompt}
            >
              <div className="row form-group mt-2">
                <div className="col-sm-11">
                  <div className="form-floating">
                    <input
                      className="form-control custom-input"
                      id="floatingInput"
                      placeholder="Enter a prompt"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                    />
                    <label htmlFor="floatingInput">input</label>
                  </div>
                </div>
                <div className="col-sm-1">
                  <button
                    className="btn btn-primary custom-button"
                    type="submit"
                  >
                    {isLoading2 ? "Thinking..." : `Submit`}
                  </button>
                </div>
              </div>
            </form>
          </>
        )}
      </div>
      {jresult && (
        <pre className="alert alert-info mt-3">
          <code>{jresult}</code>
        </pre>
      )}
    </div>
  );
};

export default Home;
