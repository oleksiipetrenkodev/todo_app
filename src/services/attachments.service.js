import { GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Upload } from '@aws-sdk/lib-storage';
import Busboy from 'busboy';
import sharp from 'sharp';
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
      limits: {
        files: 1,
        fileSize: MAX_UPLOAD_SIZE,
      },
    });

    // Відстежуємо, чи вже був оброблений файл
    let fileSeen = false;
    let fileMeta = null;
    let streamError = null;
    let chunks = [];
    let originalName = null;
    let inputContentType = null;

    busboy.on('file', (_fieldname, file, info) => {
      if (fileSeen) {
        file.resume(); // дочитується стрім, завершення запиту
        streamError = streamError || { status: 400 };
        return;
      }

      fileSeen = true;

      inputContentType = info?.mimeType;
      originalName = info?.filename || 'file';

      if (!ALLOWED_MIME_TYPES.includes(inputContentType)) {
        file.resume();
        streamError = streamError || { status: 400 };
        return;
      }

      file.on('data', (chunk) => {
        chunks.push(chunk);
      });

      file.on('limit', () => {
        // HTTP 413 Content Too Large
        streamError = streamError || { status: 413 };

        file.resume();
      });

      // Помилка файлового стріму → некоректний запит.
      file.on('error', (err) => {
        streamError = streamError || { status: 400, err };
      });
    });

    busboy.on('error', (err) => {
      streamError = streamError || { status: 400, err };
    });

    // Якщо прийшло більше файлів, ніж дозволено.
    busboy.on('filesLimit', () => {
      streamError = streamError || { status: 400 };
    });

    // Викликається, коли Busboy завершив парсинг тіла запиту.
    busboy.on('finish', async () => {
      try {
        if (!fileSeen) return reject(createStatusError(400));

        if (streamError?.status) {
          return reject(createStatusError(streamError.status, streamError.err));
        }

        if (!chunks.length || !originalName) return reject(createStatusError(400));

        const inputBuffer = Buffer.concat(chunks);
        console.log({ inputBuffer });

        // Трансформація:
        // 1) resize для зменшення розміру (обмеження ширини, збереження пропорцій)
        // 2) конвертація у webp
        // 3) toBuffer() повертає фінальні байти для збереження в S3
        const webpBuffer = await sharp(inputBuffer)
          .resize({
            width: 1280,
            withoutEnlargement: true,
          })
          .webp({
            quality: 80,
          })
          .toBuffer();

        console.log({ webpBuffer });

        const key = `tasks/${taskId}/${uuid()}-${safeFilename(originalName)}.webp`;

        // Дані для зьерігання в БД
        fileMeta = {
          key,
          name: originalName,
          contentType: 'image/webp',
        };

        const upload = new Upload({
          client: s3,
          params: {
            Bucket: process.env.AWS_S3_BUCKET,
            Key: key,
            Body: webpBuffer,
            ContentType: 'image/webp',
          },
        });

        await upload.done();

        return resolve({
          key: fileMeta.key,
          name: fileMeta.name,
          size: webpBuffer.length,
          contentType: fileMeta.contentType,
        });
      } catch (err) {
        return reject(err);
      } finally {
        chunks = [];
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

export const deleteAllS3Objects = async (keys) => {
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
