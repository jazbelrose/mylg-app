import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

export const handler = async (event) => {
    console.log('Event:', JSON.stringify(event, null, 2));

    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'OPTIONS, POST',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    const httpMethod = event.httpMethod || event.requestContext?.http?.method || 'POST';

    if (httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: '',
        };
    }

    if (httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({
                error: `Unsupported method "${httpMethod}"`,
            }),
        };
    }

    try {
        // Parse the request body
        const requestData = typeof event.body === 'string' 
            ? JSON.parse(event.body) 
            : event.body;

        const { email } = requestData || {};

        if (!email) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Email is required' }),
            };
        }

        const ses = new SESClient({ region: 'us-east-1' });

        const emailParams = {
            Source: 'info@mylg.studio', // Replace with your verified SES email
            Destination: { ToAddresses: ['info@mylg.studio'] }, // Your email to receive notifications
            Message: {
                Subject: { Data: 'New Newsletter Subscription' },
                Body: {
                    Text: {
                        Data: `You have a new subscriber:

Email: ${email}

Enjoy growing your subscriber base!`,
                    },
                },
            },
        };

        await ses.send(new SendEmailCommand(emailParams));

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ message: 'Subscription notification sent successfully!' }),
        };
    } catch (err) {
        console.error('Error:', err);

        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Internal server error',
                details: err.message,
            }),
        };
    }
};
