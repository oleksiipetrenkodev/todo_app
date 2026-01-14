import { GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Upload } from '@aws-sdk/lib-storage';
import Busboy from 'busboy';
import { v4 as uuid } from 'uuid';
import { s3 } from '../s3.js';
import { safeFilename } from '../utils/safeFilename.js';
import { ALLOWED_MIME_TYPES, MAX_UPLOAD_SIZE } from '../utils/upload.constants.js';

const createStatusError = (status, err) => {
  const error = err || new Error('Upload failed');
  error.status = status;
  return error;
};

export const uploadSingleAttachment = ({ req, taskId }) =>
  new Promise((resolve, reject) => {
    const busboy = Busboy({
      headers: req.headers,
      limits: { files: 1, fileSize: MAX_UPLOAD_SIZE },
    });

    let fileSeen = false;
    let uploadPromise = null;
    let upload = null;
    let fileSize = 0;
    let fileMeta = null;
    let streamError = null;

    busboy.on('file', (fieldname, file, info) => {
      if (fileSeen) {
        file.resume();
        streamError = streamError || { status: 400 };
        return;
      }

      fileSeen = true;
      const contentType = info?.mimeType;
      const originalName = info?.filename || 'file';

      if (!ALLOWED_MIME_TYPES.includes(contentType)) {
        file.resume();
        streamError = streamError || { status: 400 };
        return;
      }

      const key = `tasks/${taskId}/${uuid()}-${safeFilename(originalName)}`;
      fileMeta = { key, name: originalName, contentType };

      upload = new Upload({
        client: s3,
        params: {
          Bucket: process.env.AWS_S3_BUCKET,
          Key: key,
          Body: file,
          ContentType: contentType,
        },
      });

      uploadPromise = upload.done().catch((err) => {
        if (err?.name === 'AbortError' || String(err?.message).includes('aborted')) return;
        throw err;
      });

      file.on('data', (chunk) => {
        fileSize += chunk.length;
      });

      file.on('limit', () => {
        streamError = streamError || { status: 413 };
        if (upload) upload.abort();
      });
    });

    busboy.on('error', (err) => {
      streamError = streamError || { status: 400, err };
    });

    busboy.on('filesLimit', () => {
      streamError = streamError || { status: 400 };
    });

    busboy.on('finish', async () => {
      try {
        if (!fileSeen) return reject(createStatusError(400));
        if (streamError?.status) {
          if (uploadPromise) await uploadPromise;
          return reject(createStatusError(streamError.status, streamError.err));
        }
        if (!uploadPromise || !fileMeta) return reject(createStatusError(400));

        await uploadPromise;

        return resolve({
          key: fileMeta.key,
          name: fileMeta.name,
          size: fileSize,
          contentType: fileMeta.contentType,
        });
      } catch (err) {
        return reject(err);
      }
    });

    req.pipe(busboy);
  });

export const presignGet = async (key) => {
  const command = new GetObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: key,
  });

  return getSignedUrl(s3, command, { expiresIn: 300 });
};

export const deleteS3Object = async (key) => {
  return s3.send(
    new DeleteObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
    }),
  );
};

export const deleteS3Objects = async (keys) => {
  return Promise.allSettled(
    keys.map((key) =>
      s3.send(
        new DeleteObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET,
          Key: key,
        }),
      ),
    ),
  );
};
