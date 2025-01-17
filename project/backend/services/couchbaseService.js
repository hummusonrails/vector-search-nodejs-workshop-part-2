import { connect, Cluster, SearchRequest, VectorSearch, VectorQuery } from 'couchbase'
import dotenv from 'dotenv'
dotenv.config()

/**
 * Destructures environment variables for Couchbase configuration.
 * 
 * The following environment variables are expected:
 * - `COUCHBASE_CONNECTION_STRING`: The connection string for Couchbase Capella.
 * - `COUCHBASE_USERNAME`: The username for authenticating with Couchbase.
 * - `COUCHBASE_PASSWORD`: The password for authenticating with Couchbase.
 * - `COUCHBASE_BUCKET_NAME`: The name of the Couchbase bucket to use.
 * - `COUCHBASE_SEARCH_INDEX_NAME`: The name of the Couchbase search index to use.
 * 
 * These variables are used to configure the connection to a Couchbase database.
 */
const {
  COUCHBASE_CONNECTION_STRING,
  COUCHBASE_USERNAME,
  COUCHBASE_PASSWORD,
  COUCHBASE_BUCKET_NAME,
  COUCHBASE_SEARCH_INDEX_NAME
} = process.env

let cluster, bucket

/**
 * Initializes a connection to a Couchbase cluster if it hasn't been established yet.
 * 
 * This function checks if the `cluster` variable is already defined. If not, it establishes a connection
 * to the Couchbase cluster using the provided connection string, username, and password. It also sets the
 * configuration profile to 'wanDevelopment' to optimize for wide area network environments. Once connected,
 * it assigns the connected cluster to the `cluster` variable and retrieves the specified bucket, assigning
 * it to the `bucket` variable. A message indicating a successful connection is logged to the console.
 * 
 * @returns {Promise<{cluster: Object, bucket: Object}>} An object containing the connected Couchbase cluster and bucket.
 */
async function initCouchbase() {
  if (!cluster) {
    cluster = await connect(COUCHBASE_CONNECTION_STRING, {
      username: COUCHBASE_USERNAME,
      password: COUCHBASE_PASSWORD,
      configProfile: 'wanDevelopment',
    })
    bucket = cluster.bucket(COUCHBASE_BUCKET_NAME)

    console.log('Connected to Couchbase')
  }
  return { cluster, bucket }
}

export async function getRelevantDocumentIds(embedding) {
  const { cluster } = await initCouchbase()
  const scope = cluster.bucket(COUCHBASE_BUCKET_NAME).scope('_default');
  
  /**
   * Creates a search request using a vector query.
   *
   * This performs the following steps:
   * 1. `VectorQuery.create('_default.embedding', embedding)`: Creates a vector query object with the specified field '_default.embedding' and the provided embedding vector.
   * 2. `.numCandidates(3)`: Sets the number of candidate results to 3 for the vector query.
   * 3. `VectorSearch.fromVectorQuery(...)`: Converts the vector query into a vector search object.
   * 4. `SearchRequest.create(...)`: Creates a search request object using the vector search object.
   *
   * @param {Array<number>} embedding - The embedding vector used for the vector query.
   * @returns {SearchRequest} The search request object created from the vector query.
   */

  // Create a search request using a vector query
  // Start with SearchRequest.create(... and pass in the VectorSearch object invoking the fromVectorQuery method
  // Continue by passing in the VectorQuery object invoking the create method with the field '_default.embedding' and the embedding vector)
  // Finally, decide from a user experience how many "candidates" to return (e.g., 3) by using the numCandidates method
  // The Couchbase SDK contains an example you can use at https://docs.couchbase.com/nodejs-sdk/current/howtos/full-text-searching-with-sdk.html#single-vector-query.
  let request = // Write your code here

  const result = await scope.search(COUCHBASE_SEARCH_INDEX_NAME, request);

  console.log(`Result: ${JSON.stringify(result)}`);

  return result.rows.map(row => {
    return {
        id: row.id,
        score: row.score
    };
  });
}

/**
 * Retrieves relevant documents from Couchbase based on the provided embedding.
 *
 * This function initializes a connection to Couchbase, retrieves document IDs and their relevance scores
 * based on the provided embedding, fetches the corresponding documents from the database, removes the 
 * embedding from the document content, and returns the documents along with their scores.
 *
 * @param {Array<number>} embedding - The embedding vector used to find relevant documents.
 * @returns {Promise<Array<{content: Object, score: number}>>} A promise that resolves to an array of objects,
 * each containing the document content (with the embedding removed) and its relevance score.
 *
 * @throws Will throw an error if there is an issue initializing Couchbase or fetching documents.
 */
export async function getRelevantDocuments(embedding) {
    const { cluster } = await initCouchbase();
    const bucket = cluster.bucket(COUCHBASE_BUCKET_NAME);
    const collection = bucket.defaultCollection();

    const storedEmbeddings = await getRelevantDocumentIds(embedding);
  
    const results = await Promise.all(
      storedEmbeddings.map(async ({ id, score }) => {
        try {
          const result = await collection.get(id);
          const content = result.content;
          
          // Remove embedding from content
          if (content && content._default && content._default.embedding) {
            delete content._default.embedding;
          }
  
          return {
            content: content,
            score: score 
          };
        } catch (err) {
          console.error(`Error fetching document with ID ${id}:`, err);
          return null;
        }
      })
    );
  
    return results.filter(doc => doc !== null); 
}
