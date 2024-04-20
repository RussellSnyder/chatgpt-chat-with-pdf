const dotenv = require("dotenv");
const OpenAI = require("openai");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../../.env") });

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const getEmbedding = async (text, model = "text-embedding-ada-002") => {
  const cleanedText = text.replace(/\n/g, " ");

  try {
    const response = await openai.embeddings.create({
      model,
      input: cleanedText,
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error(error);
  }
};

module.exports = getEmbedding;
