import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import archiver from 'archiver';
import os from 'os';
import path from 'path';

const { createReadStream, createWriteStream } = fs;
const { tmpdir } = os;
const { join, basename } = path;

const s3Client = new S3Client({ region: 'us-west-1' });

export const handler = async (event) => {
    // Set up CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*', 
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'OPTIONS, POST',
    };
    
    // Handle OPTIONS request for CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ message: 'CORS OK' }),
        };
    }
    
    // Parse the event body to extract the fileKeys
    const requestBody = event.body ? JSON.parse(event.body) : {};
    const fileKeys = requestBody.fileKeys; // Ensure that fileKeys is correctly extracted
    if (!Array.isArray(fileKeys)) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: "fileKeys must be an array." }),
        };
    }
    
    const bucketName = 'mylguserdata194416-dev';
    const zipFileName = `zips/${Date.now()}.zip`;
    const zipFilePath = join(tmpdir(), basename(zipFileName));

    const output = createWriteStream(zipFilePath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    // Prepare for the close event of archiving process
    const closePromise = new Promise((resolve, reject) => {
        output.on('close', resolve);
        archive.on('error', reject);
    });

    archive.pipe(output);

    for (const fileKey of fileKeys) {
        try {
            const data = await s3Client.send(new GetObjectCommand({ Bucket: bucketName, Key: fileKey }));
            archive.append(data.Body, { name: fileKey.split('/').pop() });
        } catch (err) {
            // It might be useful to log the specific error here.
            console.error(`Error fetching file ${fileKey}:`, err);
            // Optionally, handle errors more gracefully than throwing immediately
            // for example, continuing with other files, or returning a partial success response
            throw err;
        }
    }

    await archive.finalize();
    await closePromise;

    const zipStream = createReadStream(zipFilePath);
    const uploadParams = { Bucket: bucketName, Key: zipFileName, Body: zipStream };
    await s3Client.send(new PutObjectCommand(uploadParams));

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ zipFileUrl: `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${zipFileName}` }),
    };
};