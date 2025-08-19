import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

export const handler = async (event) => {
    // Debug logging
    console.log('Event:', JSON.stringify(event, null, 2));

    // Define CORS headers
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'OPTIONS, POST',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    };

    // Safely get the HTTP method
    const httpMethod = event.httpMethod || event.requestContext?.http?.method || 'POST';
    console.log('HTTP Method:', httpMethod);

    // Handle OPTIONS request
    if (httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    try {
        if (httpMethod !== 'POST') {
            return {
                statusCode: 405,
                headers,
                body: JSON.stringify({ 
                    error: `Unsupported method "${httpMethod}"`,
                    event: JSON.stringify(event) // Include event for debugging
                })
            };
        }

        // Parse the request body
        const requestData = typeof event.body === 'string' 
            ? JSON.parse(event.body) 
            : event.body;

        const {
            projectId,
            projectName,
            budget,
            finishline,
            description,
            location,
            address,
            userName,
        } = requestData || {};

        if (!projectId || !projectName || !userName) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Project ID, Project Name, and User Name are required' })
            };
        }

        const ses = new SESClient({ region: 'us-east-1' });

        const emailParams = {
            Source: 'info@mylg.studio',
            Destination: { ToAddresses: ['info@mylg.studio'] },
            Message: {
                Subject: { Data: `New Project Created: ${projectName}` },
                Body: {
                    Html: { // Use HTML format for better presentation
                        Data: `
                        <html>
                        <body>
                            <h1>New Project Created</h1>
                            <p><strong>Project Name:</strong> ${projectName}</p>
                            <p><strong>Project ID:</strong> ${projectId}</p>
                            <p><strong>Budget:</strong> $${budget || 'N/A'}</p>
                            <p><strong>Finishline:</strong> ${finishline || 'N/A'}</p>
                            <p><strong>Description:</strong> ${description || 'N/A'}</p>
                            <p><strong>Location:</strong> ${location?.lat || 'N/A'}, ${location?.lng || 'N/A'}</p>
                            <p><strong>Address:</strong> ${address || 'N/A'}</p>
                            <p><strong>Created By:</strong> ${userName}</p>
                            <h2>Payload</h2>
                            <pre>${JSON.stringify(requestData, null, 2)}</pre>
                        </body>
                        </html>
                        `
                    }
                }
            }
        };

        await ses.send(new SendEmailCommand(emailParams));
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ message: 'Notification sent successfully' })
        };

    } catch (err) {
        console.error('Error:', err);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Internal server error',
                details: err.message,
                event: JSON.stringify(event) // Include event for debugging
            })
        };
    }
};
