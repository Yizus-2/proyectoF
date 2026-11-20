import crypto from 'node:crypto'
import {
  S3Client,
  HeadBucketCommand,
  CreateBucketCommand,
  PutObjectCommand,
  GetObjectCommand
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

export const S3_BUCKET = process.env.S3_BUCKET || 'essmar-sigvi'
const S3_ENDPOINT = process.env.S3_ENDPOINT || 'http://127.0.0.1:9000'
const S3_REGION = process.env.S3_REGION || 'us-east-1'
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY || 'essmar_minio_admin'
const S3_SECRET_KEY = process.env.S3_SECRET_KEY || 'EssmarMinio2026!'
const S3_FORCE_PATH_STYLE = (process.env.S3_FORCE_PATH_STYLE ?? 'true') !== 'false'

export const s3Client = new S3Client({
  region: S3_REGION,
  endpoint: S3_ENDPOINT,
  forcePathStyle: S3_FORCE_PATH_STYLE,
  credentials: {
    accessKeyId: S3_ACCESS_KEY,
    secretAccessKey: S3_SECRET_KEY
  }
})

export function isValidImageBuffer(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 8) return false
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return true
  }
  // WEBP: RIFF....WEBP
  if (
    buf.length >= 12 &&
    buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buf.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return true
  }
  return false
}

export async function ensureBucketExists() {
  try {
    await s3Client.send(new HeadBucketCommand({ Bucket: S3_BUCKET }))
  } catch (err) {
    const status = err?.$metadata?.httpStatusCode
    if (status === 404 || err?.name === 'NotFound' || err?.name === 'NoSuchBucket') {
      await s3Client.send(new CreateBucketCommand({ Bucket: S3_BUCKET }))
      console.log(`Bucket S3/MinIO creado automáticamente: ${S3_BUCKET}`)
    } else {
      throw err
    }
  }
}

export async function checkS3Health() {
  await s3Client.send(new HeadBucketCommand({ Bucket: S3_BUCKET }))
  return true
}

export async function uploadBufferToS3({ key, body, contentType, metadata = {} }) {
  const buffer = Buffer.isBuffer(body) ? body : Buffer.from(body)
  const sha256 = crypto.createHash('sha256').update(buffer).digest('hex')

  await s3Client.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      Metadata: {
        ...metadata,
        sha256
      }
    })
  )

  return {
    bucket: S3_BUCKET,
    key,
    size: buffer.length,
    sha256
  }
}

export async function getObjectFromS3(key) {
  const response = await s3Client.send(
    new GetObjectCommand({
      Bucket: S3_BUCKET,
      Key: key
    })
  )
  return {
    body: response.Body,
    contentType: response.ContentType || 'application/octet-stream',
    contentLength: response.ContentLength
  }
}

export async function getObjectBufferFromS3(key) {
  try {
    const { body } = await getObjectFromS3(key)
    const chunks = []
    for await (const chunk of body) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    }
    return Buffer.concat(chunks)
  } catch {
    return null
  }
}

export async function getPresignedDownloadUrl(key, { expiresIn = 900, fileName = null } = {}) {
  const params = {
    Bucket: S3_BUCKET,
    Key: key
  }
  if (fileName) {
    params.ResponseContentDisposition = `attachment; filename="${fileName.replace(/"/g, '')}"`
  }
  return getSignedUrl(s3Client, new GetObjectCommand(params), { expiresIn })
}
