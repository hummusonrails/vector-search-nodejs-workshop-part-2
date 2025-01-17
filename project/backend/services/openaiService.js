import dotenv from 'dotenv';
import openai from 'openai';
import { HfInference } from '@huggingface/inference';
dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_EMBEDDING_MODEL = 'text-embedding-ada-002';
const OPENAI_COMPLETION_MODEL = 'gpt-4o-mini';
const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY;

const openaiclient = new openai.OpenAI({ apiKey: OPENAI_API_KEY });
const hfClient = new HfInference(HUGGINGFACE_API_KEY);

// Flag to determine model usage (e.g., 'openai' or 'local')
let modelPreference = 'local'; // Default to local

export function setModelPreference(pref) {
  if (['openai', 'local'].includes(pref)) {
    modelPreference = pref;
  } else {
    throw new Error('Invalid model preference. Use "openai" or "local".');
  }
}

export async function getEmbedding(query) {
  if (modelPreference === 'openai') {
    const response = await openaiclient.embeddings.create({
      model: OPENAI_EMBEDDING_MODEL,
      input: query,
    });
    return response.data[0].embedding;
  } else {
    const model = 'sentence-transformers/all-mpnet-base-v2';
    const embedding1 = await hfClient.featureExtraction({ model, inputs: query });
    const embedding2 = await hfClient.featureExtraction({ model, inputs: query });
    const combinedEmbedding = embedding1.concat(embedding2).slice(0, 1536);
    return combinedEmbedding;
  }
}

/**
 * Generates a completion based on the provided prompt using either OpenAI or Hugging Face models.
 *
 * This function determines which model to use based on the `modelPreference` variable.
 * If `modelPreference` is set to 'openai', it uses the OpenAI API to generate a completion.
 * Otherwise, it uses the Hugging Face API with the 'google/flan-t5-large' model.
 *
 * @param {string} prompt - The input prompt for generating the completion.
 * @returns {Promise<string>} - The generated completion text.
 *
 * @throws {Error} - Throws an error if the API call fails.
 *
 * @example
 * const result = await getCompletion('Tell me about the Force in Star Wars.');
 * console.log(result);
 *
 * @description
 * - If `modelPreference` is 'openai':
 *   - Uses the OpenAI client to create a chat completion.
 *   - The model used is specified by the `OPENAI_COMPLETION_MODEL` constant.
 *   - The system message sets the context as an expert on the Star Wars universe.
 *   - The user's prompt is included in the messages array.
 *   - The response is returned in plain text without markdown.
 * - If `modelPreference` is not 'openai':
 *   - Uses the Hugging Face client to generate text.
 *   - The model used is 'google/flan-t5-large'.
 *   - The response generation parameters include:
 *     - `max_new_tokens`: Maximum number of new tokens to generate (200).
 *     - `temperature`: Sampling temperature (0.7).
 *     - `top_p`: Nucleus sampling probability (0.9).
 *   - The generated text is returned.
 */
export async function getCompletion(prompt) {
  if (modelPreference === 'openai') {
    const completion = await openaiclient.chat.completions.create({
      model: OPENAI_COMPLETION_MODEL,
      messages: [
        { role: 'system', content: 'You are an expert on the Star Wars universe. Return the response in plain text, do not use markdown. Answer in an informal and casual conversational manner.' },
        { role: 'user', content: prompt },
      ],
    });
    return completion.choices[0].message.content;
  } else {
    const model = 'google/flan-t5-large';
    const response = await hfClient.textGeneration({
      model,
      inputs: prompt,
      parameters: {
        max_new_tokens: 200,
        temperature: 0.7,
        top_p: 0.9,
      },
    });
    return response.generated_text;
  }
}

/**
 * This function generates a completion stream based on the provided prompt.
 * It supports two models: 'openai' and a local model.
 * 
 * If the 'openai' model is preferred, it uses the OpenAI client to create a chat completion stream.
 * The OpenAI client sends a request to the '/chat/completions' endpoint with the specified model and messages.
 * The messages include a system message that sets the context (expert on Star Wars) and the user prompt.
 * The 'stream' option is set to true to enable streaming responses.
 * The function logs the stream and returns it.
 * 
 * If the local model is preferred, it simulates streaming by:
 * 1. Getting the full response from the local model using the `getCompletion` function.
 * 2. Splitting the response into chunks of 20 characters using the `chunkResponse` function.
 * 3. Creating an async generator function `simulatedStream` that yields each chunk with a simulated delay of 50ms.
 * The function returns the `simulatedStream` generator.
 * 
 * @param {string} prompt - The user input to generate a completion for.
 * @returns {AsyncGenerator|Stream} - A stream of completion chunks.
 */
export async function getCompletionStream(prompt) {
  if (modelPreference === 'openai') {
    const stream = await openaiclient.chat.completions.create({
      model: OPENAI_COMPLETION_MODEL,
      messages: [
        { role: 'system', content: 'You are an expert on the Star Wars universe. Return the response in plain text, do not use markdown. Answer in an informal and casual conversational manner.' },
        { role: 'user', content: prompt },
      ],
      stream: true,
    });

    console.log(stream);
    return stream;
  } else {
    // Simulate streaming for the local model
    const response = await getCompletion(prompt); // Get the full response from the local model
    const chunks = chunkResponse(response, 20); // Split the response into chunks

    async function* simulatedStream() {
      for (const chunk of chunks) {
        await new Promise((resolve) => setTimeout(resolve, 50)); // Simulate delay
        yield chunk; 
      }
    }

    return simulatedStream();
  }
}

// Helper function to split a string into smaller chunks
function chunkResponse(response, chunkSize) {
  const chunks = [];
  for (let i = 0; i < response.length; i += chunkSize) {
    const content = response.slice(i, i + chunkSize);
    chunks.push({
      choices: [
        {
          delta: {
            content,
          },
        },
      ],
    });
  }
  return chunks;
}
