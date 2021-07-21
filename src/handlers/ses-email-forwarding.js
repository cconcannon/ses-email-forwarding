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
    const bodyObject = makeBodyObject(parsed);

    const forwardingParams = {
      Destination: {
        ToAddresses: [process.env.FORWARD_ADDRESS]
      }, 
      Message: {
        Body: bodyObject,
        Subject: {
          Charset: "UTF-8",
          Data: `to: ${parsed.to.text} sub: ${parsed.subject}`
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

function makeBodyObject(parsedEmail) {
  let body = {};

  if (parsedEmail.html) {
    bodyObject = {
      Html: {
        Charset: "UTF-8",
        Data: `${parsedEmail.html}`
      }
    };
  } else {
    bodyObject = {
      Text: {
        Charset: "UTF-8",
        Data: `${parsedEmail.text}`
      }
    };
  }

  return bodyObject;
}

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