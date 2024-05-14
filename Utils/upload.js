const { sanitizeBlobName } = require("../Utils/sanitizeBlob");
const { BlobServiceClient } = require("@azure/storage-blob");


// Upload image to Azure Blob Storage
module.exports.uploadImage = async (containerName, file) => {
  try {
    //Azure
    const connectionString = process.env.AZURE_CONNECTION_STRING;

    const blobServiceClient =
      BlobServiceClient.fromConnectionString(connectionString);
    const containerClient = blobServiceClient.getContainerClient(
      containerName
    );

    // Generate a unique blob name for the uploaded image
    const blobName = `${Date.now()}_${sanitizeBlobName(file.originalname)}`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    // Upload the image to Azure Blob Storage
    await blockBlobClient.upload(file.buffer, file.buffer.length);

    //Response
    return {
      url: blockBlobClient.url,
    };
  } catch (error) {
    return { errors: error };
  }
};