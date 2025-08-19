import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

export const handler = async (event) => {
    // Add debug logging
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
                    error: `Unsupported method "\${httpMethod}"`,
                    event: JSON.stringify(event)  // Include event for debugging
                })
            };
        }

        // Parse the request body
        const requestData = typeof event.body === 'string' 
            ? JSON.parse(event.body) 
            : event.body;

        const {
            userId,
            firstName,
            lastName,
            email,
            phoneNumber = 'N/A',
            company = 'N/A',
            occupation = 'N/A',
        } = requestData || {};

        if (!email) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Email is required' })
            };
        }

        const ses = new SESClient({ region: 'us-east-1' });

        const emailParams = {
            Source: 'info@mylg.studio',
            Destination: { ToAddresses: ['info@mylg.studio'] },
            Message: {
                Subject: { Data: 'New User Registration Notification' },
                Body: {
                    Text: {
                        Data: `A new user has registered:

User ID: ${userId}
Name: ${firstName} ${lastName}
Email: ${email}
Phone: ${phoneNumber}
Company: ${company}
Occupation: ${occupation}

Full Payload:
${JSON.stringify(requestData, null, 2)}`,
                    },
                },
            },
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
                event: JSON.stringify(event)  // Include event for debugging
            })
        };
    }
};