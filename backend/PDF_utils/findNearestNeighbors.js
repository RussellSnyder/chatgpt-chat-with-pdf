const cosineSimilarity = require("./cosineSimilarity");

const findNearestNeighbors = ({ embedding, embeddings, k }) => {
  const similarities = embeddings.map((item) => {
    const similarity = cosineSimilarity(embedding, JSON.parse(item.embedding));
    return {
      similarity,
      text: item.text,
    };
  });

  similarities.sort((a, b) => b.similarity - a.similarity);

  const nearestNeighbors = similarities.slice(0, k);

  return nearestNeighbors;
};

module.exports = findNearestNeighbors;
