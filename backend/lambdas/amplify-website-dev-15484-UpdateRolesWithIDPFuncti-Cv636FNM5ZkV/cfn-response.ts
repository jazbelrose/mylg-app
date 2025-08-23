import https from 'https';
import url from 'url';

export const SUCCESS = 'SUCCESS';
export const FAILED = 'FAILED';

export function send(
  event: any,
  context: any,
  responseStatus: string,
  responseData: any,
  physicalResourceId?: string,
  noEcho?: boolean
): Promise<void> {
  return new Promise((resolve, reject) => {
    const responseBody = JSON.stringify({
      Status: responseStatus,
      Reason: `See the details in CloudWatch Log Stream: ${context.logStreamName}`,
      PhysicalResourceId: physicalResourceId || context.logStreamName,
      StackId: event.StackId,
      RequestId: event.RequestId,
      LogicalResourceId: event.LogicalResourceId,
      NoEcho: noEcho || false,
      Data: responseData,
    });

    console.log('Response body:\n', responseBody);

    const parsedUrl = url.parse(event.ResponseURL);
    const options = {
      hostname: parsedUrl.hostname,
      port: 443,
      path: parsedUrl.path,
      method: 'PUT',
      headers: {
        'content-type': '',
        'content-length': responseBody.length,
      },
    };

    const request = https.request(options, (response) => {
      console.log('Status code: ' + response.statusCode);
      console.log('Status message: ' + response.statusMessage);
      resolve();
    });

    request.on('error', (error) => {
      console.log('send(..) failed executing https.request(..): ' + error);
      reject(error);
    });

    request.write(responseBody);
    request.end();
  });
}
