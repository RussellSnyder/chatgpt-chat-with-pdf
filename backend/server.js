//import modules: express, dotenv
const express = require("express");
const dotenv = require("dotenv");
var cors = require("cors");
const app = express();
const OpenAI = require("openai");
const generateRandomTableName = require("./PDF_utils/generateRandomTableName");
const createEmbeddings = require("./PDF_utils/createEmbeddings");

const { EventEmitter } = require("events");

app.use(cors());
//accept json data in requests
app.use(express.json());

//setup environment variables
dotenv.config();

//build openai instance using OpenAIApi
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Create an EventEmitter for sending stream data
const completionEmitter = new EventEmitter();

const { encode } = require("gpt-3-encoder");

const calculateTokens = (text) => encode(text).length;

function splitSentence(sentence, maxChunkSize) {
  const sentenceChunks = [];

  let partialChunk = "";

  const words = sentence.split(" ");

  words.forEach((word) => {
    if (calculateTokens(partialChunk + word) < maxChunkSize) {
      partialChunk += word + " ";
    } else {
      chunks.push(partialChunk.trim());
      partialChunk = word + " ";
    }
  });

  if (partialChunk.length > 0) {
    sentenceChunks.push(partialChunk.trim());
  }

  return sentenceChunks;
}

function splitTextIntoChunks(text, maxChunkSize) {
  const chunks = [];

  let currentChunk = "";

  const sentences = text.split(".");

  sentences.forEach((sentence) => {
    if (calculateTokens(currentChunk) > maxChunkSize) {
      const sentenceChunks = splitSentence(currentChunk, 4000);
      chunks.push(...sentenceChunks);
    }

    if (calculateTokens(currentChunk + sentence) < maxChunkSize) {
      currentChunk += sentence + ".";
    } else {
      chunks.push(currentChunk.trim());
      currentChunk = sentence + ".";
    }
  });

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

const summarizeChunk = async (chunk, maxWords) => {
  let condition = "";
  if (maxWords) {
    condition = ` in about ${maxWords} words`;
  }

  const message = {
    role: "user",
    content: `Please summarize the following text ${condition}:\n"""${chunk}"""\n\nSummary:`,
  };
  const prompt = `Please summarize the following text${condition}:\n"""${chunk}"""\n\nSummary:`;

  // console.log({ message });
  console.log("I start");
  const request = {
    model: "gpt-3.5-turbo",
    messages: [message],
    // prompt,
    // temperature: 1,
    max_tokens: 4000,
    // top_p: 1,
    // frequency_penalty: 0,
    // presence_penalty: 0,
  };
  try {
    const response = await openai.chat.completions.create(request);

    // console.log({ response });
    console.log("I complete");

    return response.choices[0].message.content;
    // return response.data.choices[0].text;
  } catch (error) {
    if (error instanceof OpenAI.APIError) {
      console.error(error.status); // e.g. 401
      console.error(error.message); // e.g. The authentication token you passed was invalid...
      console.error(error.code); // e.g. 'invalid_api_key'
      console.error(error.type); // e.g. 'invalid_request_error'
    } else {
      // Non-API error
      console.log(error);
    }
    throw new Error(error);
  }
};

// Create a delay function to not overwhelm the ChatGPT API
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const summariseChunks = async (chunks, maxWords) => {
  // const summarisedChunks = [];

  // for await (const chunk of chunks) {
  //   await delay(200);
  //   const result = await summarizeChunk(chunk, maxWords);
  //   summarisedChunks.push(result);
  // }
  const summarisedChunks = await Promise.all(
    chunks.map(async (chunk, i) => {
      await delay(200);
      const result = await summarizeChunk(chunk, maxWords);
      console.log(`Chunk ${i + 1} sumarized`);
      return result;
    })
  );

  // Concatenating the summarization results into a single string
  const concatenatedText = summarisedChunks.join(" ");

  // Returning the concatenated summarization text
  return concatenatedText;
};
//build the runCompletion which sends a request to the OPENAI Completion API
async function startCompletionStream(prompt) {
  const response = await openai.createCompletion(
    {
      model: "gpt-3.5-turbo-instruct",
      prompt: prompt,
      temperature: 1,
      max_tokens: 4000,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
      stream: true,
    },
    {
      responseType: "stream",
    }
  );

  response.data.on("data", (data) => {
    const message = data
      .toString()
      .replace(/^data: /, "")
      .trim();

    if (message.startsWith("data")) {
      // console.error("message should not start with 'data'");
    }

    if (message !== "[DONE]") {
      completionEmitter.emit("data", message);
    } else {
      completionEmitter.emit("done"); // Notify that the stream is done
    }
  });
}

const multer = require("multer");
const path = require("path");
const { PDFExtract } = require("pdf.js-extract");

const dest = path.join(__dirname, "pdfsummary");
const upload = multer({ dest });
const type = upload.single("pdf");

// app.post("/api/pdfsummary", type, async (req, res) => {
//   try {
//     const { maxWords } = req.body;
//     const pdfFile = req.file;

//     const pdfExtract = new PDFExtract();

//     const extractOptions = {
//       firstPage: 1,
//       lastPage: undefined,
//       password: "",
//       verbosity: -1,
//       normalizeWhitespace: false,
//       disableCombineTextItems: false,
//     };

//     console.log(pdfFile.path);
//     const data = await pdfExtract.extract(pdfFile.path, extractOptions);

//     const pdfText = data.pages
//       .map((page) => page.content.map((item) => item.str).join(" "))
//       .join(" ");

//     if (pdfText.length === 0) {
//       res.json({ error: "Text could not be extracted from the pdf" });
//     }

//     // const chunks = splitTextIntoChunks(pdfText, MAX_TOKENS);
//     // const tokens = chunks.map((chunk) => encode(chunk).length);

//     // return res.json({ chunks, tokens });

//     let summarisedText = pdfText;

//     const MAX_TOKENS = 1000;

//     while (calculateTokens(summarisedText) > MAX_TOKENS) {
//       const newChunks = splitTextIntoChunks(summarisedText, MAX_TOKENS);
//       summarisedText = await summariseChunks(newChunks, maxWords || 200);
//     }

//     summarisedText = await summarizeChunk(summarisedText, maxWords || 200);

//     res.json({ summarisedText });

//     // res.json({ file: req.file, body: req.body });
//   } catch (e) {
//     console.error(e);
//   }
// });

const dest2 = path.join(__dirname, "chatwithpdf");
const upload2 = multer({ dest: dest2 });
const type2 = upload2.single("pdf");

app.post("/api/chatwithpdf", type2, async (req, res) => {
  try {
    const pdfFile = req.file;

    const pdfExtract = new PDFExtract();

    const extractOptions = {
      firstPage: 1,
      lastPage: undefined,
      password: "",
      verbosity: -1,
      normalizeWhitespace: false,
      disableCombineTextItems: false,
    };

    const data = await pdfExtract.extract(pdfFile.path, extractOptions);

    const pdfText = data.pages
      .map((page) => page.content.map((item) => item.str).join(" "))
      .join(" ");

    if (pdfText.length === 0) {
      res.json({ error: "Text could not be extracted from the pdf" });
    }

    // Split pdf into chunks
    const chunks = splitTextIntoChunks(pdfText, 512);

    // generate a random table name of 10 characters
    const tableName = generateRandomTableName();

    // calculate embeddings of the chunks and store them inside a table
    await createEmbeddings(chunks, tableName);

    // Return a JSON response with the table name and original name of hte pdf file
    res.json({ tableName, fileName: pdfFile.originalname });
  } catch (e) {
    console.error(e);
  }
});

app.post("/api/chatwithPDF2", async (req, res) => {
  try {
    const { text, tableName } = req.body;

    console.log({ text, tableName });
    async function runCompletion2(text, context) {
      // console.log(context);
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo-16k",
        messages: [
          {
            role: "system",
            content: `Answer questions based on information included in the provided context. If the information is not available in the provided context, answer saying that the information is not available in the PDF document. Here is the context: ###${context}###`,
          },
          { role: "user", content: text },
        ],
        temperature: 1,
        max_tokens: 200,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
      });
      return response;
    }

    //get embedding of text
    const getEmbedding = require("./PDF_utils/getEmbedding");
    const embedding = await getEmbedding(text);

    //get embeddings from the tableName table
    const getEmbeddings = require("./PDF_utils/getEmbeddings");
    const embeddings = await getEmbeddings(tableName);

    //find nearest neighbors
    const findNearestNeighbors = require("./PDF_utils/findNearestNeighbors.js");
    const nearestNeighbors = findNearestNeighbors({
      embedding,
      embeddings,
      k: 3,
    });

    //build the context
    const contextArray = [];
    nearestNeighbors.forEach((neighbor, index) => {
      contextArray.push(`abstract ${index + 1}: """${neighbor?.text || ""}"""`);
    });

    const context = contextArray.join(" ");

    // Pass the request text and context to the runCompletion function
    const completion = await runCompletion2(text, context);

    console.log({ completion });
    // Return the completion as a JSON response
    res.json({ data: completion });
  } catch (error) {
    console.error("An error occurred", error);
    res.status(500).json({
      error: {
        message: "An error occurred during your request.",
      },
    });
  }
});
//post request to /api/chatgpt
app.post("/api/chatgpt", async (req, res) => {
  try {
    //extract the text from the request body
    const { text } = req.body;

    // Pass the request text to the runCompletion function
    startCompletionStream(text);

    const dataListener = (data) => {
      res.write(data);
    };

    const doneListener = () => {
      res.write('{"event": "done"}');
      res.end();
      // delete the listeners
      completionEmitter.off("data", dataListener);
      completionEmitter.off("done", doneListener);
    };
    // Listen to events from the completionEmitter
    completionEmitter.on("data", dataListener);
    completionEmitter.on("done", doneListener);
  } catch (error) {
    //handle the error in the catch statement
    if (error.response) {
      console.error(error.response.status, error.response.data);
      res.status(error.response.status).json(error.response.data);
    } else {
      console.error("Error with OPENAI API request:", error.message);
      res.status(500).json({
        error: {
          message: "An error occured during your request.",
        },
      });
    }
  }
});

//set the PORT
const PORT = process.env.SERVER_PORT || 5001;

//start the server on the chosen PORT
app.listen(PORT, console.log(`Server started on port ${PORT}`));
