const AWS = require('aws-sdk');

const simpleParser = require('mailparser').simpleParser;
const s3 = new AWS.S3();
const ses = new AWS.SES({apiVersion: '2010-12-01'});

exports.handler = async (event, context) => {
  try {
    const object = event.Records[0].s3.object.key;
    const bucket = event.Records[0].s3.bucket.name;

    const file = await s3.getObject({Bucket: bucket, Key: object}).promise();
    const parsed = await simpleParser(file.Body);

    const forwardingParams = {
      Destination: {
        ToAddresses: [process.env.FORWARD_ADDRESS]
      }, 
      Message: {
        Body: {
          Html: {
            Charset: "UTF-8",
            Data: parsed.html
          },
          Text: {
            Charset: "UTF-8",
            Data: parsed.text
          }
        },
        Subject: {
          Charset: "UTF-8",
          Data: parsed.subject
        }
      }, 
      Source: process.env.FROM_ADDRESS,
      ReplyToAddresses: [
        parsed.from.value[0].address
      ]
    };

    await sendEmail(forwardingParams);

  } catch (err) {
    console.error(err);
    return err;
  }
  return;
};

async function sendEmail(params) {
  return new Promise ((resolve, reject) => {
    ses.sendEmail(params, function(err, data) {
      if (err) {
        console.error(err.message);
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}