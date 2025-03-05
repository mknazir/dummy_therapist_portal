// const aws=require('aws-sdk')
// require('dotenv').config({ path: '../.env' })
// const crypto=require('crypto')
// const { promisify } = require('util')
// const {S3Client,PutObjectCommand}=require('@aws-sdk/client-s3')
// const {getSignedUrl}=require('@aws-sdk/s3-request-presigner')
// const { headers } = require('../constant/header')

// const randomBytes = promisify(crypto.randomBytes);

// const region = process.env.AWSREGION;
// const bucketName = process.env.AWSBUCKETNAME;
// const accessKeyId = process.env.AWSACCESSKEYID;
// const secretAccessKey = process.env.AWSSECRETACCESSKEY;

// const s3Client = new S3Client({
//     region,
//     credentials: {
//       accessKeyId,
//       secretAccessKey
//     }
//   });

// const generateSignedUrl = async ()=>{
//    const bytes = await randomBytes(16);
//    const imageName = bytes.toString('hex');
//    console.log("imagename>>",imageName);
//    const command=new PutObjectCommand({
//         Bucket: 'corportal',
//         Key: `upload/profilePic/${imageName}`,
//         ContentType: headers['Content-Type']
//    })
//    const url=await getSignedUrl(s3Client,command);
//    console.log("yrl??",url,imageName);
//    return {
//     url,
//     imageName
//    }
// }

// module.exports = { generateSignedUrl };




require('dotenv').config({ path: '../.env' });
const crypto = require('crypto');
const { promisify } = require('util');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { headers } = require('../constant/header');

const randomBytes = promisify(crypto.randomBytes);

const region = process.env.AWSREGION;
const bucketName = process.env.AWSBUCKETNAME;  // Use env variable for bucket
const accessKeyId = process.env.AWSACCESSKEYID;
const secretAccessKey = process.env.AWSSECRETACCESSKEY;

const s3Client = new S3Client({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey
    }
  });

const generateSignedUrl = async (contentType) => {
   const bytes = await randomBytes(16);
   const imageName = bytes.toString('hex');
   console.log("Generated image name:", imageName);

   const command = new PutObjectCommand({
        Bucket: bucketName,  // Use env variable here
        Key: `upload/profilePic/${imageName}`,
        ContentType: contentType || 'image/jpeg', // Default to 'image/jpeg' if not provided
   });

   // Generate signed URL, optionally set expiration (in seconds), e.g., 300 = 5 minutes
   const url = await getSignedUrl(s3Client, command, { expiresIn: 300 });
   
   console.log("Signed URL:", url);
   return {
    url,
    imageName
   };
}

module.exports = { generateSignedUrl };
