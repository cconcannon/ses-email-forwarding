const AWS = require('aws-sdk-mock');

describe('Test ses-email-forwarding.handler', () => {
  it('should read and send S3 email objects', async () => {
    const objectBody = '{"Test": "PASS"}';
    const getObjectResp = {
      Body: objectBody
    };

    AWS.mock('S3', 'getObject', function (params, callback) {
      callback(null, getObjectResp);
    });

    const event = {
      Records: [
        {
          s3: {
            bucket: {
              name: "test-bucket"
            },
            object: {
              key: "test-key"
            }
          }
        }
      ]
    }

    console.info = jest.fn();
    let handler = require('../../../src/handlers/ses-email-forwarding.js');

    await handler.handler(event, null);

    expect(console.info).toHaveBeenCalledWith(objectBody);
    AWS.restore('S3');
  });
});
